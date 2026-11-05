# PBX MQTT API — CD-series (reference)

Carried over from the Cerdik Console project's own capture notes
(`docs/MQTT-API.md` there), which reverse-engineered the event/CDR schema
live against PBX serial `TK11202505001962` and confirmed the command schema
against the supplier's official manual, **"The Smart PBX Manager MQTT API
interface CN-V1.0.2"**. The PBX's "API Manager" panel (LuCI `api_mqtt`
package) makes the PBX an **MQTT client that connects OUT to a broker you
host** — it is not a server you connect into. Point its Host/Port fields at
your own broker (`MQTT_BROKER_URL` in `.env`).

This CRM's connector implementation is
[`server/src/connectors/cd-mqtt-connector.ts`](../server/src/connectors/cd-mqtt-connector.ts).

## Topics

All topics are rooted at `device/<serial>/api/v1.0/` (`<serial>` =
`MQTT_DEVICE_SERIAL`, never hardcoded).

| Topic | Direction | Purpose |
|---|---|---|
| `.../status` | PBX → us | Retained heartbeat: `{"status": "online"}` |
| `.../event` | PBX → us | Call and extension state events (see below) |
| `.../cdr` | PBX → us | Call detail record, one per completed call |
| `.../command/<category>` | us → PBX | Send a command. `<category>` is a grouping, **not the action** — the action is the `cmd` field inside the JSON body. Call-control commands use category `call`; directory/system queries use `system`; queue queries use `queue`. |
| `.../response` | PBX → us | Reply to every command, correlated by the `request_id` you sent. `{"request_id":"...","status":"Success"\|"failed","message":"..."}` plus command-specific fields. |

## `event` payloads (real captured traffic)

**`extension_status`** — BLF state change for one extension:
```json
{"event":"extension_status","extension":"205","type":"SIP","ipaddr":"sip:205@192.168.100.239:5060","status":"Ringing"}
```
Observed `status` values: `Ringing`, `InUse`, `Idle`, `Unavailable`
(unregistered/unreachable), `InUse&Ringing` (call-waiting), `Hold`.

**`invite`** — fires when a call is initiated:
```json
{"event":"invite","from":"204","to":"205","callid":"1789028588.967"}
```

**`callstatus`** — a full snapshot of all currently-active calls
(replace-not-merge semantics: an empty `calllist` means no calls in progress):
```json
{"calllist":[{"caller":"204","source":"SIP/204","called":"205","destination":"SIP/205","duration":"00:00:00","state":"Ring","calltype":"Internal","callid":"1789028588.967","recording":"no"}],"event":"callstatus"}
```
`"state":"Ring"` during the ringing phase, `"state":"Up"` once
answered/connected. `state` stays `"Up"` for a held call too — this field
never exposes hold.

## `cdr` payload (real captured traffic)

```json
{"event":"cdr","callid":"1789028588.967","src":"204","srctech":"SIP/204","dst":"205","dsttech":"SIP/205","start":"2026-09-10 16:23:08","answer":"2026-09-10 16:23:13","end":"2026-09-10 16:23:17","billsec":"3","disposition":"ANSWERED","direction":"Internal","calltype":"Internal","dtmf":"","recordfile":""}
```

Note the recording filename field is **`recordfile`**, not `recording` —
that name is used instead on `callstatus`'s per-call rows, for an unrelated
boolean ("is this call currently being recorded").

## Sequence observed for one internal call (204 → 205, answered, 3s talk time)

1. `event/callstatus` — calllist has one entry, `state: Ring`
2. `event/invite` — from 204 to 205
3. `event/extension_status` — 205 → `Ringing`
4. `event/extension_status` — 204 → `InUse`
5. `event/extension_status` — 205 → `InUse` (answered)
6. `event/extension_status` — 205 → `Idle` (205 hung up)
7. `event/cdr` — full record, `disposition: ANSWERED`, `billsec: 3`
8. `event/callstatus` — `calllist: []`
9. `event/extension_status` — 204 → `Idle`

## Command reference (from the official manual)

| `cmd` | Category | Purpose | Key fields |
|---|---|---|---|
| `extension_list` | `system` | Full extension directory | → `extlist[]` (`number`, `fullname`, `status`, `type`, `ipaddr`). **Note:** the manual names this field `username`, but live units return the configured Display Name under `fullname` instead — read `fullname` first, fall back to `username`. |
| `dial` | `call` | Originate a call (click-to-call) | `caller`, `callee`, optional `autoanswer` → `callid` |
| `hangup` | `call` | End a call | `callid` **or** `channelid` |
| `atxfer` | `call` | Start an attended (consult) transfer | `channelid`, `tonumber` |
| `atxferoperate` | `call` | Finish an in-progress attended transfer | `channelid`, `operate`: `complete`\|`abort`\|`threeway`\|`swap` |
| `cancelatxfer` | `call` | Cancel an attended transfer | `channelid` |
| `blindtransfer` | `call` | Blind transfer | `channelid`, `tonumber` |
| `musiconhold` | `call` | Hold/resume | `channelid`, `state`: `yes`\|`no` |
| `mute` | `call` | Mute/unmute | `channelid`, `state`: `yes`\|`no`, optional `direction` |
| `callpark` | `call` | Park a call | `channelid`, optional `parkingslot` (701–750, auto-assigned if omitted) |
| `queue_list` | `queue` | List queues | → `queuelist[]` |
| `queue_status` | `queue` | One queue's live status | `queue` → members/callers |

**No `answer` command exists.** Answering a ringing call happens on the SIP
endpoint itself (the operator's desk phone), never through this API —
phase 1 never attempts to answer programmatically.

hold/transfer/hangup key off `channelid` (a specific SIP leg), not the
`callid` this CRM stores — resolving `channelid` on demand via
`extcallinfo` is left for a later phase, since phase 1 has no hold/transfer
UI yet.
