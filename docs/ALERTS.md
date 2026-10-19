# Aurora alerts: the rule

**Promise:** a heads-up the day before your best chance to see the aurora at your saved place.
One rule decides every alert, on every channel (browser push, e-mail, the iOS/Android app).
It lives in [`packages/shared/src/alerts.ts`](../packages/shared/src/alerts.ts) and is unit-tested
on synthetic data and on a real NOAA + MET capture (`packages/shared/src/__fixtures__/`).

## In one paragraph

Every 20 minutes a Container Apps Job splits the forecast for each subscriber's place into
**nights** (named after the local date of the evening, Europe/Oslo; 12:00 → 11:59). Each dark hour
(sun below −6°) is *visible* when the NOAA SWPC 3-hour Kp forecast is at least the Kp needed at that
latitude and MET Norway's cloud cover is at most 40 %. A night with ≥ 2 visible hours, one of them
with Kp at least one above the requirement, is a **high** chance; ≥ 2 visible hours (or 1 strong
hour) is **good**; anything less is low/none. Between **15:00 and 21:00 local time on day D**, if
night D+1 is *good* (or *high*, if the subscriber chose "only high"), the subscriber gets **one
day-before alert for that night** — never a second one for the same night. Subscribers who opt in
also get one **"happening now"** alert per night when the current hour is dark, clear and Kp is high
enough, never between 02:00 and 06:00.

## Details

| | Day-before (default on) | Happening now (opt-in) |
|---|---|---|
| When | 15:00–21:00 Europe/Oslo on the day before | Any hour outside 02:00–06:00 |
| Condition | Tomorrow night's chance ≥ *good* (or ≥ *high*) | Current hour dark, Kp ≥ requirement, cloud ≤ 40 % |
| Frequency | At most one per night per subscription | At most one per night per subscription |
| Push TTL | 12 h | 1 h |
| Dedupe key | `dayBefore:<night date>` | `now:<night date>` |

Kp requirement by latitude (`thresholds.ts`): ≥ 67°N Kp 1 · ≥ 64° Kp 2 · ≥ 62° Kp 3 · ≥ 60° Kp 4 ·
≥ 58° Kp 5 · further south Kp 6.

Data gaps are never treated as good news: an hour with no Kp block or no cloud sample within 3 h is
not visible, and a night with no Kp data is *none*. The window and quiet hours are configurable
(`DAY_BEFORE_START`, `DAY_BEFORE_END`, `QUIET_HOURS_START`, `QUIET_HOURS_END`).

The job fetches cloud cover once per ~11 km cell (0.1° grid) and Kp once per run, so cost grows with
the number of distinct places, not subscribers.

The same night grading powers `GET /api/alerts/nights?lat=&lon=` (the "next nights" strip on the
page), and the "tonight" verdict on the gauge uses the same night boundaries, so the page and the
alerts never disagree about what "tonight" means.

## Why this rule

- **The afternoon before** gives time to plan (drive out of town, arrange a babysitter), which is
  what people ask an aurora alert for. MET's cloud forecast 24–36 h ahead is usable, and NOAA's
  3-day Kp forecast covers it.
- **Two visible hours** filters out one-hour gaps in the clouds that rarely pay off.
- **One per night** keeps alerts rare enough that people keep them on.

## Channels

| Channel | Where | Sender | Off unless |
|---|---|---|---|
| Browser push | `apps/api/src/services/push.ts` | Web Push (VAPID) | `VAPID_*` set |
| E-mail | `apps/api/src/services/email/` | Azure Communication Services Email | `EMAIL_ENABLED=true` + ACS |
| App push | `apps/api/src/services/nativePush.ts` | FCM HTTP v1 (Android), APNs (iOS) | `FCM_SERVICE_ACCOUNT_JSON` / `APNS_*` |

The scheduler is `apps/api/src/scheduler/alerts.ts` (`runAlerts`), wired to the real stores and
senders in `scheduler/evaluate.ts` and run by `pnpm --filter @nordlys/api job`.

Subscriptions made before this rule (October 2026) keep the short-notice alert they signed up for
and also get the day-before alert.
