package football

import (
	"context"
	"log"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// FallbackProvider tries a primary provider first and falls back to a secondary
// one when the primary errors or returns no data. This keeps the app usable
// when, for example, the api-football free plan cannot access the configured
// season — users still get the bettable mock World Cup slate instead of a blank
// board, and real data flows automatically once the plan/season allows it.
type FallbackProvider struct {
	primary  domain.FootballProvider
	fallback domain.FootballProvider
}

// NewFallbackProvider wraps primary with a fallback.
func NewFallbackProvider(primary, fallback domain.FootballProvider) *FallbackProvider {
	return &FallbackProvider{primary: primary, fallback: fallback}
}

func (p *FallbackProvider) Leagues(ctx context.Context) ([]domain.League, error) {
	if data, err := p.primary.Leagues(ctx); err == nil && len(data) > 0 {
		return data, nil
	} else if err != nil {
		log.Printf("football: primary leagues failed, using fallback: %v", err)
	}
	return p.fallback.Leagues(ctx)
}

func (p *FallbackProvider) Matches(ctx context.Context, leagueID string) ([]domain.Match, error) {
	if data, err := p.primary.Matches(ctx, leagueID); err == nil && len(data) > 0 {
		return data, nil
	} else if err != nil {
		log.Printf("football: primary matches failed, using fallback: %v", err)
	}
	return p.fallback.Matches(ctx, leagueID)
}

func (p *FallbackProvider) Standings(ctx context.Context, leagueID string) ([]domain.Standing, error) {
	if data, err := p.primary.Standings(ctx, leagueID); err == nil && len(data) > 0 {
		return data, nil
	} else if err != nil {
		log.Printf("football: primary standings failed, using fallback: %v", err)
	}
	return p.fallback.Standings(ctx, leagueID)
}
