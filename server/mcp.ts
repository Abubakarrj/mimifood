// A small Model Context Protocol server (https://modelcontextprotocol.io): the Mimi Food store as a
// connector that AI assistants (Claude, ChatGPT apps and others) can add. Streamable HTTP, without
// streaming: each POST to /mcp is a JSON-RPC message (or a batch) answered with JSON; a
// notification gets 202 and no body. Tools only, no sessions, nothing sensitive: the tools read
// the public catalog and hand back a checkout link; paying happens on our site.

const LATEST = "2025-06-18";
const KNOWN = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Tool = { name: string; title?: string; description: string; inputSchema: any; annotations?: any; run: (args: any) => any };

export function createMcp({ name, title, version, instructions, tools }: { name: string; title?: string; version: string; instructions?: string; tools: Tool[] }) {
  const byName = new Map(tools.map((t) => [t.name, t]));
  const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
  const fail = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  async function one(msg) {
    if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(msg?.id, -32600, "Invalid request");
    const isNote = msg.id === undefined || msg.id === null;
    const { id, method, params = {} } = msg;
    if (isNote) return null; // notifications/initialized and the like: nothing to answer
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: KNOWN.includes(params.protocolVersion) ? params.protocolVersion : LATEST,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name, title: title || name, version },
          ...(instructions && { instructions }),
        });
      case "ping":
        return ok(id, {});
      case "tools/list":
        return ok(id, { tools: tools.map(({ run, ...t }) => t) });
      case "tools/call": {
        const tool = byName.get(params.name);
        if (!tool) return fail(id, -32602, `Unknown tool: ${params.name}`);
        try {
          const out = await tool.run(params.arguments || {});
          const structured = out && typeof out === "object" && !Array.isArray(out) ? out : { result: out };
          return ok(id, { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured });
        } catch (error) {
          // A tool's own error goes back as its result, for the model to read and explain.
          return ok(id, { content: [{ type: "text", text: error.message || "That didn't work." }], isError: true });
        }
      }
      default:
        return fail(id, -32601, `Method not found: ${method}`);
    }
  }

  // The body of a POST: one message or a batch. Returns { status, body } (body null for 202).
  async function handle(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return { status: 400, body: fail(null, -32700, "Parse error") };
    }
    if (Array.isArray(msg)) {
      const out = (await Promise.all(msg.map(one))).filter(Boolean);
      return out.length ? { status: 200, body: out } : { status: 202, body: null };
    }
    const out = await one(msg);
    return out ? { status: 200, body: out } : { status: 202, body: null };
  }

  return { handle };
}
