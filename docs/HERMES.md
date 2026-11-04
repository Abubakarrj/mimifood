# Hermes Agent behind the site assistant

The FAQ assistant on the site can be answered by [Hermes Agent](https://github.com/NousResearch/hermes-agent)
instead of calling Claude directly. The page, its look and its answer format don't change. With
`HERMES_URL` unset, or Hermes unreachable, the page asks `/api/ask` (Claude) exactly as before.

Pinned to Hermes commit `919a93732a28f5cfbe82378dee1aa666004c5913` (`HERMES_COMMIT` in `server/hermes.ts`).
Re-check the protocol below before moving it.

## How it fits

```
Assistant box (js/app.ts)
   | WebSocket  /assistant/ws?t=<form token>        same-site Origin required
   v
This server (server/hermes.ts)                      checks, limits, relays
   | WebSocket  <HERMES_URL>/api/ws?token=<HERMES_TOKEN>
   v
hermes serve  (own service, own profile)
```

One visitor socket = one Hermes socket = one Hermes session, closed when the visitor leaves
(`close_on_disconnect`). The shop brief (`SYSTEM_PROMPT`, same as `/api/ask`) is seeded as a hidden
system row, so answers keep the card and follow-up markup the page already understands.

### Hermes protocol used (read from the source, not assumed)

| Direction | Message |
|---|---|
| connect | `GET /api/ws?token=…` (`web_server_chat.py::_ws_auth_ok`, loopback / provisioned-token mode) |
| server → us | `event` `gateway.ready` |
| us → server | `session.create { profile, source, title, messages[], close_on_disconnect, hidden }` |
| us → server | `prompt.submit { session_id, text, surface }` |
| server → us | events `message.delta { text }`, `message.complete { text, status, error }`, `tool.*`, `approval.request`, `error` |
| us → server | `approval.respond { session_id, choice: "deny", all: true }`, `session.interrupt`, `session.close` |

Frames are JSON-RPC 2.0, one per text frame. Contracts:
`apps/shared/src/gateway-contract.generated.ts`, `gateway-contract.openrpc.json`.

## Run Hermes (not on the Node service)

Hermes is Python and keeps state (SQLite), so it runs as its own service. `render.yaml` already declares it as
`hermes-assistant`, a private Render service built from Hermes' own Dockerfile (starter plan with a 1 GB disk, so it
is a paid service). mimi-food gets `HERMES_URL` and `HERMES_TOKEN` from it automatically, so there is nothing to
copy by hand. The one value to set is its OpenRouter key:

1. Render → Blueprints → apply the change; it creates `hermes-assistant`.
2. Render → hermes-assistant → Environment → set `ANTHROPIC_API_KEY`.
3. Deploy it (auto-deploy is off on purpose, so Hermes never updates itself).

Its start command writes the config on every start: Claude (through OpenRouter) as the model and web lookups as the only tool
(see the next section). To run it elsewhere instead, start `hermes serve --host 0.0.0.0 --port 9119` with a
long random `HERMES_DASHBOARD_SESSION_TOKEN`, keep the port off the public internet, and set `HERMES_URL` and
`HERMES_TOKEN` by hand.

## Lock it down (required before real visitors)

Hermes is a general agent: by default it can run terminal commands and read and write files.
The assistant only needs to answer shop questions, so give it its own profile with almost no tools.
See `docs/hermes-profile.example.yaml`:

```bash
hermes profile create mimi-assistant
# put the example's contents in that profile's config.yaml, and set a model and its API key there
```

Then `HERMES_PROFILE=mimi-assistant`. The adapter also denies every approval request and never
shows visitors tool names or arguments, but the profile is the real boundary. Nothing in this
integration gives Hermes access to orders, customers or the back office.

## Settings (Render → mimi-food → Environment)

| Name | What |
|---|---|
| `HERMES_URL` | `ws://host:9119` or `wss://…` of `hermes serve` |
| `HERMES_TOKEN` | the same value as Hermes' `HERMES_DASHBOARD_SESSION_TOKEN` |
| `HERMES_PROFILE` | profile name (optional) |
| `HERMES_MAX_VISITORS` | open assistant sockets at once (default 20) |

## Limits

Per visitor address: 3 open sockets, 12 questions per 10 minutes (shared with `/api/ask`), questions
of 600 characters, 90 seconds per answer, closed after 10 idle minutes. The site-wide cap is the
same as `/api/ask`.

## What was and wasn't tested

Tested against a stand-in server that speaks the protocol above: refused upgrades (bad token,
foreign or missing Origin), the session lifecycle, streaming, tool activity hidden from the visitor,
Hermes down. **Not tested against a real Hermes**: it isn't installed in the build environment.
Before going live, run the steps above, ask a question on the site, and read the Hermes log.
