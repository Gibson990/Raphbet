package football

import (
	"context"
	"fmt"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// MockProvider serves a realistic multi-league slate (World Cup national teams
// plus the top European club leagues) so the whole app runs end-to-end locally
// and as a fallback when the upstream is unavailable. Odds are left empty so the
// use case layer fills them via the odds engine.
type MockProvider struct{}

// NewMockProvider returns a zero-dependency provider for local development.
func NewMockProvider() *MockProvider { return &MockProvider{} }

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
	return CuratedLeagues, nil
}

func (p *MockProvider) Matches(ctx context.Context, leagueID string) ([]domain.Match, error) {
	if leagueID == worldCupID {
		return p.worldCupMatches(), nil
	}
	if roster, ok := leagueRosters[leagueID]; ok {
		return generateFixtures(leagueID, roster), nil
	}
	return []domain.Match{}, nil
}

func (p *MockProvider) worldCupMatches() []domain.Match {
	now := time.Now()
	mk := func(id, home, away string, offset time.Duration, status domain.MatchStatus, score, ht *domain.Score, clock string) domain.Match {
		return domain.Match{
			ID: id, LeagueID: worldCupID, Date: now.Add(offset), Status: status,
			HomeTeam: mockTeams[home], AwayTeam: mockTeams[away], Score: score, HalfTimeScore: ht, Time: clock,
		}
	}
	return []domain.Match{
		mk("WC-LIVE-1", "MEX", "USA", -63*time.Minute, domain.StatusLive, &domain.Score{Home: 1, Away: 1}, nil, "63'"),
		mk("WC-LIVE-2", "BRA", "JPN", -52*time.Minute, domain.StatusLive, &domain.Score{Home: 2, Away: 0}, &domain.Score{Home: 2, Away: 0}, "HT"),
		mk("WC-UP-1", "ARG", "ENG", 24*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-UP-2", "FRA", "GER", 27*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-UP-3", "ESP", "POR", 48*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-UP-4", "NED", "CAN", 51*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk("WC-FT-1", "GER", "JPN", -48*time.Hour, domain.StatusFinished, &domain.Score{Home: 1, Away: 2}, &domain.Score{Home: 0, Away: 1}, "FT"),
		mk("WC-FT-2", "ARG", "MEX", -72*time.Hour, domain.StatusFinished, &domain.Score{Home: 2, Away: 0}, &domain.Score{Home: 1, Away: 0}, "FT"),
	}
}

// generateFixtures builds a plausible bettable slate (live + upcoming +
// finished) for a club league from its roster, with dates relative to now.
func generateFixtures(leagueID string, t []domain.Team) []domain.Match {
	if len(t) < 6 {
		return []domain.Match{}
	}
	now := time.Now()
	mk := func(n int, h, a domain.Team, off time.Duration, st domain.MatchStatus, sc, ht *domain.Score, clock string) domain.Match {
		return domain.Match{
			ID: fmt.Sprintf("%s-%d", leagueID, n), LeagueID: leagueID, Date: now.Add(off),
			Status: st, HomeTeam: h, AwayTeam: a, Score: sc, HalfTimeScore: ht, Time: clock,
		}
	}
	return []domain.Match{
		mk(1, t[0], t[1], -52*time.Minute, domain.StatusLive, &domain.Score{Home: 1, Away: 0}, nil, "57'"),
		mk(2, t[2], t[3], -78*time.Minute, domain.StatusLive, &domain.Score{Home: 2, Away: 2}, &domain.Score{Home: 1, Away: 1}, "81'"),
		mk(3, t[4], t[5], 3*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk(4, t[0], t[2], 27*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk(5, t[1], t[4], 50*time.Hour, domain.StatusUpcoming, nil, nil, ""),
		mk(6, t[3], t[5], -47*time.Hour, domain.StatusFinished, &domain.Score{Home: 2, Away: 1}, &domain.Score{Home: 1, Away: 0}, "FT"),
		mk(7, t[5], t[0], -71*time.Hour, domain.StatusFinished, &domain.Score{Home: 0, Away: 3}, &domain.Score{Home: 0, Away: 2}, "FT"),
	}
}

func (p *MockProvider) Standings(ctx context.Context, leagueID string) ([]domain.Standing, error) {
	if leagueID == worldCupID {
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
	if roster, ok := leagueRosters[leagueID]; ok {
		return generateStandings(roster), nil
	}
	return []domain.Standing{}, nil
}

// generateStandings builds a simple plausible table from a roster.
func generateStandings(t []domain.Team) []domain.Standing {
	out := make([]domain.Standing, 0, len(t))
	for i, tm := range t {
		played := 10
		win := 8 - i
		if win < 1 {
			win = 1
		}
		draw := i % 3
		loss := played - win - draw
		if loss < 0 {
			loss = 0
		}
		out = append(out, domain.Standing{
			Rank: i + 1, Team: tm, Played: played, Win: win, Draw: draw, Loss: loss,
			Points: win*3 + draw, GoalDifference: (win - loss) * 2,
		})
	}
	return out
}
