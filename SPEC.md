# Birthday Reveal PWA — Specification

A private web app: a scratch-card-style countdown where tiles are scratched away throughout the day to gradually reveal a blurred image underneath. On the target date, a final button unblurs the image.

---

## 1. Concept

A Progressive Web App (PWA) for a wife's birthday gift. The app displays a 6×4 grid of black tiles overlaying a blurred image. Tiles become "scratchable" on a timed schedule; the user scratches each tile to reveal that portion of the (still blurred) image underneath. On the birthday, a "Reveal" button appears that unblurs the full image.

**Aesthetic direction:** Dark, romantic, elegant. Deep blacks, warm gold accents, refined serif typography. Tactile and intimate.

---

## 2. Core Parameters

| Parameter | Value |
|---|---|
| Grid | 6 columns × 4 rows = **24 tiles** |
| Start | **May 11, 2026, 9:00 PM PST** (all 6 Day-1 tiles available at launch) |
| Reveal | **May 15, 2026, 1:00 PM PST** |
| Timezone | `America/Los_Angeles` (PDT in May = UTC-7) |
| Tile drop schedule | Days 2–4: 8a, 10a, 12p, 2p, 4p, 6p PST (1 tile each) |
| Missed tiles | Accumulate — never expire |
| Total tiles | 6 (Day-1 launch) + 6 × 3 days = **24** |
| Auth | Single user PIN + single admin PIN (both in config) |
| Emails | Launch + 3 daily @ 8am PST + reveal-day @ 8am PST = **5 total** |
| Image | Stored in S3 (static asset) |

### Tile release schedule (exact)

```
Day 1 — Mon May 11 2026
  21:00 PST → all 6 Day-1 tiles available (launch moment)

Day 2 — Tue May 12 2026
  08:00 → tile 7
  10:00 → tile 8
  12:00 → tile 9
  14:00 → tile 10
  16:00 → tile 11
  18:00 → tile 12

Day 3 — Wed May 13 2026
  08:00 → tile 13 … 18:00 → tile 18

Day 4 — Thu May 14 2026
  08:00 → tile 19 … 18:00 → tile 24

Day 5 — Fri May 15 2026 (birthday)
  No new tiles (all 24 already unlocked)
  13:00 PST → Reveal button appears
```

---

## 3. User Experience

### 3.1 First visit
1. User lands on domain → sees PIN entry screen (elegant, centered, single input).
2. Enters correct user PIN → token stored in `localStorage`, signed JWT returned from backend.
3. Lands on main screen.

### 3.2 Main screen layout (top to bottom)
- **Countdown timer** — large, prominent. Days / hours / minutes / seconds until May 15, 1:00 PM PST.
- **Subtitle / status line** — italic, muted gold. Changes contextually:
    - N tiles ready to scratch: *"N tiles waiting for you"*
    - All unlocked, none scratched yet today: *"A new tile has arrived"*
    - All currently available tiles scratched: *"Come back soon…"*
    - Reveal day before 1pm: *"Something beautiful is almost here"*
    - Reveal button active: *"It's time."*
- **Scratch grid** — 6×4 canvas, blurred image underneath, black tiles on top. Newly-unlocked tiles fade/shimmer in with a smooth animation.
- **Reveal button** — hidden until May 15, 1:00 PM PST (or admin-forced). When active: centered, large, gold, pulsing.

### 3.3 Scratch mechanic
- Each tile is a Canvas (or one large canvas with per-tile hit regions).
- Finger/mouse drag erases the black overlay, revealing the blurred image below.
- Tile is marked "scratched" when ≥70% of its area is erased. At that point, the remaining overlay animates away and the tile snaps fully revealed.
- Scratched state persists (server-side): on refresh, tile is already open.
- **Unscratchable tiles** (not yet unlocked) do not respond to touch — subtle locked appearance (slightly darker, faint lock glyph or just plain).

