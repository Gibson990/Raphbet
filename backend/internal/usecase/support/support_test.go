package support

import (
	"testing"

	"github.com/Gibson990/Raphbet/backend/internal/infra/store"
)

func TestCreateExtractsBetHashtag(t *testing.T) {
	svc := New(store.NewMemoryStore())
	tk, err := svc.Create("dev-1", "Payout question", "Why was my bet #abc123def not paid?", "")
	if err != nil {
		t.Fatal(err)
	}
	if tk.BetRef != "abc123def" {
		t.Fatalf("expected betRef extracted from #hashtag, got %q", tk.BetRef)
	}
	if tk.Status != "OPEN" {
		t.Fatalf("expected new ticket OPEN, got %s", tk.Status)
	}
}

func TestAdminReplyThenUserReplyFlow(t *testing.T) {
	svc := New(store.NewMemoryStore())
	tk, _ := svc.Create("dev-1", "Hi", "hello", "")

	tk, err := svc.AdminReply(tk.ID, "How can we help?")
	if err != nil {
		t.Fatal(err)
	}
	if tk.Status != "ANSWERED" {
		t.Fatalf("expected ANSWERED after agent reply, got %s", tk.Status)
	}

	// The owner can reply, which reopens the ticket.
	tk, err = svc.Reply("dev-1", tk.ID, "thanks, here are details")
	if err != nil {
		t.Fatal(err)
	}
	if tk.Status != "OPEN" {
		t.Fatalf("expected OPEN after user reply, got %s", tk.Status)
	}
	if len(tk.Messages) != 3 {
		t.Fatalf("expected 3 messages, got %d", len(tk.Messages))
	}
}

func TestReplyRejectsNonOwner(t *testing.T) {
	svc := New(store.NewMemoryStore())
	tk, _ := svc.Create("dev-1", "Hi", "hello", "")
	if _, err := svc.Reply("dev-2", tk.ID, "I am not the owner"); err != ErrForbidden {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestEmptyMessageRejected(t *testing.T) {
	svc := New(store.NewMemoryStore())
	if _, err := svc.Create("dev-1", "subject", "   ", ""); err != ErrEmptyMessage {
		t.Fatalf("expected ErrEmptyMessage, got %v", err)
	}
}
