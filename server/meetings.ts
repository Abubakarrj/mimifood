// Video links for booked calls: Google Meet (an event on the connected Google calendar, with the
// café invited) or Zoom (a meeting on the connected Zoom account). Someone on the team signs in
// once from Configure › Calls; the refresh token is kept and used for every call after.
//
// Google: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (an OAuth client, type Web application, with
//   SITE_URL/api/admin/calls/connected/google as an authorized redirect URI, and the Google
//   Calendar API turned on).
// Zoom: ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET (a General app, user-managed, with
//   SITE_URL/api/admin/calls/connected/zoom as its redirect URL and the meeting:write scope).
//
// Stored with server/storage.js as storage.open("meetings", MEETING_PARTS).

import { randomBytes } from "node:crypto";

export const MEETING_PARTS = {
  links: (l) => l.id, // one: { id: "link", provider, email, refreshToken, accessToken, expiresAt, at }
};

export class MeetingError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const env = (k) => String(process.env[k] || "").trim();
const PROVIDERS = {
  google: {
    name: "Google Meet",
    id: () => env("GOOGLE_CLIENT_ID"),
    secret: () => env("GOOGLE_CLIENT_SECRET"),
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
  },
  zoom: {
    name: "Zoom",
    id: () => env("ZOOM_CLIENT_ID"),
    secret: () => env("ZOOM_CLIENT_SECRET"),
    authorize: "https://zoom.us/oauth/authorize",
    token: "https://zoom.us/oauth/token",
    scope: "",
  },
};
export const PROVIDER_NAMES = { google: "Google Meet", zoom: "Zoom", livekit: "our video page" };

