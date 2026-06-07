package http

import "net/http"

// NewRouter builds the HTTP route table and wraps it with global middleware.
func NewRouter(h *Handlers, allowedOrigins []string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /api/leagues", h.leagues)
	mux.HandleFunc("GET /api/leagues/{id}/matches", h.matches)
	mux.HandleFunc("GET /api/leagues/{id}/standings", h.standings)

	// Wallet & bets (identified by the X-Device-Id header until auth lands).
	mux.HandleFunc("GET /api/wallet", h.getWallet)
	mux.HandleFunc("POST /api/wallet/topup", h.topUp)
	mux.HandleFunc("POST /api/wallet/withdraw", h.withdraw)
	mux.HandleFunc("GET /api/bets", h.listBets)
	mux.HandleFunc("POST /api/bets", h.placeBet)

	// Middleware is applied outermost-first: logging wraps CORS wraps the mux.
	return logging(cors(allowedOrigins)(mux))
}
