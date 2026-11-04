// The site assistant's brain: Hermes Agent (github.com/NousResearch/hermes-agent) running headless
// as its own service (`hermes serve`). Visitors never talk to Hermes. They open /assistant/ws on
// this server, which checks them (same site, form token, limits) and relays their question to
// Hermes over its JSON-RPC WebSocket (`/api/ws`: session.create, prompt.submit, message.delta ...),
// then streams the answer back. With HERMES_URL unset, or Hermes down, the page falls back to the
// Claude-backed /api/ask, so the assistant keeps working either way.
//
// Protocol notes (checked against Hermes commit 919a937, see docs/HERMES.md):
//   frames: one JSON-RPC 2.0 message per WebSocket text frame.
//   events: { method: "event", params: { type, session_id, payload, seq } }.
//   auth:   `?token=<HERMES_DASHBOARD_SESSION_TOKEN>` on the upgrade (a provisioned token).

import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

export const HERMES_COMMIT = "919a93732a28f5cfbe82378dee1aa666004c5913";

const env = (name: string) => String(process.env[name] || "").trim();
// Render hands over a bare host:port for a private service; a full ws:// or wss:// URL also works.
const hermesUrl = () => {
  const url = env("HERMES_URL").replace(/\/+$/, "");
  return url && !/^wss?:\/\//.test(url) ? `ws://${url}` : url;
};
export const hermesConfigured = () => Boolean(hermesUrl() && env("HERMES_TOKEN"));

const LIMITS = {
  connectMs: 15_000,
  requestMs: 30_000,
  turnMs: 90_000, // a whole answer, then the turn is interrupted
  idleMs: 10 * 60_000, // a visitor's socket with no question
  questionChars: 600,
  historyChars: 2000,
  historyTurns: 10,
  frameBytes: 16_000,
  perIp: 3, // open sockets per visitor address
  askPerWindow: 12, // questions per address per 10 minutes (shared with /api/ask)
};

type Json = Record<string, any>;

// One connection to Hermes: JSON-RPC requests with answers, plus the event stream.
class HermesLink {
  private socket: WebSocket | null = null;
  private nextId = 0;
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  onEvent: (type: string, sessionId: string, payload: Json) => void = () => {};
  onClose: () => void = () => {};

  connect(): Promise<void> {
    const url = `${hermesUrl()}/api/ws?token=${encodeURIComponent(env("HERMES_TOKEN"))}`;
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, { handshakeTimeout: LIMITS.connectMs, maxPayload: 4_000_000 });
      this.socket = socket;
      let ready = false;
      const timer = setTimeout(() => fail(new Error("Hermes did not announce itself")), LIMITS.connectMs);
      const fail = (error: Error) => {
        clearTimeout(timer);
        if (!ready) reject(error);
        socket.terminate();
      };
      socket.on("error", (error) => fail(error));
      socket.on("message", (data) => {
        let frame: Json;
        try {
          frame = JSON.parse(String(data));
        } catch {
          return;
        }
        if (frame.method === "event" && frame.params) {
          const { type, session_id: sessionId, payload } = frame.params;
          if (type === "gateway.ready" && !ready) {
            ready = true;
            clearTimeout(timer);
            resolve();
            return;
          }
          this.onEvent(String(type), String(sessionId || ""), payload || {});
          return;
        }
        // A request from Hermes (an approval, a question): this site has nobody to ask.
        if (typeof frame.id === "string" && typeof frame.method === "string") {
          this.socket?.send(JSON.stringify({ jsonrpc: "2.0", id: frame.id, error: { code: -32601, message: "not supported here" } }));
          return;
        }
        const entry = this.pending.get(String(frame.id));
        if (!entry) return;
        this.pending.delete(String(frame.id));
        clearTimeout(entry.timer);
        if (frame.error) entry.reject(new Error(String(frame.error.message || "Hermes error")));
        else entry.resolve(frame.result);
      });
      socket.on("close", () => {
        clearTimeout(timer);
        if (!ready) reject(new Error("Hermes closed the connection"));
        for (const [id, entry] of this.pending) {
          clearTimeout(entry.timer);
          entry.reject(new Error("Hermes connection closed"));
          this.pending.delete(id);
        }
        this.onClose();
      });
    });
  }

  request(method: string, params: Json = {}, ms = LIMITS.requestMs): Promise<any> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Hermes is not connected"));
    const id = `s${++this.nextId}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Hermes timed out: ${method}`));
      }, ms);
      this.pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

export type AssistantDeps = {
  siteUrl: string;
  systemPrompt: () => string;
  clientIp: (req: IncomingMessage) => string;
  sameSite: (req: IncomingMessage) => boolean;
  checkToken: (token: string) => boolean; // the page's form token
  rateLimited: (ip: string, bucket: string, max: number) => boolean;
  logAsked: (question: string) => void;
  log: (...args: any[]) => void;
};

// Seed history the visitor's page already holds (after a reconnect), cleaned the way /api/ask does.
function seedHistory(input: any): { role: string; content: string }[] {
  const rows = (Array.isArray(input) ? input : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, LIMITS.historyChars) }))
    .filter((m) => m.content)
    .slice(-LIMITS.historyTurns);
  while (rows.length && rows[0].role !== "user") rows.shift();
  return rows;
}