export function createMeetings({ store, siteUrl, zone = "America/Los_Angeles", fetchImpl = fetch }) {
  const db = store.data;
  const save = () => store.save();
  const link = () => db.links.find((l) => l.id === "link") || null;
  const redirectUri = (p) => `${siteUrl}/api/admin/calls/connected/${p}`;
  const ready = (p) => Boolean(PROVIDERS[p]?.id() && PROVIDERS[p]?.secret());
  const pending = new Map(); // sign-in state → { provider, at }

  // What Configure › Calls shows: which can be connected, and what is.
  const status = () => {
    const l = link();
    return { connected: l ? { provider: l.provider, name: PROVIDER_NAMES[l.provider], email: l.email || "" } : null, available: Object.keys(PROVIDERS).filter(ready) };
  };

  // The sign-in page to send someone to.
  function connectUrl(provider) {
    const P = PROVIDERS[provider];
    if (!P) throw new MeetingError("Pick Google Meet or Zoom.");
    if (!ready(provider)) throw new MeetingError(`${P.name} can't be connected yet.`, 503);
    for (const [k, v] of pending) if (Date.now() - v.at > 15 * 60e3) pending.delete(k);
    const state = randomBytes(16).toString("hex");
    pending.set(state, { provider, at: Date.now() });
    const q = new URLSearchParams({ client_id: P.id(), redirect_uri: redirectUri(provider), response_type: "code", state });
    if (provider === "google") {
      q.set("scope", P.scope);
      q.set("access_type", "offline");
      q.set("prompt", "consent");
      q.set("include_granted_scopes", "true");
    }
    return `${P.authorize}?${q}`;
  }

  async function tokenCall(provider, params) {
    const P = PROVIDERS[provider];
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    const body = new URLSearchParams(params);
    if (provider === "zoom") headers.Authorization = `Basic ${Buffer.from(`${P.id()}:${P.secret()}`).toString("base64")}`;
    else {
      body.set("client_id", P.id());
      body.set("client_secret", P.secret());
    }
    const res = await fetchImpl(P.token, { method: "POST", headers, body, signal: AbortSignal.timeout(15000) });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      console.error(`[meetings] ${provider} token:`, res.status, data.error || "", data.error_description || data.reason || "");
      throw new MeetingError(`${P.name} didn't connect. Try again.`, 502);
    }
    return data;
  }

  // Back from the sign-in page: swap the code for tokens and keep them.
  async function finish(provider, { code, state, error }) {
    const p = pending.get(String(state || ""));
    pending.delete(String(state || ""));
    if (!p || p.provider !== provider) throw new MeetingError("That sign-in expired. Try again.");
    if (error || !code) throw new MeetingError(`${PROVIDER_NAMES[provider]} wasn't connected.`);
    const t = await tokenCall(provider, { grant_type: "authorization_code", code: String(code), redirect_uri: redirectUri(provider) });
    if (!t.refresh_token) throw new MeetingError(`${PROVIDER_NAMES[provider]} didn't give us lasting access. Try again.`, 502);
    let email = "";
    try {
      if (provider === "google" && t.id_token) email = JSON.parse(Buffer.from(String(t.id_token).split(".")[1], "base64url").toString()).email || "";
      if (provider === "zoom") {
        const me: any = await (await fetchImpl("https://api.zoom.us/v2/users/me", { headers: { Authorization: `Bearer ${t.access_token}` }, signal: AbortSignal.timeout(15000) })).json();
        email = me?.email || "";
      }
    } catch {
      /* the account's email is only shown beside Connected */
    }
    db.links = [{ id: "link", provider, email, refreshToken: t.refresh_token, accessToken: t.access_token, expiresAt: Date.now() + (Number(t.expires_in) || 3600) * 1000, at: new Date().toISOString() }];
    await save();
    return status();
  }

  async function disconnect() {
    db.links = [];
    await save();
    return status();
  }

  // A live access token (refreshed when it's about to run out; Zoom hands back a new refresh token).
  async function access() {
    const l = link();
    if (!l) return null;
    if (l.accessToken && l.expiresAt - Date.now() > 60e3) return l;
    const t = await tokenCall(l.provider, { grant_type: "refresh_token", refresh_token: l.refreshToken });
    Object.assign(l, { accessToken: t.access_token, expiresAt: Date.now() + (Number(t.expires_in) || 3600) * 1000, ...(t.refresh_token && { refreshToken: t.refresh_token }) });
    await save();
    return l;
  }

  async function api(l, method, url, body?) {
    const res = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${l.accessToken}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
    if (res.status === 204) return {};
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[meetings] ${l.provider} ${method} ${url.split("?")[0]}:`, res.status, data?.error?.message || data?.message || "");
      throw new MeetingError("The meeting couldn't be set up.", 502);
    }
    return data;
  }

  // A meeting for a booked call: { provider, url, id } or null when nothing is connected.
  // day "2026-11-02", time "09:30", minutes, in the roastery's time zone.
  async function create({ title, details, day, time, minutes, guests = [] }) {
    const l = await access();
    if (!l) return null;
    const start = `${day}T${time}:00`;
    if (l.provider === "google") {
      const endMin = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes;
      const endDay = endMin >= 1440 ? new Date(Date.parse(`${day}T12:00:00Z`) + 864e5).toISOString().slice(0, 10) : day;
      const m = endMin % 1440;
      const end = `${endDay}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
      const ev = await api(l, "POST", "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
        summary: title,
        description: details,
        start: { dateTime: start, timeZone: zone },
        end: { dateTime: end, timeZone: zone },
        attendees: guests.filter(Boolean).map((email) => ({ email })),
        conferenceData: { createRequest: { requestId: randomBytes(12).toString("hex"), conferenceSolutionKey: { type: "hangoutsMeet" } } },
      });
      const url = ev.hangoutLink || ev.conferenceData?.entryPoints?.find((x) => x.entryPointType === "video")?.uri || "";
      return { provider: "google", id: ev.id, url };
    }
    const mt = await api(l, "POST", "https://api.zoom.us/v2/users/me/meetings", { topic: title, agenda: String(details || "").slice(0, 2000), type: 2, start_time: start, timezone: zone, duration: minutes, settings: { join_before_host: false, waiting_room: true } });
    return { provider: "zoom", id: String(mt.id), url: mt.join_url || "" };
  }

  // The call was cancelled: take the meeting away (Google tells the guests).
  async function cancel(meeting) {
    if (!meeting?.id) return;
    const l = await access();
    if (!l || l.provider !== meeting.provider) return;
    if (meeting.provider === "google") await api(l, "DELETE", `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(meeting.id)}?sendUpdates=all`);
    else await api(l, "DELETE", `https://api.zoom.us/v2/meetings/${encodeURIComponent(meeting.id)}`);
  }

  return { status, connectUrl, finish, disconnect, create, cancel };
}
