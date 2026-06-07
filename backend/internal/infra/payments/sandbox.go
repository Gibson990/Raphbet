// Package payments holds Provider implementations. SandboxProvider is the
// zero-config default used for local/dev: it instantly "captures" the deposit so
// the full wallet flow works end to end.
//
// Real providers implement payments.Provider the same way:
//   - M-Pesa/Airtel (via ClickPesa/Pesapal/Selcom): Charge() triggers an STK
//     push and returns StatusPending + a reference; a webhook confirms capture.
//   - Card (Stripe): Charge() creates a Checkout Session and returns its URL;
//     the Stripe webhook confirms.
//   - Crypto (NOWPayments/BTCPay): Charge() creates an invoice and returns its
//     URL; the IPN/webhook confirms.
// Each needs merchant credentials and (for real-money betting) a gaming licence.
package payments

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	uc "github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
)

// SandboxProvider captures every deposit immediately. No external calls.
type SandboxProvider struct{}

// NewSandboxProvider returns a provider that instantly succeeds.
func NewSandboxProvider() *SandboxProvider { return &SandboxProvider{} }

func (p *SandboxProvider) Name() string { return "sandbox" }

func (p *SandboxProvider) Charge(_ context.Context, in uc.Intent) (uc.Intent, error) {
	in.ID = "pi_" + randHex(10)
	in.Status = uc.StatusSucceeded
	return in, nil
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