export function createAssistantSocket(deps: AssistantDeps) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: LIMITS.frameBytes });
  const perIp = new Map<string, number>();

  // A visitor's socket: one Hermes link and one Hermes session, closed with it.
  wss.on("connection", (visitor: WebSocket, req: IncomingMessage, ip: string) => {
    let link: HermesLink | null = null;
    let sessionId = "";
    let turn: { id: string; text: string; timer: NodeJS.Timeout } | null = null;
    let idle = setTimeout(() => visitor.close(1000, "idle"), LIMITS.idleMs);
    const send = (message: Json) => visitor.readyState === WebSocket.OPEN && visitor.send(JSON.stringify(message));

    const endTurn = () => {
      if (turn) clearTimeout(turn.timer);
      turn = null;
    };
    // The visitor sees only words: never tool names, arguments or anything from inside Hermes.
    const fail = (id: string, error: unknown, started: boolean) => {
      if (!turn || turn.id !== id) return; // already answered or failed
      deps.log("[assistant]", error instanceof Error ? error.message : error);
      endTurn();
      send({ type: "error", id, started });
    };

    const open = async (history: any) => {
      link = new HermesLink();
      link.onEvent = (type, sid, payload) => {
        if (sid !== sessionId || !turn) return;
        if (type === "message.delta" && typeof payload.text === "string") {
          turn.text += payload.text;
          send({ type: "delta", id: turn.id, text: payload.text });
        } else if (type === "tool.start" || type === "tool.progress" || type === "tool.generating") {
          send({ type: "status", id: turn.id });
        } else if (type === "approval.request") {
          // Nothing here may run commands or touch files on a visitor's say-so.
          link?.request("approval.respond", { session_id: sessionId, choice: "deny", all: true }).catch(() => {});
        } else if (type === "message.complete") {
          const { id, text } = turn;
          const full = typeof payload.text === "string" && payload.text ? payload.text : text;
          if (payload.status === "error" || payload.error) return fail(id, payload.error || "turn failed", Boolean(text));
          endTurn();
          send({ type: "done", id, text: full });
        } else if (type === "error") {
          fail(turn.id, payload.message, Boolean(turn.text));
        }
      };
      link.onClose = () => {
        link = null;
        sessionId = "";
        if (turn) fail(turn.id, "Hermes connection closed", Boolean(turn.text));
      };
      await link.connect();
      const messages = [
        { role: "system", content: deps.systemPrompt(), display_kind: "hidden" },
        ...seedHistory(history).map((m) => ({ ...m, display_kind: "hidden" })),
      ];
      const created = await link.request("session.create", {
        profile: env("HERMES_PROFILE") || null,
        source: "website",
        title: "Website assistant",
        messages,
        close_on_disconnect: true,
        hidden: true,
      });
      sessionId = String(created?.session_id || "");
      if (!sessionId) throw new Error("Hermes gave no session");
    };

    visitor.on("message", async (data) => {
      clearTimeout(idle);
      idle = setTimeout(() => visitor.close(1000, "idle"), LIMITS.idleMs);
      let message: Json;
      try {
        message = JSON.parse(String(data));
      } catch {
        return;
      }
      if (message.type === "stop") {
        if (turn && link && sessionId) link.request("session.interrupt", { session_id: sessionId }).catch(() => {});
        return;
      }
      if (message.type !== "ask") return;
      const id = String(message.id || "").slice(0, 40);
      const text = String(message.text || "").trim().slice(0, LIMITS.questionChars);
      if (!text) return;
      if (turn) return send({ type: "error", id, started: false, busy: true });
      if (deps.rateLimited(ip, "ask", LIMITS.askPerWindow) || deps.rateLimited("all", "ask-site", 300)) {
        return send({ type: "error", id, started: false, limited: true });
      }
      turn = { id, text: "", timer: setTimeout(() => {
        if (link && sessionId) link.request("session.interrupt", { session_id: sessionId }).catch(() => {});
        fail(id, "turn timed out", Boolean(turn?.text));
      }, LIMITS.turnMs) };
      try {
        if (!link) await open(message.history);
        if (message.first) deps.logAsked(text);
        await link!.request("prompt.submit", { session_id: sessionId, text, surface: "website" });
      } catch (error) {
        fail(id, error, false);
        link?.close();
      }
    });

    visitor.on("close", () => {
      clearTimeout(idle);
      endTurn();
      const closing = link;
      link = null;
      if (closing && sessionId) closing.request("session.close", { session_id: sessionId }, 3000).catch(() => {}).finally(() => closing.close());
      else closing?.close();
      const left = (perIp.get(ip) || 1) - 1;
      if (left > 0) perIp.set(ip, left);
      else perIp.delete(ip);
    });
    visitor.on("error", () => visitor.terminate());
    send({ type: "ready" });
  });

  // GET /assistant/ws?t=<form token>: refused before the upgrade unless every check passes.
  return {
    available: hermesConfigured,
    upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
      const refuse = (status: string) => {
        socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
        socket.destroy();
      };
      if (!hermesConfigured()) return refuse("404 Not Found");
      if (!deps.sameSite(req) || !req.headers.origin) return refuse("403 Forbidden");
      const token = new URL(req.url || "/", deps.siteUrl).searchParams.get("t") || "";
      if (!deps.checkToken(token)) return refuse("403 Forbidden");
      const ip = deps.clientIp(req);
      if ((perIp.get(ip) || 0) >= LIMITS.perIp || wss.clients.size >= Number(env("HERMES_MAX_VISITORS") || 20)) return refuse("429 Too Many Requests");
      perIp.set(ip, (perIp.get(ip) || 0) + 1);
      wss.handleUpgrade(req, socket, head, (visitor) => wss.emit("connection", visitor, req, ip));
    },
  };
}
