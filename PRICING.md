# Pricing Model

## Credit System

All script generation uses credits:
- **Standard Quality** (Claude Haiku): 1 credit per script
- **Premium Quality** (Claude Sonnet): 5 credits per script

---

## Plans

### Free Plan
- **Price**: $0
- **Credits**: 20 credits/month (refreshed on 1st of each month)
- **Features**:
  - Standard & Premium quality generation
  - All script angles
  - All platforms (TikTok, Reels, Shorts, Universal)
  - Basic export (PDF)

### Pro Plan
- **Price**: $12/month
- **Credits**: 200 credits/month (refreshed on billing date)
- **Features**:
  - Everything in Free
  - Priority generation queue
  - Credit pack purchases
  - CSV export
  - (Future) Team collaboration

---

## Credit Packs (Pro Plan Only)

One-time purchases for additional credits:

| Pack | Credits | Price | $/Credit |
|------|---------|-------|----------|
| Starter | 100 | $8 | $0.080 |
| Growth | 250 | $18 | $0.072 |
| Agency | 500 | $30 | $0.060 |

---

## Cost Analysis

### Our Costs (OpenRouter)
- Standard (Haiku): ~$0.01/script
- Premium (Sonnet): ~$0.08/script

### Margin Analysis

**Free Tier (20 credits/month)**
- Worst case (4 premium): $0.32/user/month
- Typical (all standard): $0.20/user/month

**Pro Tier (200 credits/month @ $12)**
- Worst case (40 premium): $3.20 cost → 73% margin
- Typical (80/20 mix): $2.24 cost → 81% margin
- Light (all standard): $2.00 cost → 83% margin

**Credit Packs**
- 100 for $8: 75-87% margin
- 250 for $18: 78-86% margin
- 500 for $30: 73-83% margin

---

## Implementation Notes

### Monthly Credit Refresh
- Free users: Credits reset to 20 on 1st of each month
- Pro users: Credits reset to 200 on billing anniversary date
- Unused credits do NOT roll over

### Credit Pack Behavior
- Pack credits are added to current balance
- Pack credits do NOT expire
- Only available to Pro subscribers

### Upgrade/Downgrade
- Upgrade: Immediate access, prorated billing
- Downgrade: Access until end of billing period
- Cancel: Reverts to Free plan with 20 credits/month
