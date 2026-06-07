# Didit KYC — setup guide (what to do, what to bring back)

Didit is our KYC/identity-verification provider. **Free: 500 verifications/month,
forever, no credit card.** It handles ID scan, liveness, and face-match; we just
start a session and receive the result via a signed webhook.

## 1. Create your account & API key
1. Go to **https://didit.me** (or **https://business.didit.me**) and sign up with
   a work email. You get an **API key** and a **sandbox** immediately — free.

## 2. Create a verification workflow
2. In the dashboard, create a **verification flow / workflow** (ID Verification +
   Liveness + Face Match is the standard KYC bundle).
3. Copy its **Workflow ID**.

## 3. Configure the webhook
4. Open **API & Webhooks** in the sidebar.
5. Set the **Webhook URL** to our endpoint:
   - Local testing: you'll need a public tunnel (e.g. `ngrok http 8080`) →
     `https://<your-ngrok>.ngrok.io/api/kyc/webhook`
   - Deployed: `https://<your-api-domain>/api/kyc/webhook`
6. Copy the **Webhook Secret Key** (used to verify the HMAC signature).

## 4. Bring me these three values
Paste them and I'll wire the real integration (they go in `backend/.env`, never
committed):

```
DIDIT_API_KEY=...          # from step 1
DIDIT_WORKFLOW_ID=...       # from step 2
DIDIT_WEBHOOK_SECRET=...    # from step 3
```

## How it will work (the flow I'll build)
1. User taps "Verify account" → backend calls Didit `POST /v3/session/` with
   `workflow_id`, `vendor_data` (the user's id), and our callback URL → Didit
   returns a hosted **verification URL**.
2. Frontend opens that URL; the user scans their ID + does a liveness check on
   Didit's hosted page.
3. Didit sends a **signed webhook** to `/api/kyc/webhook` with the result; we
   verify the HMAC signature with `DIDIT_WEBHOOK_SECRET` and mark the user
   verified — which lifts the server-side KYC gate on betting.

Until these keys are set, the **sandbox verifier auto-approves** so the flow
keeps working in development. Reference: <https://docs.didit.me/reference/quick-start>.
