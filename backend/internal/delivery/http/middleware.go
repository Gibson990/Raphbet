package http

import (
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// reqLog emits structured JSON request logs (ready for log aggregators).
var reqLog = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

// maxBody limits request bodies to guard against abuse (1 MiB is ample for our
// JSON payloads; the webhook handlers also cap their own reads).
func maxBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		}
		next.ServeHTTP(w, r)
	})
}

// rateLimiter is a simple in-memory fixed-window per-IP limiter. For a single
// instance this is enough; horizontal scaling would move this to Redis.
type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string]*rlWindow
	limit  int
	window time.Duration
}

type rlWindow struct {
	count int
	reset time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{hits: make(map[string]*rlWindow), limit: limit, window: window}
	go rl.gc()
	return rl
}

func (rl *rateLimiter) gc() {
	for range time.Tick(rl.window) {
		now := time.Now()
		rl.mu.Lock()
		for ip, w := range rl.hits {
			if now.After(w.reset) {
				delete(rl.hits, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		now := time.Now()
		rl.mu.Lock()
		win := rl.hits[ip]
		if win == nil || now.After(win.reset) {
			win = &rlWindow{reset: now.Add(rl.window)}
			rl.hits[ip] = win
		}
		win.count++
		over := win.count > rl.limit
		rl.mu.Unlock()
		if over {
			w.Header().Set("Retry-After", "60")
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate limit exceeded"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// clientIP prefers the proxy-forwarded client IP (for when we deploy behind a
// load balancer) and falls back to the connection address.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if i := strings.LastIndex(r.RemoteAddr, ":"); i > 0 {
		return r.RemoteAddr[:i]
	}
	return r.RemoteAddr
}

// cors allows the configured front-end origins to call the API from the browser.
func cors(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && allowed[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Id, X-Admin-Key")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// logging records method, path, status and duration for each request.
func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		reqLog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"ms", time.Since(start).Milliseconds(),
			"ip", clientIP(r),
		)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
