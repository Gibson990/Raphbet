# scripts/

Operational helper scripts.

## test-deposit.mjs

Fires a signed NOWPayments-style deposit webhook at the API to verify the full
deposit-crediting path (the exact code that runs when a real crypto payment
settles). No real money moves — it just simulates the provider's IPN callback.

Requires Node 20+. The `--secret` (or `NOWPAYMENTS_IPN_SECRET` env) must equal
the API's `NOWPAYMENTS_IPN_SECRET`.

```bash
# Local smoke test (API on :8080)
NOWPAYMENTS_IPN_SECRET=testsecret node scripts/test-deposit.mjs --device alice --amount 25

# Against a deployed API
node scripts/test-deposit.mjs --api https://your-api.up.railway.app \
  --device alice --amount 10 --secret "$NOWPAYMENTS_IPN_SECRET"
```

Then check the wallet: `GET <api>/api/wallet` with header `X-Device-Id: alice`.

Re-run with the same `--payment <id>` to confirm idempotency — the second call
must not double-credit.
