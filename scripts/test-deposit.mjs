#!/usr/bin/env node
/**
 * test-deposit.mjs — fire a signed NOWPayments-style deposit webhook at the API
 * to confirm the full deposit-crediting path works (the exact code that runs
 * when a real crypto payment settles). No real money moves; this just simulates
 * the provider's IPN callback.
 *
 * It HMAC-SHA512 signs the payload with your NOWPAYMENTS_IPN_SECRET, matching
 * what the backend's /api/payments/nowpayments/webhook handler verifies.
 *
 * Usage:
 *   node scripts/test-deposit.mjs --device <id> --amount <usd> [options]
 *
 * Options:
 *   --device   <id>      Player device/user id whose wallet to credit (required)
 *   --amount   <usd>     Deposit amount in US dollars, e.g. 25 or 9.99 (default 25)
 *   --api      <url>     API base URL (default http://localhost:8080)
 *   --secret   <secret>  IPN secret; falls back to env NOWPAYMENTS_IPN_SECRET
 *   --payment  <id>      Payment id (default a random one; reuse to test idempotency)
 *
 * Examples:
 *   # Local smoke test
 *   NOWPAYMENTS_IPN_SECRET=testsecret node scripts/test-deposit.mjs --device alice --amount 25
 *
 *   # Against your deployed API
 *   node scripts/test-deposit.mjs --api https://your-api.up.railway.app \
 *     --device alice --amount 10 --secret "$NOWPAYMENTS_IPN_SECRET"
 *
 * Tip: run it twice with the same --payment id — the second call must NOT
 * double-credit (the backend dedupes on payment id).
 */
import { createHmac, randomBytes } from 'node:crypto';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) args[k.slice(2)] = argv[i + 1];
  }
  return args;
}

const a = parseArgs(process.argv);
const api = (a.api || 'http://localhost:8080').replace(/\/$/, '');
const device = a.device;
const amountUsd = a.amount ? Number(a.amount) : 25;
const secret = a.secret || process.env.NOWPAYMENTS_IPN_SECRET;
const paymentId = a.payment || 'test_' + randomBytes(5).toString('hex');

if (!device) {
  console.error('Error: --device <id> is required.\nRun with --help-style usage in the file header.');
  process.exit(1);
}
if (!secret) {
  console.error('Error: no IPN secret. Pass --secret or set NOWPAYMENTS_IPN_SECRET.');
  process.exit(1);
}
if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
  console.error('Error: --amount must be a positive number of US dollars.');
  process.exit(1);
}

const amountCents = Math.round(amountUsd * 100);
const orderId = `raphbet:${device}:${amountCents}`;

// Keys must be in alphabetical order so JSON.stringify produces the same bytes
// the Go backend signs (it re-marshals the map with sorted keys, compact form).
const payload = { order_id: orderId, payment_id: paymentId, payment_status: 'finished' };
const body = JSON.stringify(payload);
const sig = createHmac('sha512', secret).update(body).digest('hex');

const url = `${api}/api/payments/nowpayments/webhook`;
console.log(`→ Crediting $${amountUsd.toFixed(2)} to "${device}" (payment ${paymentId})`);
console.log(`  POST ${url}`);

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nowpayments-sig': sig },
    body,
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`✓ ${res.status} ${text.trim()}`);
    console.log(`  Check the wallet: GET ${api}/api/wallet  (header: X-Device-Id: ${device})`);
  } else {
    console.error(`✗ ${res.status} ${text.trim()}`);
    if (res.status === 401) console.error('  (401 = signature mismatch: the --secret must equal the API\'s NOWPAYMENTS_IPN_SECRET)');
    if (res.status === 503) console.error('  (503 = the API has no NOWPAYMENTS_IPN_SECRET set, so the webhook is disabled)');
    process.exit(1);
  }
} catch (err) {
  console.error(`✗ request failed: ${err.message}`);
  console.error(`  Is the API running and reachable at ${api}?`);
  process.exit(1);
}
