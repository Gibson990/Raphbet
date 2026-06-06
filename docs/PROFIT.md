# Raphbet — How the product makes money

This file explains the revenue model and how it is implemented in code.

## The core lever: the house margin (overround)

Odds are generated in `backend/internal/usecase/odds`. For every match we
compute "true" win probabilities, then inflate them so the three 1X2 prices sum
to **more than 100%** in implied-probability terms. That surplus is the
**overround** (a.k.a. vig / margin), controlled by `HOUSE_MARGIN` (default
`0.07` = 7%).

Worked example (Mexico vs USA, 7% margin):

| Outcome | Decimal odds | Implied prob (1/odds) |
|---------|-------------|------------------------|
| Home    | 2.81        | 35.6%                  |
| Draw    | 3.59        | 27.9%                  |
| Away    | 2.30        | 43.5%                  |
| **Sum** |             | **~107%**              |

That extra ~7% is the long-run gross margin the book keeps across many bets,
regardless of individual results. Raise `HOUSE_MARGIN` for more edge (worse
prices for users), lower it to be more competitive.

> The margin only becomes *real* revenue in a **real-money** deployment, which
> requires a gambling licence. In the **play-money** model the same margin makes
> the simulation realistic, and revenue comes from the streams below instead.

## Revenue streams by model

### Play-money / prediction model (no licence required)
1. **Betting affiliate / CPA** — refer engaged users to licensed bookmakers;
   earn per-deposit commission or revenue share. Usually the biggest earner.
2. **Ads** — banner/interstitial (e.g. AdMob).
3. **Premium subscription** — remove ads, advanced stats, larger daily credits.
4. **Virtual credit packs** — cosmetic, non-cashable in-app purchases.
5. **Sponsored prediction contests** during big tournaments.

### Real-money model (requires a gambling licence)
1. **The margin above** on every settled bet — the primary income.
2. **Float** on held player balances.

Requires: licence (e.g. offshore Anjouan/Curaçao for a fast launch, or the
Gaming Board of Tanzania locally), KYC/AML, approved payment processing, and
responsible-gambling controls.
