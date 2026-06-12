package http

import (
	"net/http"
	"time"
)

// NewRouter builds the HTTP route table and wraps it with global middleware.
func NewRouter(h *Handlers, allowedOrigins []string, rateLimitPerMin int) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /api/config", h.publicConfig)
	mux.HandleFunc("GET /api/leagues", h.leagues)
	mux.HandleFunc("GET /api/leagues/{id}/matches", h.matches)
	mux.HandleFunc("GET /api/leagues/{id}/standings", h.standings)

	// Wallet & bets (identified by the X-Device-Id header until auth lands).
	mux.HandleFunc("GET /api/wallet", h.getWallet)
	mux.HandleFunc("POST /api/wallet/topup", h.topUp)
	mux.HandleFunc("POST /api/wallet/withdraw", h.withdraw)
	mux.HandleFunc("GET /api/bets", h.listBets)
	mux.HandleFunc("POST /api/bets", h.placeBet)
	mux.HandleFunc("POST /api/bets/{id}/cashout", h.cashOut)
	mux.HandleFunc("GET /api/withdrawals", h.listWithdrawals)
	mux.HandleFunc("POST /api/account/delete", h.deleteAccount)

	// Customer support (registered users open + reply to their own tickets).
	mux.HandleFunc("POST /api/support", h.createTicket)
	mux.HandleFunc("GET /api/support", h.listMyTickets)
	mux.HandleFunc("POST /api/support/{id}/reply", h.replyTicket)

	// Crypto payment confirmation (NOWPayments IPN).
	mux.HandleFunc("POST /api/payments/nowpayments/webhook", h.nowpaymentsWebhook)

	// KYC (identity verification).
	mux.HandleFunc("GET /api/kyc/status", h.kycStatus)
	mux.HandleFunc("POST /api/kyc/start", h.kycStart)
	mux.HandleFunc("POST /api/kyc/check", h.kycCheck)
	mux.HandleFunc("POST /api/kyc/webhook", h.kycWebhook)
	mux.HandleFunc("POST /api/kyc/sandbox/approve", h.kycSandboxApprove)

	// Admin dashboard (gated by the admin key / future admin role).
	mux.HandleFunc("GET /api/admin/stats", h.adminStats)
	mux.HandleFunc("GET /api/admin/users", h.adminUsers)
	mux.HandleFunc("GET /api/admin/bets", h.adminBets)
	mux.HandleFunc("GET /api/admin/withdrawals", h.adminWithdrawals)
	mux.HandleFunc("POST /api/admin/withdrawals/export", h.adminExportWithdrawals)
	mux.HandleFunc("POST /api/admin/withdrawals/{id}/approve", h.adminApproveWithdrawal)
	mux.HandleFunc("POST /api/admin/withdrawals/{id}/reject", h.adminRejectWithdrawal)
	mux.HandleFunc("POST /api/admin/users/{deviceId}/balance", h.adminAdjustUserBalance)
	mux.HandleFunc("POST /api/admin/users/{deviceId}/kyc", h.adminSetUserKyc)
	mux.HandleFunc("POST /api/admin/users/{deviceId}/suspend", h.adminSetUserSuspended)
	mux.HandleFunc("POST /api/admin/users/{deviceId}/delete", h.adminDeleteUser)
	mux.HandleFunc("GET /api/admin/config", h.adminGetConfig)
	mux.HandleFunc("POST /api/admin/config", h.adminSetConfig)
	mux.HandleFunc("GET /api/admin/users/{deviceId}/wallet", h.adminGetUserWallet)
	mux.HandleFunc("POST /api/admin/bets/{id}/settle", h.adminSettleBet)
	mux.HandleFunc("GET /api/admin/support", h.adminListTickets)
	mux.HandleFunc("POST /api/admin/support/{id}/reply", h.adminReplyTicket)
	mux.HandleFunc("POST /api/admin/support/{id}/close", h.adminCloseTicket)

	// Middleware (outermost first): logging → CORS → rate limit → body cap → mux.
	rl := newRateLimiter(rateLimitPerMin, time.Minute)
	return logging(cors(allowedOrigins)(rl.middleware(maxBody(mux))))
}
