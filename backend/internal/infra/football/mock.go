package football

import (
	"context"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// MockProvider serves a realistic FIFA World Cup 2026 slate with live image
// URLs. It lets the whole app run end-to-end locally before an api-football key
// is configured. Odds are intentionally left empty so the use case layer fills
// them via the odds engine (proving the margin pipeline works).
type MockProvider struct{}

// NewMockProvider returns a zero-dependency provider for local development.
func NewMockProvider() *MockProvider { return &MockProvider{} }

const worldCupID = "1"

func flag(code string) string { return "https://flagcdn.com/w160/" + code + ".png" }

var mockTeams = map[string]domain.Team{
	"ARG": {ID: "ARG", Name: "Argentina", Logo: flag("ar")},
	"FRA": {ID: "FRA", Name: "France", Logo: flag("fr")},
	"BRA": {ID: "BRA", Name: "Brazil", Logo: flag("br")},
	"ENG": {ID: "ENG", Name: "England", Logo: flag("gb-eng")},
	"ESP": {ID: "ESP", Name: "Spain", Logo: flag("es")},
	"GER": {ID: "GER", Name: "Germany", Logo: flag("de")},
	"POR": {ID: "POR", Name: "Portugal", Logo: flag("pt")},
	"NED": {ID: "NED", Name: "Netherlands", Logo: flag("nl")},
	"USA": {ID: "USA", Name: "United States", Logo: flag("us")},
	"MEX": {ID: "MEX", Name: "Mexico", Logo: flag("mx")},
	"CAN": {ID: "CAN", Name: "Canada", Logo: flag("ca")},
	"JPN": {ID: "JPN", Name: "Japan", Logo: flag("jp")},
}

func (p *MockProvider) Leagues(ctx context.Context) ([]domain.League, error) {
	return []domain.League{{
		ID:      worldCupID,
		Name:    "FIFA World Cup",
		Country: "World",
		Logo:    "https://media.api-sports.io/football/leagues/1.png",
	}}, nil
}

func (p *MockProvider) Matches(ctx context.Context, leagueID string) ([]domain.Match, error) {
	if leagueID != worldCupID {
		return []domain.Match{}, nil
	}
	// Anchor the slate around the real 2026 tournament window so dates read
	// naturally in the UI regardless of when this runs.
	base := time.Date(2026, time.June, 11, 19, 0, 0, 0, time.UTC)
	mk := func(id, home, away string, offset time.Duration, status domain.MatchStatus, score, ht *domain.Score, clock string) domain.Match {
		return domain.Match{
			ID:            id,
			LeagueID:      worldCupID,
			Date:          base.Add(offset),
			Status:        status,
			HomeTeam:      mockTeams[home],
			AwayTeam:      mockTeams[away],
			Score:         score,
			HalfTimeScore: ht,
			Time:          clock,
		}
	}
	return []domain.Match{
		mk("WC-LIVE-1", "MEX", "USA", -90*time.Minute, domain.StatusLive, &domain.Score{Home: 1, Away: 1}, nil, "63'"),
		mk("WC-LIVE-2", "BRA", "JPN", -55*time.Minute, domain.StatusLive, &domain.Score{Home: 2, Away: 0}, &domain.Score{Home: 2, Away: 0}, "HT"),
		mk("WC-UP-1", "ARG", "ENG", 24*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-UP-2", "FRA", "GER", 27*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-UP-3", "ESP", "POR", 48*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-UP-4", "NED", "CAN", 51*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-FT-1", "GER", "JPN", -48*time.Hour, domain.StatusFinished, &domain.Score{Home: 1, Away: 2}, &domain.Score{Home: 0, Away: 1}, "FT"),
		mk("WC-FT-2", "ARG", "MEX", -72*time.Hour, domain.StatusFinished, &domain.Score{Home: 2, Away: 0}, &domain.Score{Home: 1, Away: 0}, "FT"),
	}, nil
}

func (p *MockProvider) Standings(ctx context.Context, leagueID string) ([]domain.Standing, error) {
	if leagueID != worldCupID {
		return []domain.Standing{}, nil
	}
	row := func(rank int, team string, pl, w, d, l, pts, gd int) domain.Standing {
		return domain.Standing{Rank: rank, Team: mockTeams[team], Played: pl, Win: w, Draw: d, Loss: l, Points: pts, GoalDifference: gd}
	}
	return []domain.Standing{
		row(1, "ARG", 2, 2, 0, 0, 6, 4),
		row(2, "FRA", 2, 1, 1, 0, 4, 2),
		row(3, "BRA", 2, 1, 1, 0, 4, 2),
		row(4, "ESP", 2, 1, 0, 1, 3, 0),
		row(5, "GER", 2, 1, 0, 1, 3, -1),
		row(6, "ENG", 2, 0, 1, 1, 1, -3),
	}, nil
}
