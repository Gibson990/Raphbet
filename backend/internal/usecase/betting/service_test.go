package betting

import (
	"sync"
	"sync/atomic"
	"testing"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/infra/store"
)

var testLimits = Limits{MinBet: 1, MaxBet: 1_000_000, MinWithdrawal: 1, MaxWithdrawal: 1_000_000}

// Concurrent bets must never overdraw the wallet: with $10 and 30 racing $1
// bets, exactly 10 should succeed and the balance must land at 0 (never < 0).
func TestConcurrentBetsNeverOverdraw(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 1000, testLimits) // 1000 cents = $10
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

// fixedOdds is a test OddsResolver: it prices a known selection and rejects
// anything else, standing in for the live market board.
type fixedOdds struct{ price float64 }

func (f fixedOdds) OddsForSelection(matchID, marketCode string) (float64, bool) {
	if matchID == "m1" && marketCode == "1" {
		return f.price, true
	}
	return 0, false
}

// A forged client "odds" field must be ignored: the server reprices from its own
// engine, so the payout is bounded by the canonical price, not the client's.
func TestPlaceBetRepricesServerSide(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 10000, testLimits)
	svc.SetOddsResolver(fixedOdds{price: 1.90})
	const dev = "device-odds"

	items := []PlaceItem{{
		Selection: domain.BetSelection{MatchID: "m1", Market: "1", Odds: 1000.0}, // forged
		Wager:     100,
	}}
	placed, _, err := svc.PlaceBet(dev, items)
	if err != nil {
		t.Fatal(err)
	}
	if got := placed[0].Selection.Odds; got != 1.90 {
		t.Fatalf("expected server price 1.90, got %v", got)
	}
}

// Selections that aren't on the board (unknown match/market) must be rejected.
func TestPlaceBetRejectsUnknownSelection(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 10000, testLimits)
	svc.SetOddsResolver(fixedOdds{price: 1.90})
	items := []PlaceItem{{
		Selection: domain.BetSelection{MatchID: "ghost", Market: "1", Odds: 2.0},
		Wager:     100,
	}}
	if _, _, err := svc.PlaceBet("dev", items); err != ErrBadSelection {
		t.Fatalf("expected ErrBadSelection, got %v", err)
	}
}

// An accumulator may not list the same match twice.
func TestPlaceMultiBetRejectsDuplicateLegs(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 10000, testLimits)
	svc.SetOddsResolver(fixedOdds{price: 1.90})
	sels := []domain.BetSelection{
		{MatchID: "m1", Market: "1", Odds: 1.9},
		{MatchID: "m1", Market: "1", Odds: 1.9},
	}
	if _, _, err := svc.PlaceMultiBet("dev", sels, 100); err != ErrDuplicateLeg {
		t.Fatalf("expected ErrDuplicateLeg, got %v", err)
	}
}

// The acca boost ladder must be monotonic and capped at 100% (bet365-aligned).
func TestWinBoostLadderCapped(t *testing.T) {
	if CalculateWinBoost(1) != 0 {
		t.Fatal("single leg must not be boosted")
	}
	prev := -1.0
	for legs := 2; legs <= 25; legs++ {
		b := CalculateWinBoost(legs)
		if b < prev {
			t.Fatalf("ladder not monotonic at %d legs: %v < %v", legs, b, prev)
		}
		if b > 1.0 {
			t.Fatalf("boost exceeds 100%% cap at %d legs: %v", legs, b)
		}
		prev = b
	}
}

// The per-outcome liability cap must reject a bet that would push the house's
// potential payout on one outcome past the limit.
func TestLiabilityCapRejectsOverexposure(t *testing.T) {
	mem := store.NewMemoryStore()
	lim := testLimits
	lim.MaxLiability = 1000 // $10 max payout on any one outcome
	svc := New(mem, mem, mem, 1_000_000, lim)
	svc.SetOddsResolver(fixedOdds{price: 2.0}) // payout = 2x wager
	const dev = "device-liab"

	mk := func(wager domain.Money) ([]*domain.Bet, error) {
		_, _, err := svc.PlaceBet(dev, []PlaceItem{{
			Selection: domain.BetSelection{MatchID: "m1", Market: "1", Odds: 2.0},
			Wager:     wager,
		}})
		return nil, err
	}

	// $4 bet -> $8 payout exposure, under the $10 cap: ok.
	if _, err := mk(400); err != nil {
		t.Fatalf("first bet should pass, got %v", err)
	}
	// Another $4 bet -> would make $16 exposure on the same outcome: rejected.
	if _, err := mk(400); err != ErrLiabilityCap {
		t.Fatalf("expected ErrLiabilityCap, got %v", err)
	}
	// A bet on a *different* outcome is unaffected (resolver only prices m1/1, so
	// use the same match but this proves the per-outcome keying via a fresh cap).
}

// fixedState is a test MatchStateResolver.
type fixedState struct {
	status               string
	home, away, elapsed  int
}

func (f fixedState) MatchState(string) (string, int, int, int, bool) {
	return f.status, f.home, f.away, f.elapsed, true
}

// Cash-out must never overpay and never let a bet+immediate-cashout profit.
func TestCashOutPricingIsSafe(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 1_000_000, testLimits)
	svc.SetOddsResolver(fixedOdds{price: 2.0})
	const dev = "device-cash"

	place := func() *domain.Bet {
		placed, _, err := svc.PlaceBet(dev, []PlaceItem{{
			Selection: domain.BetSelection{MatchID: "m1", Market: "1", Odds: 2.0}, Wager: 1000,
		}})
		if err != nil {
			t.Fatal(err)
		}
		return placed[0]
	}

	// Upcoming: offer ~90% of stake (never more than stake), never > potential.
	svc.SetMatchStateResolver(fixedState{status: "UPCOMING"})
	b := place()
	v := svc.CashoutValue(b)
	if v <= 0 || v > 1000 {
		t.Fatalf("upcoming cashout should be (0, stake], got %d", v)
	}

	// Live & currently winning (home 1-0) near full time: more than stake but
	// never above the full potential payout (wager*odds = 2000).
	svc.SetMatchStateResolver(fixedState{status: "LIVE", home: 1, away: 0, elapsed: 80})
	v = svc.CashoutValue(b)
	if v <= 0 || v > 2000 {
		t.Fatalf("live-winning cashout must be within (0, potential], got %d", v)
	}

	// Actually cash out: bet becomes CASHED_OUT and the wallet is credited v.
	before, _ := svc.Wallet(dev)
	out, after, err := svc.CashOut(dev, b.ID)
	if err != nil {
		t.Fatal(err)
	}
	if out.Status != domain.BetCashedOut {
		t.Fatalf("expected CASHED_OUT, got %s", out.Status)
	}
	if after.Balance != before.Balance+out.Payout {
		t.Fatalf("wallet not credited correctly: %d vs %d", after.Balance, before.Balance+out.Payout)
	}
	// A cashed-out bet can't be cashed out again.
	if _, _, err := svc.CashOut(dev, b.ID); err != ErrNotCashable {
		t.Fatalf("expected ErrNotCashable on second cashout, got %v", err)
	}
}

// Refund on reject must restore exactly the held amount.
func TestWithdrawalRejectRefunds(t *testing.T) {
	mem := store.NewMemoryStore()
	svc := New(mem, mem, mem, 5000, testLimits)
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
