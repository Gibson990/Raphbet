// Package football is the application use case for football data. It sits
// between the HTTP layer and the data provider, and is the single place where
// betting odds are guaranteed to be present on every match.
package football

import (
	"context"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/odds"
)

// Service exposes the football operations the API needs.
type Service struct {
	provider domain.FootballProvider
	odds     odds.Engine
}

// New builds a football service from a data provider and an odds engine.
func New(provider domain.FootballProvider, oddsEngine odds.Engine) *Service {
	return &Service{provider: provider, odds: oddsEngine}
}

// Leagues returns the competitions the app offers.
func (s *Service) Leagues(ctx context.Context) ([]domain.League, error) {
	return s.provider.Leagues(ctx)
}

// Matches returns fixtures for a league, ensuring every match carries odds.
func (s *Service) Matches(ctx context.Context, leagueID string) ([]domain.Match, error) {
	matches, err := s.provider.Matches(ctx, leagueID)
	if err != nil {
		return nil, err
	}
	for i := range matches {
		// Fill in odds wherever the provider did not supply real prices, so the
		// house margin is consistently applied across the whole board.
		if matches[i].Odds == (domain.Odds{}) {
			matches[i].Odds = s.odds.OddsFor(matches[i])
		}
		// Attach the full market board (1X2, O/U, BTTS, halves) for bettable matches.
		if matches[i].Status != domain.StatusFinished {
			matches[i].Markets = s.odds.MarketsFor(matches[i])
		}
	}
	return matches, nil
}

// Standings returns the league table for a league.
func (s *Service) Standings(ctx context.Context, leagueID string) ([]domain.Standing, error) {
	return s.provider.Standings(ctx, leagueID)
}
