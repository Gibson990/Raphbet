// Package football is the application use case for football data. It sits
// between the HTTP layer and the data provider, and is the single place where
// betting odds are guaranteed to be present on every match.
package football

import (
	"context"
	"time"

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

	// Dynamically shift the first 8 historical matches into active Live and Upcoming states
	// so the user-side betting UI is active and interactive for testing/demo purposes.
	now := time.Now()
	for i := range matches {
		if i < 8 {
			switch i {
			case 0:
				matches[i].Status = domain.StatusLive
				matches[i].Date = now.Add(-40 * time.Minute)
				matches[i].Time = "40'"
				matches[i].Score = &domain.Score{Home: 1, Away: 0}
				matches[i].HalfTimeScore = nil
			case 1:
				matches[i].Status = domain.StatusLive
				matches[i].Date = now.Add(-70 * time.Minute)
				matches[i].Time = "70'"
				matches[i].Score = &domain.Score{Home: 2, Away: 2}
				matches[i].HalfTimeScore = &domain.Score{Home: 1, Away: 1}
			case 2:
				matches[i].Status = domain.StatusLive
				matches[i].Date = now.Add(-15 * time.Minute)
				matches[i].Time = "15'"
				matches[i].Score = &domain.Score{Home: 0, Away: 0}
				matches[i].HalfTimeScore = nil
			case 3:
				matches[i].Status = domain.StatusUpcoming
				matches[i].Date = now.Add(2 * time.Hour)
				matches[i].Score = nil
				matches[i].HalfTimeScore = nil
				matches[i].Time = ""
			case 4:
				matches[i].Status = domain.StatusUpcoming
				matches[i].Date = now.Add(5 * time.Hour)
				matches[i].Score = nil
				matches[i].HalfTimeScore = nil
				matches[i].Time = ""
			case 5:
				matches[i].Status = domain.StatusUpcoming
				matches[i].Date = now.Add(24 * time.Hour)
				matches[i].Score = nil
				matches[i].HalfTimeScore = nil
				matches[i].Time = ""
			case 6:
				matches[i].Status = domain.StatusUpcoming
				matches[i].Date = now.Add(28 * time.Hour)
				matches[i].Score = nil
				matches[i].HalfTimeScore = nil
				matches[i].Time = ""
			case 7:
				matches[i].Status = domain.StatusUpcoming
				matches[i].Date = now.Add(48 * time.Hour)
				matches[i].Score = nil
				matches[i].HalfTimeScore = nil
				matches[i].Time = ""
			}
		}
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
