# NOWPayments (crypto top-ups) — setup guide

NOWPayments is our crypto payment gateway for wallet top-ups (BTC, USDT, etc.).
Non-custodial, fast to set up, supports gambling merchants.

## 1. Create your account & API key
1. Sign up at **https://nowpayments.io** (free).
2. **Settings → Payments / API keys** → create an **API Key**.

## 2. Set your payout wallet
3. **Settings → Store / Coins**: add the wallet/address where settled crypto
   should go (or keep it on your NOWPayments balance). This is where deposits
   ultimately land.

## 3. Configure IPN (webhook)
4. **Settings → IPN / Instant Payment Notifications**:
   - Set the **IPN callback URL** to our endpoint:
     - Local testing: a public tunnel, e.g. `https://<ngrok>.ngrok.io/api/payments/nowpayments/webhook`
     - Deployed: `https://<your-api-domain>/api/payments/nowpayments/webhook`
   - Copy the **IPN Secret Key** (used to verify the HMAC-SHA512 signature).

## 4. Bring me these two values
They go in `backend/.env` (git-ignored, never committed):

```
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
```

## How it will work (the flow I'll build)
1. User picks **Crypto** in the top-up modal → backend calls NOWPayments
   `POST /v1/invoice` with the amount, an `order_id` (the user's id), and our IPN
   callback URL → returns a hosted **invoice URL**.
2. Frontend opens the invoice; the user pays in their chosen coin.
3. NOWPayments sends a **signed IPN** (`x-nowpayments-sig`, HMAC-SHA512) to our
   webhook when `payment_status` is `finished`/`confirmed`; we verify the
   signature and **credit the wallet**.

Until the keys are set, the **sandbox provider** captures top-ups instantly so
the wallet flow keeps working in development. Reference:
<https://documenter.getpostman.com/view/7907941/S1a32n38> (NOWPayments API).