### 3.4 Reveal flow
- At May 15 1:00 PM PST, the Reveal button appears with a fade-in.
- User presses it → blurred image smoothly un-blurs (CSS filter transition, ~2 seconds).
- Below revealed image, a personal message appears (the final card's text, set per-event in the admin panel).

### 3.5 Admin panel
Access: enter admin PIN (instead of user PIN) on login screen → admin screen loads.

Admin features:
- **Status readout:**
    - Scratched: `N / 24`
    - Currently unlocked (available to scratch): `N`
    - Revealed flag: `true / false`
    - Last scratch timestamp
    - Current sim time (real or overridden)
- **Force Reveal** — writes `revealed: true` to DynamoDB.
- **Reset All** — clears all scratched tiles, resets reveal flag.
- **Unlock All Tiles** — client-side override so all 24 are scratchable now (testing).
- **Lock All Tiles** — undoes Unlock All.
- **Simulate Date** — dropdown: "Launch (May 11 9pm)", "Day 2 noon", "Day 3 6pm", "Day 4 3pm", "Reveal day 12:59pm", "Reveal day 1:01pm". Client-side only (overrides `Date.now()`).
- **Back to user view** button.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User Browser (PWA installed to home screen)                │
│  - HTML/CSS/JS                                              │
│  - Service Worker (offline-first for shell)                 │
│  - localStorage: auth token, client sim-time override       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│  Route53 (justexciting.com, *.justexciting.com)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌───────────────────────┐
│  CloudFront      │      │  API Gateway (REST)   │
│  (cached PWA)    │      │  /auth /state /scratch│
└────────┬─────────┘      │  /reveal /reset       │
         │                └──────────┬────────────┘
         ▼                           │
┌──────────────────┐                 ▼
│  S3 (frontend)   │      ┌────────────────────┐
│  + S3 (image)    │      │  Lambda (Node.js)  │
└──────────────────┘      │  - authHandler     │
                          │  - stateHandler    │
                          │  - scratchHandler  │
                          │  - revealHandler   │
                          │  - resetHandler    │
                          │  - emailCronHandler│
                          └──────────┬─────────┘
                                     │
                          ┌──────────┴─────────┐
                          ▼                    ▼
                ┌──────────────────┐  ┌──────────────┐
                │  DynamoDB        │  │  SES         │
                │  table: state    │  │  (emails)    │
                └──────────────────┘  └──────────────┘
                                              ▲
                                              │
                                   ┌──────────┴──────────┐
                                   │  EventBridge        │
                                   │  5 cron rules       │
                                   └─────────────────────┘
```

---

## 5. File / Folder Structure

```
birthday-reveal/
├── README.md                      # Deploy + test guide
├── SPEC.md                        # This file
├── CLAUDE.md                      # Persistent instructions for Claude Code
├── .gitignore
│
├── frontend/
│   ├── index.html                 # Shell: PIN screen, main app, admin panel
│   ├── styles.css                 # All styling
│   ├── app.js                     # Main app logic
│   ├── scratch.js                 # Canvas scratch mechanic
│   ├── countdown.js               # Countdown timer logic
│   ├── admin.js                   # Admin panel logic
│   ├── api.js                     # Fetch wrapper for backend
│   ├── time.js                    # Timezone math, sim-time override
│   ├── manifest.webmanifest       # PWA manifest
│   ├── service-worker.js          # PWA offline shell
│   └── assets/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── reveal.jpg             # (placeholder — real image uploaded to S3)
│
├── backend/
│   ├── package.json
│   └── src/
│       ├── authHandler.js
│       ├── stateHandler.js
│       ├── scratchHandler.js
│       ├── revealHandler.js
│       ├── resetHandler.js
│       ├── emailCronHandler.js
│       ├── lib/
│       │   ├── db.js              # DynamoDB client + helpers
│       │   ├── auth.js            # PIN check, JWT sign/verify
│       │   ├── schedule.js        # Tile unlock schedule math
│       │   ├── ses.js             # Email helpers + templates
│       │   └── logger.js          # Structured JSON logger
│       └── templates/
│           ├── daily.html
│           ├── launch.html
│           └── reveal-day.html
│
└── infra/
    ├── main.tf                    # Provider config, locals
    ├── variables.tf
    ├── outputs.tf
    ├── terraform.tfvars.example   # Template (user copies to terraform.tfvars)
    ├── s3.tf                      # Frontend bucket + image bucket
    ├── cloudfront.tf              # Distribution, OAC
    ├── route53.tf                 # DNS (references existing hosted zone)
    ├── acm.tf                     # HTTPS cert (in us-east-1 for CloudFront)
    ├── dynamodb.tf                # Table
    ├── lambda.tf                  # 6 functions
    ├── apigateway.tf              # REST API + routes + authorizer
    ├── eventbridge.tf             # 5 cron rules
    └── iam.tf                     # Lambda execution roles, policies
```

---

## 6. Configuration

Configuration is split between three places — there is no `config.json`.

**`infra/terraform.tfvars`** (gitignored) — secrets and the few build-time inputs Terraform needs:

```hcl
admin_pin          = "REPLACE_ME_ADMIN_PIN"
jwt_secret         = "REPLACE_ME_RANDOM_32_CHAR_STRING"
telegram_bot_token = "REPLACE_ME_TELEGRAM_BOT_TOKEN"
# domain and aws_region have defaults in variables.tf — override here only if needed
```

Terraform writes these into **AWS Secrets Manager** (`birthday-reveal-secrets`) at apply time, along with a generated `telegramWebhookSecret`. Lambdas read the bundle at runtime via `SECRET_ARN` (see `backend/src/lib/secrets.js`).

**Lambda env vars** (set by `infra/lambda.tf`):
- `TABLE_NAME` — DynamoDB table name
- `SECRET_ARN` — Secrets Manager ARN
- `DOMAIN` — public domain (used for email links)
- `IMAGE_BUCKET` — S3 bucket for the reveal image

**Per-event data** (PIN, recipient name, card unlock times, card text/icons, start/reveal dates) lives in **DynamoDB** under each event row — managed via the admin panel, not config files. See §7.

The frontend never reads any config; it discovers everything it needs from `GET /api/state` after auth.

---

## 7. DynamoDB Schema

**Table:** `birthday-reveal-state`
**Partition key:** `id` (string, always `"main"` — single-row table)

**Item shape:**
```json
{
  "id": "main",
  "scratchedTiles": [0, 3, 7, 12],
  "revealed": false,
  "lastScratchAt": "2026-05-12T14:03:22-07:00",
  "createdAt": "2026-05-11T21:00:00-07:00",
  "updatedAt": "2026-05-12T14:03:22-07:00"
}
```

Tile indices: 0–23, numbered left-to-right, top-to-bottom (row 0: 0–5, row 1: 6–11, etc.).

**Billing mode:** On-demand (zero idle cost, free tier covers all reads/writes).

---

## 8. API Contract

Base URL: `https://justexciting.com/api` (CloudFront routes `/api/*` to API Gateway).

All endpoints require `Authorization: Bearer <token>` header **except** `POST /auth`.

### `POST /api/auth`
Request:
```json
{ "pin": "XXXX" }
```
Response (200):
```json
{ "token": "eyJhGc...", "role": "user" }
```
- If PIN matches user PIN → `role: "user"`.
- If PIN matches admin PIN → `role: "admin"`.
- If neither → 401.
- Token is a signed JWT (HS256, secret from config) with `{ role, iat }`, valid 30 days.

### `GET /api/state`
Response (200):
```json
{
  "scratchedTiles": [0, 3, 7],
  "revealed": false,
  "unlockedTileCount": 12,
  "serverTimeISO": "2026-05-12T14:30:00-07:00"
}
```
- `unlockedTileCount` is computed server-side from current time + schedule.

### `POST /api/scratch`
Request:
```json
{ "tileIndex": 7 }
```
- Server validates: is tile 7 currently unlocked (per schedule)? If no → 403.
- If yes, adds 7 to `scratchedTiles` (dedupe).
- Response (200): same shape as `GET /state`.

### `POST /api/reveal` (admin only)
- Requires admin JWT.
- Sets `revealed: true`.
- Response (200): `{ "revealed": true }`.

### `POST /api/reset` (admin only)
- Requires admin JWT.
- Resets `scratchedTiles: []`, `revealed: false`.
- Response (200): state shape.

### Client-side reveal check
- Frontend polls `GET /api/state` every 30 seconds.
- Shows Reveal button if `revealed: true` OR `serverTimeISO >= revealDateISO`.

---

## 9. Tile Unlock Schedule (Server Logic)

Function `getUnlockedTileCount(nowPST: Date): number` — use `date-fns-tz` with zone `America/Los_Angeles`:

```
start = 2026-05-11 21:00 PST
if now < start: return 0
if now < 2026-05-12 08:00 PST: return 6

for each day d in [12, 13, 14]:
  if d < today: count = 6 + (d - 11) * 6
  if d == today:
    base = 6 + (d - 12) * 6
    for each hour h in [8, 10, 12, 14, 16, 18]:
      if now >= d @ h:00 PST: base += 1
    return base

return 24   // after May 14 18:00 PST
```

Tests must cover each boundary.

---

## 10. Email Plan (SES)

Five total emails, sent via SES from `senderEmail` to `recipientEmail`.

| Trigger | Subject | When (PST) | UTC cron |
|---|---|---|---|
| Launch | "Something just arrived for you 🎁" | May 11, 21:00 | `cron(0 4 12 5 ? 2026)` |
| Daily | "New tiles are waiting for you today" | May 12, 08:00 | `cron(0 15 12 5 ? 2026)` |
| Daily | "New tiles are waiting for you today" | May 13, 08:00 | `cron(0 15 13 5 ? 2026)` |
| Daily | "New tiles are waiting for you today" | May 14, 08:00 | `cron(0 15 14 5 ? 2026)` |
| Reveal day | "Today's the day." | May 15, 08:00 | `cron(0 15 15 5 ? 2026)` |

PDT in May = UTC-7. 8am PDT = 15:00 UTC. 9pm PDT = 04:00 UTC next day.

Templates are HTML, styled with inline CSS (gold accents on black background), dark-theme tolerant. All five emails include a short opt-out footer: "Let me know if you'd like to stop receiving these."

**SES setup (already done manually):**
- Domain `justexciting.com` verified in us-east-2 ✅
- DKIM ✅
- Custom MAIL FROM `mail.justexciting.com` ✅
- DMARC `v=DMARC1; p=none; rua=mailto:...` ✅
- Production access: requested, awaiting approval

---

## 11. Security

- **HTTPS only**, enforced by CloudFront.
- **PINs stored server-side only** — admin PIN in AWS Secrets Manager; per-event user PINs in DynamoDB. Neither ships to the frontend.
- **JWT** for session — HS256, 30-day expiry.
- **API Gateway Lambda authorizer** verifies JWT on every protected endpoint.
- **CORS** locked to `https://justexciting.com` origin.
- **Admin PIN** separate from user PIN; same auth flow, role encoded in JWT.
- **No user input reflected in responses** (no XSS risk).
- **Rate limiting** via API Gateway throttling (e.g., 10 req/sec per IP).
- Admin-only endpoints check `role === "admin"` in JWT claims before executing.

---

## 12. PWA Config

`manifest.webmanifest`:
```json
{
  "name": "For You",
  "short_name": "For You",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#080808",
  "theme_color": "#c9a84c",
  "orientation": "portrait",
  "icons": [
    { "src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Service worker: cache-first for shell (HTML/CSS/JS), network-first for `/api/*`. Survive offline gracefully (show cached last state + "offline" indicator).

---

## 13. Testing Plan

### Local dev
- Frontend: `python3 -m http.server` in `frontend/` directory. Use a mock API flag (`USE_MOCK_API=true`) for offline dev.
- Backend: AWS SAM Local (`sam local start-api`) for Lambda + API Gateway emulation.
- DynamoDB: DynamoDB Local (docker) or point at real dev table.

### End-to-end test cases
1. Enter wrong PIN → error shown.
2. Enter user PIN → main screen, countdown correct.
3. Admin PIN → admin panel.
4. Admin "Unlock All" → all 24 tiles scratchable.
5. Scratch tile → persists on refresh.
6. Admin "Reset All" → fresh state.
7. Admin "Simulate Date → Reveal day 1:01pm" → Reveal button appears.
8. Press Reveal → image unblurs.
9. Refresh after reveal → still revealed.
10. No internet → cached shell loads, shows offline state.

### Email testing
- Trigger Lambda manually: `aws lambda invoke --function-name birthday-reveal-email-cron --payload '{"trigger":"launch"}' response.json`
- Verify arrives at recipient + appears in SES "Sent" log.

### Pre-launch checklist (run May 10, 2026)
- [ ] DNS resolves (`dig justexciting.com`)
- [ ] HTTPS cert valid
- [ ] PIN login works from her phone
- [ ] Add to home screen works on iOS Safari
- [ ] `getUnlockedTileCount(now)` returns 0 (before May 11 9pm)
- [ ] Admin panel accessible only via admin PIN
- [ ] Force Reveal tested on test device
- [ ] Reset All tested
- [ ] All 5 EventBridge rules scheduled
- [ ] SES production access granted
- [ ] Image uploaded to S3, blurred version renders correctly
- [ ] Countdown shows correct remaining time

---

## 14. Deployment Steps (README will expand these)

1. Clone repo / scaffold.
2. Create `infra/terraform.tfvars` and fill in `admin_pin`, `jwt_secret`, `telegram_bot_token`.
3. `cd infra && terraform init && terraform plan && terraform apply`.
4. Upload reveal image to S3 image bucket: `aws s3 cp reveal.jpg s3://birthday-reveal-images/reveal.jpg`.
5. Build + deploy Lambda (handled by Terraform `archive_file`).
6. Sync frontend: `aws s3 sync ./frontend s3://birthday-reveal-frontend/ --delete`.
7. Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id XXX --paths "/*"`.
8. Visit domain, test user PIN, test admin PIN.
9. Run all admin tests.
10. Wait until May 11 9pm. 🥂

---

## 15. Edge Cases & Notes

- **DST:** May is always PDT (UTC-7). Always use IANA zone `America/Los_Angeles` via `date-fns-tz`, never hardcode offsets.
- **Clock skew:** Client clock can be wrong. Always use server-returned `serverTimeISO` for gating logic (reveal button). Countdown display uses client clock for smoothness but verifies against server on poll.
- **Race on scratch:** Two tabs, two scratches → DynamoDB `UpdateItem` with `ADD` on a set-type attribute is idempotent. Safe.
- **Lambda cold start:** Accept ~300ms cold start, show a loading spinner. Not worth provisioned concurrency cost.
- **CloudFront cache on PWA:** Short TTLs (5 min) on HTML; immutable cache on JS/CSS using query-string cache-busting on deploys (e.g., `?v=123`).
- **Image blur:** Frontend applies CSS `filter: blur(24px)` to the underlying image element. The image IS downloaded to the device from S3 (via CloudFront signed URL or public). For a personal project this is acceptable — DOM inspection to view the raw image is effectively the only bypass and not a meaningful threat.
- **iOS Safari localStorage eviction:** Safari can clear localStorage if unused for ~7 days under storage pressure. Not an issue since she opens the app daily. Auth token expires in 30 days regardless.

---

## 16. What To Hand Claude Code First

After scaffolding, in the first Claude Code session:

> Read CLAUDE.md and SPEC.md. Generate the first Terraform batch ONLY: `infra/main.tf`, `infra/variables.tf`, `infra/outputs.tf`, `infra/terraform.tfvars.example`, and `infra/iam.tf`. Do NOT generate other .tf files yet. Stop after this batch for my review.

Then iterate section by section, committing after each approved batch.
