# Frontend Audit — Overview

This document captures the high-level priorities and scope for the frontend audit and the subsequent implementation work.

High priority (must-have)
- Authentication & account UX: signup, signin, forgot password, persisted auth, inline errors.
- Wallet & mocked balance: global header balance, wallet page, deposit/withdraw forms (mock), client-side balance updates.
- Events, markets, odds UI: events list, event detail, markets, odds display, loading and empty states.
- Bet slip & local bet placement: persistent bet slip, stake input, payout calc, local mock placement and balance deduction.

Medium priority
- Bet history & bet detail (local data), local settlement controls for demo.
- Notifications & feedback (toasts, error banners, online/offline status).

Lower priority
- Accessibility, i18n preparation, tests, visual polish and theming.

Notes
- Keep all new client-side state namespaced under `raphbet.*` in localStorage.
- Use React Context + hooks for auth and betSlip state; keep mocks behind a `Mocks ON` flag.
