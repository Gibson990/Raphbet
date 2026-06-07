// Package settlement settles pending bets against real, finished match results
// (replacing the old front-end Math.random simulation). It runs on a ticker and
// grades every market via the shared markets evaluator.
package settlement

import (
	"context"
	"log"
	"math"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/markets"
)

// ResultsProvider returns results for matches that have finished, keyed by id.
type ResultsProvider interface {
	FinishedResults(ctx context.Context) (map[string]markets.Result, error)
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

// settleOnce settles every pending bet whose match has a gradeable result.
func (w *Worker) settleOnce(ctx context.Context) int {
	results, err := w.results.FinishedResults(ctx)
	if err != nil {
		log.Printf("settlement: results error: %v", err)
		return 0
	}
	if len(results) == 0 {
		return 0
	}
	pending, err := w.bets.ListPending()
	if err != nil {
		log.Printf("settlement: list pending error: %v", err)
		return 0
	}

	settled := 0
	for _, b := range pending {
		result, ok := results[b.Selection.MatchID]
		if !ok {
			continue // match not finished yet
		}
		won, done := markets.Evaluate(b.Selection.Market, result)
		if !done {
			continue // can't grade yet (e.g. needs half-time score) or unknown code
		}
		if won {
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
