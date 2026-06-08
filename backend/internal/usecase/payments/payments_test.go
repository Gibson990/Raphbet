package payments_test

import (
	"testing"

	"github.com/Gibson990/Raphbet/backend/internal/infra/store"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/betting"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/payments"
)

// A retried webhook (same payment id) must credit the wallet only once.
func TestConfirmDepositIsIdempotent(t *testing.T) {
	mem := store.NewMemoryStore()
	crediter := betting.New(mem, mem, mem, 0)
	svc := payments.New(nil, nil, crediter, mem)

	for i := 0; i < 3; i++ { // simulate webhook retries
		if err := svc.ConfirmDeposit("pay-123", "dev", 500, "crypto"); err != nil {
			t.Fatal(err)
		}
	}
	w, _ := crediter.Wallet("dev")
	if w.Balance != 500 {
		t.Fatalf("expected single credit of 500, got %d (double-credit)", w.Balance)
	}
}

// Order-id round-trips device + amount.
func TestOrderIDRoundTrip(t *testing.T) {
	code := payments.EncodeOrderID("device-abc", 4200)
	dev, amt, ok := payments.DecodeOrderID(code)
	if !ok || dev != "device-abc" || amt != 4200 {
		t.Fatalf("round-trip failed: %s -> %q, %d, %v", code, dev, amt, ok)
	}
}
