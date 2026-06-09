package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
	"github.com/Gibson990/Raphbet/backend/internal/usecase/support"
)

// SupportService is the use case port for customer-service tickets.
type SupportService interface {
	Create(deviceID, subject, body, betRef string) (*domain.SupportTicket, error)
	Reply(deviceID, ticketID, body string) (*domain.SupportTicket, error)
	Mine(deviceID string) ([]*domain.SupportTicket, error)
	All() ([]*domain.SupportTicket, error)
	AdminReply(ticketID, body string) (*domain.SupportTicket, error)
	Close(ticketID string) (*domain.SupportTicket, error)
}

func supportError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, support.ErrEmptyMessage), errors.Is(err, support.ErrClosed):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	case errors.Is(err, support.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "ticket not found"})
	case errors.Is(err, support.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not your ticket"})
	default:
		writeError(w, http.StatusInternalServerError, "support operation failed", err)
	}
}

// createTicket opens a new ticket (registered users only — identity required).
func (h *Handlers) createTicket(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	var req struct {
		Subject string `json:"subject"`
		Body    string `json:"body"`
		BetRef  string `json:"betRef"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	t, err := h.support.Create(id, req.Subject, req.Body, req.BetRef)
	if err != nil {
		supportError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

// replyTicket appends a user message to their own ticket.
func (h *Handlers) replyTicket(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	var req struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	t, err := h.support.Reply(id, r.PathValue("id"), req.Body)
	if err != nil {
		supportError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// listMyTickets returns the caller's own tickets.
func (h *Handlers) listMyTickets(w http.ResponseWriter, r *http.Request) {
	id, ok := h.identity(w, r)
	if !ok {
		return
	}
	tickets, err := h.support.Mine(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tickets", err)
		return
	}
	writeJSON(w, http.StatusOK, tickets)
}

// adminListTickets returns every ticket (admin).
func (h *Handlers) adminListTickets(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	tickets, err := h.support.All()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tickets", err)
		return
	}
	writeJSON(w, http.StatusOK, tickets)
}

// adminReplyTicket posts an agent reply (admin).
func (h *Handlers) adminReplyTicket(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	var req struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	t, err := h.support.AdminReply(r.PathValue("id"), req.Body)
	if err != nil {
		supportError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// adminCloseTicket marks a ticket resolved (admin).
func (h *Handlers) adminCloseTicket(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	t, err := h.support.Close(r.PathValue("id"))
	if err != nil {
		supportError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}
