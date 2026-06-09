// Package support is the application use case for customer-service tickets.
// Registered users open tickets (optionally referencing one of their bets with a
// #hashtag); agents reply from the admin console. The repository is a drop-in
// (in-memory or MongoDB) like the other stores.
package support

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/Gibson990/Raphbet/backend/internal/domain"
)

var (
	ErrEmptyMessage = errors.New("message cannot be empty")
	ErrNotFound     = errors.New("ticket not found")
	ErrForbidden    = errors.New("not your ticket")
	ErrClosed       = errors.New("ticket is closed")
)

// maxBody caps a single message length to keep payloads sane.
const maxBody = 2000

// betRefPattern extracts the first #<id> mention from a message body.
var betRefPattern = regexp.MustCompile(`#([A-Za-z0-9_-]{4,})`)

// Service coordinates the support ticket repository.
type Service struct {
	repo domain.SupportRepository
}

// New builds a support service.
func New(repo domain.SupportRepository) *Service { return &Service{repo: repo} }

// Create opens a new ticket for a registered user. If betRef is empty, a #hashtag
// in the body is used as the referenced bet id.
func (s *Service) Create(deviceID, subject, body, betRef string) (*domain.SupportTicket, error) {
	subject = strings.TrimSpace(subject)
	body = trimTo(body, maxBody)
	if body == "" {
		return nil, ErrEmptyMessage
	}
	if subject == "" {
		subject = "Support request"
	}
	if betRef == "" {
		if m := betRefPattern.FindStringSubmatch(body); m != nil {
			betRef = m[1]
		}
	}
	now := time.Now()
	t := &domain.SupportTicket{
		ID:          newID(),
		DeviceID:    deviceID,
		Subject:     trimTo(subject, 140),
		BetRef:      betRef,
		Status:      domain.SupportOpen,
		Messages:    []domain.SupportMessage{{ID: newID(), From: "user", Body: body, Date: now}},
		CreatedDate: now,
		UpdatedDate: now,
	}
	return t, s.repo.AddTicket(t)
}

// Reply appends a user message to their own open ticket.
func (s *Service) Reply(deviceID, ticketID, body string) (*domain.SupportTicket, error) {
	body = trimTo(body, maxBody)
	if body == "" {
		return nil, ErrEmptyMessage
	}
	t, err := s.repo.GetTicket(ticketID)
	if err != nil || t == nil {
		return nil, ErrNotFound
	}
	if t.DeviceID != deviceID {
		return nil, ErrForbidden
	}
	if t.Status == domain.SupportClosed {
		return nil, ErrClosed
	}
	t.Messages = append(t.Messages, domain.SupportMessage{ID: newID(), From: "user", Body: body, Date: time.Now()})
	t.Status = domain.SupportOpen
	t.UpdatedDate = time.Now()
	return t, s.repo.UpdateTicket(t)
}

// Mine returns a user's own tickets, newest activity first.
func (s *Service) Mine(deviceID string) ([]*domain.SupportTicket, error) {
	tickets, err := s.repo.ListTicketsByDevice(deviceID)
	if err != nil {
		return nil, err
	}
	sortByUpdated(tickets)
	return tickets, nil
}

// All returns every ticket (admin), newest activity first.
func (s *Service) All() ([]*domain.SupportTicket, error) {
	tickets, err := s.repo.AllTickets()
	if err != nil {
		return nil, err
	}
	sortByUpdated(tickets)
	return tickets, nil
}

// AdminReply appends an agent message and marks the ticket answered.
func (s *Service) AdminReply(ticketID, body string) (*domain.SupportTicket, error) {
	body = trimTo(body, maxBody)
	if body == "" {
		return nil, ErrEmptyMessage
	}
	t, err := s.repo.GetTicket(ticketID)
	if err != nil || t == nil {
		return nil, ErrNotFound
	}
	t.Messages = append(t.Messages, domain.SupportMessage{ID: newID(), From: "admin", Body: body, Date: time.Now()})
	t.Status = domain.SupportAnswered
	t.UpdatedDate = time.Now()
	return t, s.repo.UpdateTicket(t)
}

// Close marks a ticket resolved (admin).
func (s *Service) Close(ticketID string) (*domain.SupportTicket, error) {
	t, err := s.repo.GetTicket(ticketID)
	if err != nil || t == nil {
		return nil, ErrNotFound
	}
	t.Status = domain.SupportClosed
	t.UpdatedDate = time.Now()
	return t, s.repo.UpdateTicket(t)
}

func sortByUpdated(tickets []*domain.SupportTicket) {
	for i := 0; i < len(tickets)-1; i++ {
		for j := i + 1; j < len(tickets); j++ {
			if tickets[j].UpdatedDate.After(tickets[i].UpdatedDate) {
				tickets[i], tickets[j] = tickets[j], tickets[i]
			}
		}
	}
}

func trimTo(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) > n {
		return s[:n]
	}
	return s
}

func newID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
