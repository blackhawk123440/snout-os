# Tier System Refactor Progress

## Status: In Progress

### ✅ Completed

1. **Data Models Updated**
   - Added `SitterMetricsWindow` model for rolling aggregations
   - Updated `OfferEvent` with `expiresAt`, `source`, `status` fields
   - Updated `MessageResponseLink` with `responseSeconds` field
   - Updated `SitterTierHistory` with `tierName` and `assignedAt` fields

2. **Tier Engine Created**
   - Created `src/lib/tiers/tier-engine-twilio.ts`
   - Implements `computeTierForSitter()` function
   - Computes tiers from:
     - SMS response times (avg, median)
     - Response rate (responded threads / total requiring response)
     - Offer accept/decline/expire rates
   - Tier thresholds: Bronze, Silver, Gold, Platinum
   - Stores tier changes in `SitterTierHistory`

### 🔄 In Progress

3. **Remove Tier Content from Messages Tab**
   - SittersPanel verified - no tier content (clean inbox only)
   - Need to verify SitterGrowthTab is not used in Messages tab

4. **Add Tabs to Sitter Profile Page**
   - Need to add Dashboard, Tier, Messages tabs to `/sitters/[id]`
   - Currently single page - needs tab structure

5. **Tier Summary in Dashboard Tab**
   - Need to create TierSummaryCard component
   - Show current tier, key metrics, link to Tier tab

6. **Full Tier Tab**
   - Need to create TierTab component
   - Show tier history, metrics breakdown, improvement suggestions

### 📋 Remaining Tasks

- [ ] Verify Messages tab has no tier content
- [ ] Add tab structure to `/sitters/[id]/page.tsx`
- [ ] Create TierSummaryCard component
- [ ] Create TierTab component
- [ ] Implement Twilio webhook handlers for SMS commands (YES/NO)
- [ ] Update offer status when SMS commands received
- [ ] Trigger tier recomputation after offer responses
- [ ] Test end-to-end flow

## Files Modified

- `prisma/schema.prisma` - Added/updated models
- `src/lib/tiers/tier-engine-twilio.ts` - New tier engine

## Next Steps

1. Add tabs to sitter profile page
2. Create tier UI components
3. Implement SMS command handlers
4. Wire up tier recomputation triggers
