// Package odds turns match probabilities into 1X2 betting prices with a
// configurable house margin (overround). The margin is the bookmaker's
// mathematical edge and therefore the core profit mechanism of the product:
// across many bets the book keeps roughly `margin` of all stakes regardless of
// results. See docs/PROFIT.md for the business explanation.
package odds

import (
	"hash/fnv"
	"math"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// Engine generates odds for a match.
type Engine interface {
	OddsFor(m domain.Match) domain.Odds
}

// GeneratedEngine derives stable, plausible 1X2 odds from each team's strength
// and applies a house margin. It is deterministic (same match => same odds) so
// prices never flicker between cache refreshes.
//
// It is intentionally provider-agnostic: a future ApiOddsEngine can pull real
// bookmaker prices and still flow through the same interface. Either way the
// margin can be re-applied on top to guarantee a minimum edge.
type GeneratedEngine struct {
	margin float64 // e.g. 0.07 == 7% overround
}

// NewGeneratedEngine creates an engine with the given house margin (overround).
func NewGeneratedEngine(margin float64) *GeneratedEngine {
	if margin < 0 {
		margin = 0
	}
	return &GeneratedEngine{margin: margin}
}

// OddsFor returns the three 1X2 prices for a match.
func (e *GeneratedEngine) OddsFor(m domain.Match) domain.Odds {
	homeStrength := strength(m.HomeTeam.ID)
	awayStrength := strength(m.AwayTeam.ID)

	// Home advantage: a modest multiplicative boost to the home side.
	const homeAdvantage = 1.15
	h := homeStrength * homeAdvantage

	// Convert relative strengths into "true" win probabilities, reserving a
	// share for the draw that shrinks as the teams are more mismatched.
	total := h + awayStrength
	pHomeRaw := h / total
	pAwayRaw := awayStrength / total

	drawShare := 0.28 - 0.20*math.Abs(pHomeRaw-pAwayRaw) // 0.08..0.28
	pHome := pHomeRaw * (1 - drawShare)
	pAway := pAwayRaw * (1 - drawShare)
	pDraw := drawShare

	// Apply the house margin: inflate every implied probability so the prices
	// sum to (1 + margin) in probability terms — that surplus is the edge.
	f := 1 + e.margin
	return domain.Odds{
		HomeWin: price(pHome * f),
		Draw:    price(pDraw * f),
		AwayWin: price(pAway * f),
	}
}

// strength maps a team id to a stable rating in [0.30, 0.90].
func strength(teamID string) float64 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(teamID))
	frac := float64(h.Sum32()%1000) / 1000.0 // 0.000..0.999
	return 0.30 + 0.60*frac
}

// price converts an (already margin-inflated) implied probability into decimal
// odds, rounded to two decimals and floored at 1.01.
func price(impliedProb float64) float64 {
	if impliedProb <= 0 {
		return 1.01
	}
	o := 1 / impliedProb
	o = math.Round(o*100) / 100
	if o < 1.01 {
		o = 1.01
	}
	return o
}
