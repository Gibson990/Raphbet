// Package odds prices betting markets from a Poisson goals model and applies a
// configurable house margin (overround) — the core profit mechanism. The same
// model produces 1X2, Over/Under total goals, Both-Teams-To-Score and
// first-half Over/Under prices.
//
// PROFIT MODEL (5% margin):
//   - For every 100 TSH staked, the expected return to players is 95 TSH
//   - House keeps ~5 TSH = ~5% Gross Gaming Revenue (GGR)
//   - Example: true odds of 2.00 become 1.90 after 5% vig
//   - This is competitive with top bookmakers (Bet365, 1xBet use 5–7%)
package odds

import (
	"fmt"
	"hash/fnv"
	"math"
	"sync"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/markets"
)

// Engine prices markets for a match.
type Engine interface {
	OddsFor(m domain.Match) domain.Odds        // 1X2 convenience prices
	MarketsFor(m domain.Match) []domain.Market // full market board
}

// GeneratedEngine derives stable, plausible prices from each team's strength via
// a Poisson model, applying a house margin. Deterministic: the same match always
// yields the same prices, so odds never flicker between cache refreshes.
type GeneratedEngine struct {
	mu     sync.RWMutex
	margin float64 // e.g. 0.05 == 5% overround (industry-competitive)
}

// NewGeneratedEngine creates an engine with the given house margin.
func NewGeneratedEngine(margin float64) *GeneratedEngine {
	if margin < 0 {
		margin = 0
	}
	return &GeneratedEngine{margin: margin}
}

// Margin returns the current house margin.
func (e *GeneratedEngine) Margin() float64 {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.margin
}

