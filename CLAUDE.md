# Claude Code Instructions

## Project

Birthday reveal PWA — a scratch-card countdown gift for May 15, 2026.
See `SPEC.md` in this repo for the full specification.

---

## Working Rules

- **Always read `SPEC.md` at the start of any new task**, but don't re-read it repeatedly within a session.
- **Stop before `terraform apply`** — always show me `terraform plan` output and wait for explicit approval before running apply.
- **Stop before any `aws` CLI command that mutates state** (create, delete, put, update). Read-only commands (get, list, describe) are fine to run without asking.
- **Never commit secrets.** Do not commit `infra/terraform.tfvars`, `*.tfstate`, `*.tfstate.backup`, or `.aws/`.
- Keep commits small and descriptive. One concern per commit.
- Use conventional commit prefixes: `feat:`, `fix:`, `infra:`, `docs:`, `chore:`, `test:`.
- Prefer editing existing files over creating new ones unless the spec calls for a new file.

---

## Tech Stack

- **Frontend:** Vanilla HTML / CSS / JS PWA (no bundler, no React, no TypeScript)
- **Backend:** Node.js 22.x Lambda functions (ES modules)
- **Infra:** Terraform (local state)
- **AWS Region:** `us-east-2` (Ohio) — ALL resources go here
- **Domain:** `justexciting.com` (already registered via Route53)
- **Email:** Amazon SES (domain verified, custom MAIL FROM `mail.justexciting.com`, DMARC live)

---

## Already Done Manually — DO NOT Recreate in Terraform

These resources already exist in the AWS account. Terraform must reference them via `data` sources (not `resource` blocks):

- Route53 hosted zone for `justexciting.com` → reference via `data "aws_route53_zone"`
- SES domain identity for `justexciting.com` → reference via `data "aws_ses_domain_identity"` (or use the ARN string directly)
- SES DKIM, Custom MAIL FROM, DMARC records
- IAM user `terraform` with `AdministratorAccess` (bootstrap credentials — not managed by Terraform)

---

## Terraform Conventions

- One resource category per `.tf` file: `s3.tf`, `lambda.tf`, `apigateway.tf`, `dynamodb.tf`, `cloudfront.tf`, `route53.tf`, `eventbridge.tf`, `iam.tf`, `acm.tf`
- Prefix all resource names with `birthday-reveal-` (e.g., `birthday-reveal-frontend`, `birthday-reveal-state`)
- Tag every resource with:
  ```hcl
  tags = {
    Project     = "birthday-reveal"
    ManagedBy   = "terraform"
    Environment = "prod"
  }
  ```
  Define once via `default_tags` in the provider block.
- **Least-privilege IAM** — Lambda execution role gets access only to:
    - Its specific DynamoDB table (not `*`)
    - `ses:SendEmail` and `ses:SendRawEmail` on the verified `justexciting.com` identity only
    - CloudWatch Logs (write) on its own log group
- Use local state (no `backend` block needed — local is the default).
- Lambda code bundled via `data "archive_file"` pointing at `../backend/src`, not a separate zip-and-commit step.
- ACM certificate for CloudFront must be created in `us-east-1` (N. Virginia) — use an aliased provider block. CloudFront only accepts certs from us-east-1.

---

## Node.js Conventions

- Runtime: `nodejs22.x`
- ES modules: `"type": "module"` in `backend/package.json`; use `import` / `export`, never `require`
- **AWS SDK v3 only** — `@aws-sdk/client-dynamodb`, `@aws-sdk/client-ses`, etc. Do NOT use `aws-sdk` (v2, deprecated).
- Timezone handling: use `date-fns-tz` for PST/PDT math (not moment, not dayjs)
- JWT: use `jsonwebtoken`
- Testing: **use the built-in `node:test` runner** — do NOT install Jest, Mocha, or Vitest
- Async/await everywhere; no callbacks
- No `console.log` in committed code — use a tiny logger helper that writes structured JSON to stdout (CloudWatch parses this automatically)
- Error handling: always catch and surface errors with context; never swallow silently

---

## Frontend Conventions

- Vanilla JS, no frameworks
- Keep individual files under ~300 lines; split into modules (`scratch.js`, `countdown.js`, `api.js`, etc.) if needed
- Scratch state lives server-side in DynamoDB; `localStorage` is only for the auth token and optional client-side sim-time override for admin testing
- Service worker: cache-first for shell, network-first for `/api/*`
- CSS: use CSS variables for theming; keep a single `styles.css`

---

## Testing Expectations

- Unit tests required for `backend/src/lib/schedule.js` (tile unlock math) — this is the highest-risk code. Cover: before start, at start, each tile drop boundary, after final tile.
- Unit tests for `backend/src/lib/auth.js` (JWT sign/verify, PIN comparison).
- Manual E2E test steps are in `SPEC.md` section 13 — follow them before launch, don't automate.

---

## Common Commands

```bash
# Plan infrastructure (SAFE — always run this first)
cd infra && terraform plan

# Apply infrastructure (ASK ME FIRST)
cd infra && terraform apply

# Deploy frontend
aws s3 sync ./frontend s3://birthday-reveal-frontend/ --delete
aws cloudfront create-invalidation \
  --distribution-id $(cd infra && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# Run backend tests
cd backend && node --test

# Invoke email cron Lambda manually for testing
aws lambda invoke \
  --function-name birthday-reveal-email-cron \
  --payload '{"trigger":"daily"}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

---

## Secrets I'll Provide When Needed

These do NOT live in git. I'll paste them into `infra/terraform.tfvars` (which Terraform writes into AWS Secrets Manager at apply time):

- `admin_pin` — my PIN for admin panel
- `jwt_secret` — random 32+ char string
- `telegram_bot_token` — for the Telegram delivery bot

Per-event values (user PIN, recipient name, card unlock times, card text) are entered via the admin panel and stored in DynamoDB — not in any config file.

Reveal image is uploaded to the S3 image bucket manually after the bucket is created.

---

## Context Window Discipline

- Do not read huge files end-to-end unless necessary — use `grep` / search for targeted lookups.
- Do not re-read `SPEC.md` or `CLAUDE.md` multiple times per session. Reference once and keep going.
- When making edits, show only the relevant diff, not the full file.

---

## When In Doubt

- Prefer the simpler option.
- Ask me before introducing a new dependency, service, or file type not already in the spec.
- Explicitly call out any assumption you're making so I can correct it early.