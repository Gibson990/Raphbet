package football

import "github.com/Gibson990/Raphbet/backend/internal/domain"

// worldCupID is the FIFA World Cup (api-football league 1), the default league.
const worldCupID = "1"

// leagueLogo / teamLogo build api-football's stable CDN logo URLs, so the same
// IDs work whether data comes from the mock or the real provider.
func leagueLogo(id string) string { return "https://media.api-sports.io/football/leagues/" + id + ".png" }
func teamLogo(id string) string   { return "https://media.api-sports.io/football/teams/" + id + ".png" }

// CuratedLeagues is the curated set the app offers, World Cup first (so it is
// the default selection). IDs match api-football so the real provider can fetch
// the same competitions. Kept deliberately short — the top leagues users want,
// not an overwhelming list.
var CuratedLeagues = []domain.League{
	{ID: worldCupID, Name: "FIFA World Cup", Country: "World", Logo: leagueLogo("1")},
	{ID: "39", Name: "Premier League", Country: "England", Logo: leagueLogo("39")},
	{ID: "140", Name: "La Liga", Country: "Spain", Logo: leagueLogo("140")},
	{ID: "135", Name: "Serie A", Country: "Italy", Logo: leagueLogo("135")},
	{ID: "78", Name: "Bundesliga", Country: "Germany", Logo: leagueLogo("78")},
	{ID: "61", Name: "Ligue 1", Country: "France", Logo: leagueLogo("61")},
	{ID: "2", Name: "Champions League", Country: "Europe", Logo: leagueLogo("2")},
}

// LeagueIDs returns just the ids (used by the settlement worker).
func LeagueIDs() []string {
	ids := make([]string, len(CuratedLeagues))
	for i, l := range CuratedLeagues {
		ids[i] = l.ID
	}
	return ids
}

// clubTeam is a small helper for building a team with an api-football logo.
func clubTeam(id, name string) domain.Team { return domain.Team{ID: id, Name: name, Logo: teamLogo(id)} }

// leagueRosters holds a small squad per club league, used by the mock provider
// to generate plausible fixtures. Team IDs are real api-football ids so the
// logos resolve. The World Cup uses national teams (see mock.go).
var leagueRosters = map[string][]domain.Team{
	"39": { // Premier League
		clubTeam("50", "Manchester City"), clubTeam("42", "Arsenal"), clubTeam("40", "Liverpool"),
		clubTeam("33", "Manchester United"), clubTeam("49", "Chelsea"), clubTeam("47", "Tottenham"),
	},
	"140": { // La Liga
		clubTeam("541", "Real Madrid"), clubTeam("529", "Barcelona"), clubTeam("530", "Atlético Madrid"),
		clubTeam("536", "Sevilla"), clubTeam("548", "Real Sociedad"), clubTeam("533", "Villarreal"),
	},
	"135": { // Serie A
		clubTeam("505", "Inter"), clubTeam("489", "AC Milan"), clubTeam("496", "Juventus"),
		clubTeam("492", "Napoli"), clubTeam("497", "Roma"), clubTeam("487", "Lazio"),
	},
	"78": { // Bundesliga
		clubTeam("157", "Bayern München"), clubTeam("165", "Borussia Dortmund"), clubTeam("173", "RB Leipzig"),
		clubTeam("168", "Bayer Leverkusen"), clubTeam("169", "Eintracht Frankfurt"), clubTeam("161", "Wolfsburg"),
	},
	"61": { // Ligue 1
		clubTeam("85", "Paris Saint Germain"), clubTeam("81", "Marseille"), clubTeam("91", "Monaco"),
		clubTeam("80", "Lyon"), clubTeam("79", "Lille"), clubTeam("84", "Nice"),
	},
	"2": { // Champions League (mix of Europe's best)
		clubTeam("541", "Real Madrid"), clubTeam("50", "Manchester City"), clubTeam("157", "Bayern München"),
		clubTeam("85", "Paris Saint Germain"), clubTeam("505", "Inter"), clubTeam("529", "Barcelona"),
	},
}