// SetMargin updates the house margin (admin-configurable at runtime).
func (e *GeneratedEngine) SetMargin(margin float64) {
	if margin < 0 {
		margin = 0
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.margin = margin
}

const (
	// homeAdvantage: home teams score ~15% more goals historically (UEFA stats).
	homeAdvantage = 1.15
	// avgStrength: calibrated so an average team's λ ≈ 1.35 goals/match.
	avgStrength = 0.65
	// baseGoals: baseline expected goals for an average match.
	baseGoals = 1.35
	// maxGoals: grid ceiling for the Poisson probability table.
	maxGoals = 12
	// firstHalfFrac: ~45% of goals historically occur in the first half.
	firstHalfFrac = 0.44
)

// lambdas returns the Poisson λ (expected goals) for home and away teams.
// Uses a wider strength spread [0.25, 0.95] to produce more realistic,
// differentiated odds (e.g. 1.35 for a favourite vs 7.00 for a heavy underdog).
func (e *GeneratedEngine) lambdas(m domain.Match) (lh, la float64) {
	lh = clamp(baseGoals*strength(m.HomeTeam.ID)*homeAdvantage/avgStrength, 0.25, 4.0)
	la = clamp(baseGoals*strength(m.AwayTeam.ID)/avgStrength, 0.25, 4.0)
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

	// ── 1X2 Match Result ──────────────────────────────────────────────────────
	out := []domain.Market{{
		Key:   "1X2",
		Label: "Match Result",
		Outcomes: []domain.Outcome{
			{Code: "1", Label: m.HomeTeam.Name, Odds: e.price(pH)},
			{Code: "X", Label: "Draw", Odds: e.price(pD)},
			{Code: "2", Label: m.AwayTeam.Name, Odds: e.price(pA)},
		},
	}}

	// ── Over/Under total goals ────────────────────────────────────────────────
	ouTotal := domain.Market{Key: "OU", Label: "Total Goals"}
	for _, line := range markets.OULines {
		over := overProb(lh+la, line)
		ouTotal.Outcomes = append(ouTotal.Outcomes,
			domain.Outcome{Code: markets.OUCode(line, true), Label: markets.OULabel(line, true), Odds: e.price(over)},
			domain.Outcome{Code: markets.OUCode(line, false), Label: markets.OULabel(line, false), Odds: e.price(1 - over)},
		)
	}
	out = append(out, ouTotal)

	// ── Double Chance ─────────────────────────────────────────────────────────
	out = append(out, domain.Market{
		Key:   "DC",
		Label: "Double Chance",
		Outcomes: []domain.Outcome{
			{Code: "1X", Label: m.HomeTeam.Name + " or Draw", Odds: e.price(pH + pD)},
			{Code: "12", Label: m.HomeTeam.Name + " or " + m.AwayTeam.Name, Odds: e.price(pH + pA)},
			{Code: "X2", Label: "Draw or " + m.AwayTeam.Name, Odds: e.price(pD + pA)},
		},
	})

	// ── Both Teams To Score ───────────────────────────────────────────────────
	bttsYes := (1 - math.Exp(-lh)) * (1 - math.Exp(-la))
	out = append(out, domain.Market{
		Key:   "BTTS",
		Label: "Both Teams To Score",
		Outcomes: []domain.Outcome{
			{Code: markets.BTTSCode(true), Label: "Yes", Odds: e.price(bttsYes)},
			{Code: markets.BTTSCode(false), Label: "No", Odds: e.price(1 - bttsYes)},
		},
	})

	// ── Correct Score (top 6 most likely) ────────────────────────────────────
	type scoreLine struct {
		h, a int
		p    float64
	}
	var scores []scoreLine
	for h := 0; h <= 5; h++ {
		for a := 0; a <= 5; a++ {
			p := poissonPMF(h, lh) * poissonPMF(a, la)
			scores = append(scores, scoreLine{h, a, p})
		}
	}
	// sort descending by probability
	for i := 0; i < len(scores)-1; i++ {
		for j := i + 1; j < len(scores); j++ {
			if scores[j].p > scores[i].p {
				scores[i], scores[j] = scores[j], scores[i]
			}
		}
	}
	if len(scores) > 6 {
		scores = scores[:6]
	}
	csMarket := domain.Market{Key: "CS", Label: "Correct Score"}
	for _, s := range scores {
		label := fmt.Sprintf("%d-%d", s.h, s.a)
		csMarket.Outcomes = append(csMarket.Outcomes, domain.Outcome{
			Code:  fmt.Sprintf("CS_%d_%d", s.h, s.a),
			Label: label,
			Odds:  e.price(s.p),
		})
	}
	out = append(out, csMarket)

	// ── 1st Half Over/Under ───────────────────────────────────────────────────
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

	// ── Half-Time Result ──────────────────────────────────────────────────────
	fhLh := lh * firstHalfFrac
	fhLa := la * firstHalfFrac
	htH, htD, htA := result1x2(fhLh, fhLa)
	out = append(out, domain.Market{
		Key:   "HT_1X2",
		Label: "Half Time Result",
		Outcomes: []domain.Outcome{
			{Code: "HT1", Label: m.HomeTeam.Name, Odds: e.price(htH)},
			{Code: "HTX", Label: "Draw", Odds: e.price(htD)},
			{Code: "HT2", Label: m.AwayTeam.Name, Odds: e.price(htA)},
		},
	})

	return out
}

// price converts a true probability into margin-loaded decimal odds.
// Formula: decimal_odds = 1 / (p × (1 + margin))
// At 5% margin: true p=0.50 → odds = 1/(0.50 × 1.05) = 1.90 (not 2.00).
func (e *GeneratedEngine) price(p float64) float64 {
	if p <= 0 {
		p = 0.001
	}
	m := e.Margin()
	o := 1 / (p * (1 + m))
	// Round to 2 decimal places (standard bookmaker display)
	o = math.Round(o*100) / 100
	// Minimum odds = 1.01 (can't be lower than evens on a near-certainty)
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

// overProb returns P(total goals > line) for a Poisson with mean lambda.
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

// strength maps a team ID to a stable Elo-like rating in [0.25, 0.95].
// Uses FNV hash for determinism — the same team always gets the same strength.
// The wider spread [0.25, 0.95] produces more realistic differentiation
// between top teams (→ short prices like 1.35) and underdogs (→ 6.00+).
func strength(teamID string) float64 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(teamID))
	frac := float64(h.Sum32()%1000) / 1000.0
	// Map to [0.25, 0.95] — wider than before for more price spread
	return 0.25 + 0.70*frac
}
