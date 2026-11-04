// Video for booked calls on LiveKit. A booking gets a link to our own /call page; the page asks
// /api/call/<booking> for a short-lived token and joins the booking's room. The link works as the
// invitation (the booking id is long and random), and only inside the call's time window.
// Env: LIVEKIT_URL (wss://yourproject.livekit.cloud), LIVEKIT_API_KEY, LIVEKIT_API_SECRET.

import { createHmac } from "node:crypto";

const env = (name: string) => String(process.env[name] || "").trim();
export const livekitConfigured = () => Boolean(env("LIVEKIT_URL") && env("LIVEKIT_API_KEY") && env("LIVEKIT_API_SECRET"));
export const livekitUrl = () => env("LIVEKIT_URL").replace(/^http/, "ws");

const b64 = (v: object | Buffer) => Buffer.from(Buffer.isBuffer(v) ? v : JSON.stringify(v)).toString("base64url");

// An access token (a signed JWT) to join one room as one person.
export function livekitToken({ room, identity, name, host = false, ttlSeconds = 4 * 3600 }: { room: string; identity: string; name: string; host?: boolean; ttlSeconds?: number }) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ iss: env("LIVEKIT_API_KEY"), sub: identity, name, nbf: now - 10, exp: now + ttlSeconds, video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: host } });
  const sig = createHmac("sha256", env("LIVEKIT_API_SECRET")).update(`${head}.${body}`).digest();
  return `${head}.${body}.${b64(sig)}`;
}

// The room for a booking: its own id, so nobody else can land in it.
export const livekitRoom = (bookingId: string) => `call-${bookingId}`;

// Pacific wall-clock ("2026-11-05", "09:30") to a real moment.
export function pacificMoment(day: string, time: string): number {
  const guess = Date.parse(`${day}T${time}:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const shown = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  return guess - (shown - guess);
}
