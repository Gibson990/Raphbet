package settlement

import (
	"context"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/markets"
)

// MatchSource is the minimal football dependency the results adapter needs.
// The football use case Service satisfies it.
type MatchSource interface {
	Matches(ctx context.Context, leagueID string) ([]domain.Match, error)
}

// FootballResults derives match results (full-time, and half-time when known)
// for finished matches across the configured leagues.
type FootballResults struct {
	source    MatchSource
	leagueIDs []string
}

// NewFootballResults builds a results provider for the given leagues.
func NewFootballResults(source MatchSource, leagueIDs ...string) *FootballResults {
	return &FootballResults{source: source, leagueIDs: leagueIDs}
}

// FinishedResults returns matchID -> result for every finished match.
func (r *FootballResults) FinishedResults(ctx context.Context) (map[string]markets.Result, error) {
	out := map[string]markets.Result{}
	for _, leagueID := range r.leagueIDs {
		matches, err := r.source.Matches(ctx, leagueID)
		if err != nil {
			return nil, err
		}
		for _, m := range matches {
			if m.Status != domain.StatusFinished || m.Score == nil {
				continue
			}
			res := markets.Result{FTHome: m.Score.Home, FTAway: m.Score.Away}
			if m.HalfTimeScore != nil {
				res.HTHome = m.HalfTimeScore.Home
				res.HTAway = m.HalfTimeScore.Away
				res.HasHT = true
			}
			out[m.ID] = res
		}
	}
	return out, nil
}
