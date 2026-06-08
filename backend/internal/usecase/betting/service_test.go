package betting

import (
	"sync"
	"sync/atomic"
	"testing"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/infra/store"
)

// Concurrent bets must never overdraw the wallet: with $10 and 30 racing $1
// bets, exactly 10 should succeed and the balance must land at 0 (never < 0).
func TestConcurrentBetsNeverOverdraw(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 1000) // 1000 cents = $10
	const dev = "device-1"
	if _, err := svc.Wallet(dev); err != nil {
		t.Fatal(err)
	}

	var successes int64
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			items := []PlaceItem{{
				Selection: domain.BetSelection{MatchID: "m1", Market: "1", Odds: 2.0, MarketLabel: "Home", MatchDescription: "A vs B"},
				Wager:     100, // $1
			}}
			if _, _, err := svc.PlaceBet(dev, items); err == nil {
				atomic.AddInt64(&successes, 1)
			}
		}()
	}
	wg.Wait()

	w, _ := svc.Wallet(dev)
	if w.Balance < 0 {
		t.Fatalf("wallet overdrawn: balance=%d", w.Balance)
	}
	if successes != 10 {
		t.Fatalf("expected exactly 10 successful bets, got %d", successes)
	}
	if w.Balance != 0 {
		t.Fatalf("expected balance 0 after 10x$1 bets, got %d", w.Balance)
	}
}

// Refund on reject must restore exactly the held amount.
func TestWithdrawalRejectRefunds(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 5000)
	const dev = "device-2"
	wd, err := svc.RequestWithdrawal(dev, 2000, "addr")
	if err != nil {
		t.Fatal(err)
	}
	if w, _ := svc.Wallet(dev); w.Balance != 3000 {
		t.Fatalf("expected 3000 after hold, got %d", w.Balance)
	}
	if _, err := svc.RejectWithdrawal(wd.ID, "test"); err != nil {
		t.Fatal(err)
	}
	if w, _ := svc.Wallet(dev); w.Balance != 5000 {
		t.Fatalf("expected refund to 5000, got %d", w.Balance)
	}
}
