# Cerdik CRM

A standalone CRM / contact-centre web app that links to a PBX over a
pluggable connector. Phase 1 ships the first connector (Cerdik's CD-series
PBX over MQTT), contact popping on inbound calls, click-to-dial, a call
log, and a missed-call list.

Single customer per install; every table still carries `company_id` for a
future multi-tenant move.

## Stack

- **Server:** Node + TypeScript (Express, `ws`), PostgreSQL (via `pg` +
  `node-pg-migrate`)
- **Web:** React + Vite
- **PBX link:** `PbxConnector` interface (`shared/src/pbx-connector.ts`) +
  `CdMqttConnector` (`server/src/connectors/cd-mqtt-connector.ts`) talking
  MQTT to the PBX — see [`docs/MQTT-API.md`](docs/MQTT-API.md). A second PBX
  brand only needs a second class implementing the same interface.
- **Auth:** `AuthProvider` interface (`shared/src/auth-provider.ts`) with a
  local bcrypt+JWT implementation — swappable later for shared/SSO login.

## Repo layout

```
shared/   types + PbxConnector/AuthProvider interfaces + phone normalization
server/   Express API, WebSocket hub, MQTT connector, Postgres migrations
web/      React agent screen
docs/     MQTT-API.md
```

## Running it locally

1. **Infra** (Postgres + a local Mosquitto broker for dev/testing):
   ```bash
   docker compose up -d
   ```

2. **Configure:**
   ```bash
   cp .env.example .env
   ```
   Fill in `JWT_SECRET` (generate one, see the comment in `.env.example`),
   and the real PBX's `MQTT_BROKER_URL` / `MQTT_USERNAME` / `MQTT_PASSWORD`
   / `MQTT_DEVICE_SERIAL` once you're pointing at an actual PBX. Against the
   local dev broker, `MQTT_BROKER_URL=mqtt://127.0.0.1:1883` with no
   username/password works, but you still need a real device serial to see
   any traffic — there's nothing to talk to without a PBX actually
   connected to that broker.

3. **Install + migrate + seed:**
   ```bash
   npm install
   npm run migrate
   npm run seed -w server
   ```
   The seed script creates one company and an admin user — email/password
   from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` (defaults:
   `admin@example.com` / `change-me-now` — change this before going live).
   Set `SEED_ADMIN_EXTENSION` if you want the admin's extension
   pre-filled.

4. **Run:**
   ```bash
   npm run dev:server   # API on :4100
   npm run dev:web      # Vite dev server on :5173
   ```
   Open http://localhost:5173, sign in, pick an extension, and you're on
   the agent screen.

## Tests

```bash
npm test
```

Covers phone normalization (`libphonenumber-js`, default region `MY` —
e.g. `03-87654321` → `+60387654321`) and parsing of the CD-series PBX's
MQTT event/CDR payloads, using real messages captured from a live unit
(see `docs/MQTT-API.md` and `server/src/__tests__/`).

## What's in phase 1

- `PbxConnector` interface + `CdMqttConnector` (dial, hangup, blind
  transfer, attended transfer, hold, mute, park, extension/queue listing —
  no `answer` command exists on this PBX; calls are answered on the phone).
- Phone normalization used everywhere a number is stored or matched.
- Schema: `companies`, `users`, `roles`, `contacts`, `contact_phones`,
  `calls`, `call_events`, `audit_log` (append-only).
- Agent screen: login → pick extension → incoming calls pop the matching
  contact (or a new-contact form for an unknown number), with a live call
  timer.
- Click-to-dial from the dialer box or any missed-call row.
- Call log built from the PBX's `cdr` event.
- Missed-call list: unanswered inbound calls grouped by number, with
  click-to-call.
- Audit log entries on contact edits and call-record views.

**Out of scope for now:** cases/tickets, SLA timers, AI, a queues board,
other PBX brands (though the connector interface is ready for one).
