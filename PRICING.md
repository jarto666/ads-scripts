# Pricing Model

Last updated: January 28, 2026

## Credit System

All script generation uses credits:
- **Standard Quality** (Claude 3.5 Haiku): 1 credit per script
- **Premium Quality** (Claude Sonnet 4.5): 5 credits per script

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
- **Credits**: 500 credits/month (refreshed on billing date)
- **Features**:
  - Everything in Free
  - URL import with AI analysis
  - AI-generated persona suggestions
  - Priority generation queue
  - Credit pack purchases
  - CSV export
  - (Future) Team collaboration

---

## Credit Packs (Pro Plan Only)

One-time purchases for additional credits:

| Pack | Credits | Price | $/Credit |
|------|---------|-------|----------|
| Boost | 500 | $18 | $0.036 |
| Campaign | 1,000 | $30 | $0.030 |
| Agency | 2,500 | $60 | $0.024 |

---

## Model Configuration

| Tier | Model | OpenRouter ID |
|------|-------|---------------|
| Standard | Claude 3.5 Haiku | `anthropic/claude-3.5-haiku` |
| Premium | Claude Sonnet 4.5 | `anthropic/claude-sonnet-4.5` |
| URL Analysis | Claude 3.5 Haiku | `anthropic/claude-3.5-haiku` |

### OpenRouter Pricing (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| Claude 3.5 Haiku | $0.80 | $4.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |

---

## Cost Analysis

### Per Script Costs (Actual Test Data - Jan 2026)

| Tier | Tokens (in/out) | Cost/Script |
|------|-----------------|-------------|
| Standard | ~1,500 / ~1,150 | **$0.0045** |
| Premium | ~1,500 / ~1,650 | **$0.025** |

### URL Analysis Cost

| Step | Model | Cost |
|------|-------|------|
| Extraction | Haiku 3.5 | ~$0.007 |
| AI Analysis | Haiku 3.5 | ~$0.006 |
| **Total** | | **~$0.013** |

---

## Margin Analysis

### Pro Tier (500 credits/month @ $12)

| Usage Pattern | Scripts | Our Cost | Margin |
|---------------|---------|----------|--------|
| All Standard | 500 | $2.25 | **81%** |
| All Premium | 100 | $2.50 | **79%** |
| Mixed (300 std + 40 prem) | 340 | $2.35 | **80%** |

### Free Tier (20 credits/month)

| Usage | Scripts | Our Cost |
|-------|---------|----------|
| All Standard | 20 | $0.09 |
| All Premium | 4 | $0.10 |

### Credit Pack Margins

| Pack | Revenue | Max Cost | Min Margin |
|------|---------|----------|------------|
| Boost (500) | $18 | $2.50 | **86%** |
| Campaign (1,000) | $30 | $5.00 | **83%** |
| Agency (2,500) | $60 | $12.50 | **79%** |

---

## Usage Capacity

### With 500 Pro Credits

| Quality | Scripts/Month | Scripts/Week |
|---------|---------------|--------------|
| Standard only | 500 | 125 |
| Premium only | 100 | 25 |
| Mixed (equal spend) | 166 std + 33 prem | ~50 |

---

## Implementation Notes

### Monthly Credit Refresh
- Free users: Credits reset to 20 on 1st of each month
- Pro users: Credits reset to 500 on billing anniversary date
- Unused credits do NOT roll over

### Credit Pack Behavior
- Pack credits are added to current balance
- Pack credits do NOT expire
- Only available to Pro subscribers

### Upgrade/Downgrade
- Upgrade: Immediate access, prorated billing
- Downgrade: Access until end of billing period
- Cancel: Reverts to Free plan with 20 credits/month

---

## Model Selection Rationale

### Standard Tier: Claude 3.5 Haiku
- Cheapest option at $0.0045/script
- Fast generation (~40s total)
- Punchy, TikTok-appropriate tone
- Sufficient quality for most use cases

### Premium Tier: Claude Sonnet 4.5
- 50% cheaper than Sonnet 3.5 ($0.025 vs $0.05)
- Better quality output (more detailed storyboards)
- More natural, polished tone
- Worth the 5x credit premium for important campaigns

### URL Analysis: Claude 3.5 Haiku
- Extraction doesn't require frontier reasoning
- Cost-effective at ~$0.013/import
- Good enough for structured data extraction
