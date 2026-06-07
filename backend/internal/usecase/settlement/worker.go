// Package settlement settles pending bets against real, finished match results
// (replacing the old front-end Math.random simulation). It runs on a ticker.
package settlement

import (
	"context"
	"log"
	"math"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// Outcomes maps a match id to its 1X2 result: "1" (home), "X" (draw), "2" (away).
type Outcomes map[string]string

// ResultsProvider returns outcomes for matches that have finished.
type ResultsProvider interface {
	FinishedOutcomes(ctx context.Context) (Outcomes, error)
}

// Crediter credits winnings to a wallet.
type Crediter interface {
	CreditPayout(deviceID string, amount domain.Money, desc string) error
}

// Worker periodically settles pending bets.
type Worker struct {
	bets     domain.BetRepository
	results  ResultsProvider
	crediter Crediter
	interval time.Duration
}

// New builds a settlement worker.
func New(bets domain.BetRepository, results ResultsProvider, crediter Crediter, interval time.Duration) *Worker {
	return &Worker{bets: bets, results: results, crediter: crediter, interval: interval}
}

// Run settles on a ticker until the context is cancelled.
func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if n := w.settleOnce(ctx); n > 0 {
				log.Printf("settlement: settled %d bet(s)", n)
			}
		}
	}
}

// settleOnce settles every pending bet whose match has finished. Returns the
// number of bets settled.
func (w *Worker) settleOnce(ctx context.Context) int {
	outcomes, err := w.results.FinishedOutcomes(ctx)
	if err != nil {
		log.Printf("settlement: results error: %v", err)
		return 0
	}
	if len(outcomes) == 0 {
		return 0
	}
	pending, err := w.bets.ListPending()
	if err != nil {
		log.Printf("settlement: list pending error: %v", err)
		return 0
	}

	settled := 0
	for _, b := range pending {
		outcome, done := outcomes[b.Selection.MatchID]
		if !done {
			continue // match not finished yet
		}
		if outcome == b.Selection.Market {
			b.Status = domain.BetWon
			b.Payout = domain.Money(math.Round(float64(b.Wager) * b.Selection.Odds))
			if err := w.crediter.CreditPayout(b.DeviceID, b.Payout, "Win: "+b.Selection.MarketLabel+" — "+b.Selection.MatchDescription); err != nil {
				log.Printf("settlement: credit error: %v", err)
				continue
			}
		} else {
			b.Status = domain.BetLost
			b.Payout = 0
		}
		if err := w.bets.Update(b); err != nil {
			log.Printf("settlement: update error: %v", err)
			continue
		}
		settled++
	}
	return settled
}
