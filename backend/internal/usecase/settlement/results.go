package settlement

import (
	"context"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

// MatchSource is the minimal football dependency the results adapter needs.
// The football use case Service satisfies it.
type MatchSource interface {
	Matches(ctx context.Context, leagueID string) ([]domain.Match, error)
}

// FootballResults derives 1X2 outcomes for finished matches from the football
// data source, across the configured leagues.
type FootballResults struct {
	source    MatchSource
	leagueIDs []string
}

// NewFootballResults builds a results provider for the given leagues.
func NewFootballResults(source MatchSource, leagueIDs ...string) *FootballResults {
	return &FootballResults{source: source, leagueIDs: leagueIDs}
}

// FinishedOutcomes returns matchID -> outcome for every finished match.
func (r *FootballResults) FinishedOutcomes(ctx context.Context) (Outcomes, error) {
	out := Outcomes{}
	for _, leagueID := range r.leagueIDs {
		matches, err := r.source.Matches(ctx, leagueID)
		if err != nil {
			return nil, err
		}
		for _, m := range matches {
			if m.Status != domain.StatusFinished || m.Score == nil {
				continue
			}
			out[m.ID] = outcomeOf(m.Score.Home, m.Score.Away)
		}
	}
	return out, nil
}

func outcomeOf(home, away int) string {
	switch {
	case home > away:
		return "1"
	case home < away:
		return "2"
	default:
		return "X"
	}
}
