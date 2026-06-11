// Package football is the application use case for football data. It sits
// between the HTTP layer and the data provider, and is the single place where
// betting odds are guaranteed to be present on every match.
package football

import (
	"context"
	"sort"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/odds"
)

// maxBoard caps how many matches a league returns. A full season can be ~380
// fixtures; rendering them all bloats the payload and can hang the browser. We
// surface a focused slate: live first, then soonest upcoming, then most-recent
// finished.
const maxBoard = 40

func statusRank(s domain.MatchStatus) int {
	switch s {
	case domain.StatusLive:
		return 0
	case domain.StatusUpcoming:
		return 1
	default:
		return 2
	}
}

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

	// Demo treatment: when a league has no live/upcoming matches (e.g. the
	// upstream only returns historical seasons on the current plan), shift the
	// first few into active Live/Upcoming states so the board is bettable. If the
	// provider already supplies live/upcoming fixtures (the mock does), they are
	// left untouched so real statuses — and finished results for settlement — are
	// preserved.
	hasBettable := false
	for i := range matches {
		if matches[i].Status == domain.StatusLive || matches[i].Status == domain.StatusUpcoming {
			hasBettable = true
			break
		}
	}
	now := time.Now()
	for i := 0; hasBettable == false && i < len(matches); i++ {
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

	// Focus the board (live → soonest upcoming → most-recent finished) and cap it
	// before pricing, so we never compute markets for a whole historical season.
	sort.SliceStable(matches, func(a, b int) bool {
		ra, rb := statusRank(matches[a].Status), statusRank(matches[b].Status)
		if ra != rb {
			return ra < rb
		}
		if matches[a].Status == domain.StatusFinished {
			return matches[a].Date.After(matches[b].Date) // most recent finished first
		}
		return matches[a].Date.Before(matches[b].Date) // soonest upcoming first
	})
	if len(matches) > maxBoard {
		matches = matches[:maxBoard]
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

// MatchStateFor returns a match's live state (status, score, elapsed minutes)
// for cash-out pricing. ok is false when the match isn't on the board.
func (s *Service) MatchStateFor(ctx context.Context, leagueID, matchID string) (status string, home, away, elapsed int, ok bool) {
	matches, err := s.Matches(ctx, leagueID)
	if err != nil {
		return "", 0, 0, 0, false
	}
	for i := range matches {
		if matches[i].ID != matchID {
			continue
		}
		m := matches[i]
		if m.Score != nil {
			home, away = m.Score.Home, m.Score.Away
		}
		return string(m.Status), home, away, parseElapsed(m.Time, m.Status), true
	}
	return "", 0, 0, 0, false
}

// parseElapsed turns a clock label ("57'", "HT", "FT") into elapsed minutes.
func parseElapsed(t string, st domain.MatchStatus) int {
	if st == domain.StatusFinished {
		return 90
	}
	switch t {
	case "HT":
		return 45
	case "FT":
		return 90
	}
	n := 0
	for i := 0; i < len(t) && t[i] >= '0' && t[i] <= '9'; i++ {
		n = n*10 + int(t[i]-'0')
	}
	if n == 0 && st == domain.StatusLive {
		return 45
	}
	return n
}

// Standings returns the league table for a league.
func (s *Service) Standings(ctx context.Context, leagueID string) ([]domain.Standing, error) {
	return s.provider.Standings(ctx, leagueID)
}

// OddsForSelection returns the canonical, server-computed odds for a market
// outcome on a match. It is the single source of truth used to validate bets:
// the placement path recomputes prices here instead of trusting the client, so
// a forged "odds" field in the request can never inflate a payout. Returns
// (price, true) when the match is bettable and the outcome code is on the board.
func (s *Service) OddsForSelection(ctx context.Context, leagueID, matchID, marketCode string) (float64, bool) {
	matches, err := s.Matches(ctx, leagueID)
	if err != nil {
		return 0, false
	}
	for i := range matches {
		if matches[i].ID != matchID {
			continue
		}
		// Finished matches carry no market board — they are no longer bettable.
		if matches[i].Status == domain.StatusFinished {
			return 0, false
		}
		for _, mkt := range matches[i].Markets {
			for _, oc := range mkt.Outcomes {
				if oc.Code == marketCode {
					return oc.Odds, true
				}
			}
		}
		return 0, false
	}
	return 0, false
}
