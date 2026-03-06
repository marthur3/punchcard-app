# TapRanked — Product & Business Spec

## The Pitch

Local coffee shops and restaurants bleed money into Facebook ads and hope for the best. TapRanked gives them something better: a physical NFC stand that sits on the counter, a digital punch card that lives in the customer's phone, and a dashboard that shows them exactly who their loyal customers are. No app download required. No technical setup. Just tap and go.

---

## Problem

Independent coffee shops have no good way to run loyalty programs:

- **POS-integrated loyalty** (Square, Toast, Stripe) is buried in a larger system they may not use, costs more, and gives the customer no "wow" moment.
- **Facebook/Instagram ads** are expensive, hard to measure, and don't build repeat behavior — they acquire customers, not loyal ones.
- **Paper punch cards** get lost, can't be tracked, and give the owner zero data.
- **App-based loyalty** (Stamp Me, Loopy Loyalty) requires customers to download yet another app — most won't.

---

## Solution

A three-part system:

1. **NFC Stand** — A small, branded physical stand provided to the business. Customer taps their phone, no app download needed.
2. **Digital Wallet Card** — A punch card that lives in Apple Wallet / Google Wallet. It updates automatically as punches are collected.
3. **Business Dashboard** — A web CRM the owner logs into to see customers, punch activity, prize redemptions, and location performance.

---

## Target Market

**Primary:** Independent coffee shops and small café chains in Blacksburg, VA and surrounding areas (Christiansburg, Radford, Roanoke corridor).

**Secondary (later):** Restaurants, bars, local retail — anywhere with repeat foot traffic.

**Ideal customer profile:**
- 1–5 locations
- Owner-operated or small management team
- Already spending on marketing but unsure if it's working
- Wants to feel modern and impress customers without becoming an IT person

---

## Positioning

> "The loyalty program your customers will actually use — because they don't have to download anything."

We are not competing with Square or Toast. We are competing with the owner's default choice: do nothing, or keep boosting Facebook posts. Our job is to show them a better use of that $100/month.

---

## Pricing

| Tier | Price | What's Included |
|---|---|---|
| **Setup Fee** | $150 one-time | NFC stand(s), onboarding, NFC tag programming, in-person setup |
| **Monthly** | $100/location/month | Dashboard access, unlimited punch cards, customer CRM, leaderboard |
| **Multi-location** | $80/location/month | 3+ locations under one account |

- Month-to-month, no annual contract required (use as a sales unlock)
- First month free as part of in-person close

**Unit economics target:**
- NFC hardware cost: ~$5–15/stand
- Setup time: ~1 hour per business
- Break-even per customer: ~2 months

---

## Product Scope

### MVP (Ship to first paying customers)

These must work end-to-end before charging money:

- [ ] NFC tap → instant punch, no app download
- [ ] Apple Wallet + Google Wallet card that shows punch count and updates
- [ ] Customer account creation (phone number or email, minimal friction)
- [ ] Business dashboard: customer list, punch activity feed, prize redemption log
- [ ] Multi-location support under one business account
- [ ] Business owner login (separate from customer login)
- [ ] Prize/reward configuration (owner sets "10 punches = free coffee")
- [ ] Basic analytics: total punches today/week/month, top customers, busiest hours

### V2 (After first 5 paying customers)

- [ ] Geo-fence push notifications (e.g., "You're near Java Cafe — you're 2 punches from a free drink!")
- [ ] Customer segments (frequent visitors, lapsing customers, new)
- [ ] Export customer list (CSV) for email marketing
- [ ] Automated re-engagement: push to customers who haven't visited in 30 days
- [ ] Leaderboard / social layer (optional opt-in for customers) — pulled from MVP, revisit post-launch

### Out of scope (for now)

- Native iOS/Android app
- Payment processing
- Inventory or POS integration
- White-label reseller program

---

## Go-to-Market

### Phase 1: Blacksburg Launch (0–3 months)

**Channel:** Direct, in-person outreach. Walk in, ask for the owner, leave a card, come back.

**Script:** "You're already spending money on ads that are hard to track. For $100/month I'll put a device on your counter that builds you a list of your best customers and keeps them coming back. I'll set it up myself."

**Target:** 10 paying businesses in Blacksburg/Christiansburg/Radford.

**Tools needed:**
- Leave-behind one-pager (print)
- Demo flow: show them the tap on your own phone in 30 seconds
- Simple contract / invoice (Stripe or Square for billing)

### Phase 2: Prove retention (months 3–6)

- Show customers churn data and repeat visit rates from Phase 1 businesses
- Use testimonials and real numbers to close the next 20
- Begin outreach to Roanoke market

### Phase 3: Systematize (months 6–12)

- Self-serve signup flow for businesses outside direct reach
- Referral program (business owner refers another, gets a free month)
- Hire one part-time local sales rep

---

## Technical Build Plan

### What exists (current codebase)

- NFC tap → punch card flow (web, demo mode working)
- Customer auth (login/register)
- Business portal with analytics
- Admin panel
- Leaderboard
- Flask port (secondary)

### What needs to be built

#### High priority (MVP blockers)

1. **Wallet card generation** — Apple Wallet (.pkpass) and Google Wallet (JWT passes) that update when punches are added. This is the "wow" moment.
2. **Real Supabase production setup** — move off demo mode, real user accounts, real data persistence.
3. **Business CRM view** — customer list with visit history, punch counts, last seen date. Not just aggregate stats.
4. **Multi-location architecture** — businesses own locations, each location has its own NFC tag and punch feed, but owner sees all under one login.
5. **Phone number auth** — lower friction than email for customers. SMS OTP via Twilio or Supabase Auth.
6. **Billing integration** — Stripe subscriptions, per-location pricing, trial period logic.

#### Medium priority (V1 polish)

7. **Business onboarding flow** — streamlined 3-step: create account → configure punch card → we ship/install stand.
8. **Owner mobile-friendly dashboard** — owners check stats from their phone. Must be responsive.
9. **Punch validation** — prevent customers from tapping 10 times in a row. Rate limiting per customer per location per day.
10. **Prize redemption flow** — staff-side redemption confirmation (owner or staff marks reward as redeemed).

#### Later

11. Geo-fence push notifications (requires PWA service worker + permission flow)
12. Customer re-engagement campaigns
13. CSV export

---

## Key Metrics to Track

- **Businesses acquired** (target: 10 in 90 days)
- **Monthly churn rate** (target: <5%/month)
- **Punches per business per week** (proxy for customer engagement)
- **Wallet card adoption rate** (% of customers who add to wallet)
- **Customer return rate** (customers who punch 2+ times in 30 days)

---

## Open Questions

- What name goes on the NFC stand? "TapRanked" or a generic "Tap for Rewards"?
- Pricing: should setup fee be waived for first 3 businesses to reduce friction?

**Resolved:**
- Leaderboard: pulled from MVP, revisit post-launch
- Apple Developer account: owner will purchase ($99/year, required for .pkpass wallet cards)
- Stand hardware: small acrylic/wood stand with NFC sticker embedded — owner sources and assembles

---

## Immediate Next Steps

1. Set up production Supabase project (get off demo mode)
2. Build wallet card generation (Apple + Google Wallet)
3. Build real business CRM customer list view
4. Create the leave-behind one-pager for in-person sales
5. Set up Stripe billing
6. Walk into the first coffee shop
