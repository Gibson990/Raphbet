// Package odds prices betting markets from a Poisson goals model and applies a
// configurable house margin (overround) — the core profit mechanism. The same
// model produces 1X2, Over/Under total goals, Both-Teams-To-Score and
// first-half Over/Under prices. See docs/PROFIT.md.
package odds

import (
	"hash/fnv"
	"math"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/markets"
)

// Engine prices markets for a match.
type Engine interface {
	OddsFor(m domain.Match) domain.Odds         // 1X2 convenience prices
	MarketsFor(m domain.Match) []domain.Market  // full market board
}

// GeneratedEngine derives stable, plausible prices from each team's strength via
// a Poisson model, applying a house margin. Deterministic: the same match always
// yields the same prices, so odds never flicker between cache refreshes.
type GeneratedEngine struct {
	margin float64 // e.g. 0.07 == 7% overround
}

// NewGeneratedEngine creates an engine with the given house margin.
func NewGeneratedEngine(margin float64) *GeneratedEngine {
	if margin < 0 {
		margin = 0
	}
	return &GeneratedEngine{margin: margin}
}

const (
	homeAdvantage = 1.15
	avgStrength   = 0.60
	baseGoals     = 1.30
	maxGoals      = 10
	firstHalfFrac = 0.45 // ~45% of goals happen in the first half
)

// lambdas returns the expected goals for home and away.
func (e *GeneratedEngine) lambdas(m domain.Match) (lh, la float64) {
	lh = clamp(baseGoals*strength(m.HomeTeam.ID)*homeAdvantage/avgStrength, 0.2, 4.5)
	la = clamp(baseGoals*strength(m.AwayTeam.ID)/avgStrength, 0.2, 4.5)
	return
}

// OddsFor returns the three 1X2 prices.
func (e *GeneratedEngine) OddsFor(m domain.Match) domain.Odds {
	lh, la := e.lambdas(m)
	pH, pD, pA := result1x2(lh, la)
	return domain.Odds{HomeWin: e.price(pH), Draw: e.price(pD), AwayWin: e.price(pA)}
}

// MarketsFor builds the full market board for a match.
func (e *GeneratedEngine) MarketsFor(m domain.Match) []domain.Market {
	lh, la := e.lambdas(m)
	pH, pD, pA := result1x2(lh, la)

	out := []domain.Market{{
		Key:   "1X2",
		Label: "Match Result",
		Outcomes: []domain.Outcome{
			{Code: "1", Label: m.HomeTeam.Name, Odds: e.price(pH)},
			{Code: "X", Label: "Draw", Odds: e.price(pD)},
			{Code: "2", Label: m.AwayTeam.Name, Odds: e.price(pA)},
		},
	}}

	// Over/Under total goals.
	ouTotal := domain.Market{Key: "OU", Label: "Total Goals"}
	for _, line := range markets.OULines {
		over := overProb(lh+la, line)
		ouTotal.Outcomes = append(ouTotal.Outcomes,
			domain.Outcome{Code: markets.OUCode(line, true), Label: markets.OULabel(line, true), Odds: e.price(over)},
			domain.Outcome{Code: markets.OUCode(line, false), Label: markets.OULabel(line, false), Odds: e.price(1 - over)},
		)
	}
	out = append(out, ouTotal)

	// Both teams to score.
	bttsYes := (1 - math.Exp(-lh)) * (1 - math.Exp(-la))
	out = append(out, domain.Market{
		Key:   "BTTS",
		Label: "Both Teams To Score",
		Outcomes: []domain.Outcome{
			{Code: markets.BTTSCode(true), Label: "Yes", Odds: e.price(bttsYes)},
			{Code: markets.BTTSCode(false), Label: "No", Odds: e.price(1 - bttsYes)},
		},
	})

	// First-half Over/Under.
	fhLambda := firstHalfFrac * (lh + la)
	fhMarket := domain.Market{Key: "FH_OU", Label: "1st Half Goals"}
	for _, line := range markets.FHOULines {
		over := overProb(fhLambda, line)
		fhMarket.Outcomes = append(fhMarket.Outcomes,
			domain.Outcome{Code: markets.FHOUCode(line, true), Label: markets.FHOULabel(line, true), Odds: e.price(over)},
			domain.Outcome{Code: markets.FHOUCode(line, false), Label: markets.FHOULabel(line, false), Odds: e.price(1 - over)},
		)
	}
	out = append(out, fhMarket)

	return out
}

// price turns a true probability into margin-loaded decimal odds.
func (e *GeneratedEngine) price(p float64) float64 {
	if p <= 0 {
		p = 0.001
	}
	o := 1 / (p * (1 + e.margin))
	o = math.Round(o*100) / 100
	if o < 1.01 {
		o = 1.01
	}
	return o
}

// result1x2 computes home-win / draw / away-win probabilities over a score grid.
func result1x2(lh, la float64) (pH, pD, pA float64) {
	for i := 0; i <= maxGoals; i++ {
		pi := poissonPMF(i, lh)
		for j := 0; j <= maxGoals; j++ {
			p := pi * poissonPMF(j, la)
			switch {
			case i > j:
				pH += p
			case i == j:
				pD += p
			default:
				pA += p
			}
		}
	}
	return
}

// overProb is P(total goals > line) for a Poisson with mean lambda (.5 lines).
func overProb(lambda, line float64) float64 {
	under := 0.0
	for k := 0; k <= int(line); k++ {
		under += poissonPMF(k, lambda)
	}
	return 1 - under
}

func poissonPMF(k int, lambda float64) float64 {
	return math.Exp(-lambda) * math.Pow(lambda, float64(k)) / factorial(k)
}

func factorial(n int) float64 {
	f := 1.0
	for i := 2; i <= n; i++ {
		f *= float64(i)
	}
	return f
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// strength maps a team id to a stable rating in [0.30, 0.90].
func strength(teamID string) float64 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(teamID))
	frac := float64(h.Sum32()%1000) / 1000.0
	return 0.30 + 0.60*frac
}
