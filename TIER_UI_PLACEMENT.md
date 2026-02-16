# Tier (SRS) System UI Placement - Architecture Summary

## Where Tiers Live

**Owner-facing tier management:**
- **Location:** `/messages?tab=sitters&subtab=growth`
- **Component:** `SitterGrowthTab` (rendered inside `SittersPanel`)
- **Purpose:** Owner control plane for viewing all sitters' SRS scores, tiers, breakdowns, and managing tier progression
- **Access:** Owner-only, inside Messaging domain

**Sitter-facing tier display:**
- **Location:** `/sitter` (sitter's own dashboard)
- **Component:** `SitterSRSCard` (single card module)
- **Purpose:** Sitter sees their own tier, SRS score, provisional status, next actions, and perks
- **Access:** Sitter-only, self-scoped (cannot see other sitters)

## Where Sitters See Them

**Route:** `/sitter`

**Component:** `SitterSRSCard`

**Displays:**
- Tier badge (Foundation/Reliant/Trusted/Preferred)
- Service Reliability Score (0-100)
- Provisional indicator (if <15 visits in 30 days)
- At-risk status and reason (if applicable)
- Category breakdown (responsiveness, acceptance, completion, timeliness, accuracy, engagement, conduct)
- Next actions list
- Perks unlocked
- Current pay and next review date

**API:** `GET /api/sitter/me/srs` (sitter-scoped, returns only their own data)

## Where Owners Manage Them

**Route:** `/messages?tab=sitters&subtab=growth`

**Component:** `SitterGrowthTab` (inside `SittersPanel`)

**Displays:**
- Table of all sitters with:
  - Sitter name
  - Current tier badge
  - SRS 30-day score
  - Provisional status
  - At-risk status
  - Last evaluated date
- Drilldown drawer showing:
  - 30-day and 26-week scores
  - Category breakdown with mini-bars
  - Sample sizes (visits, offers, response samples)
  - At-risk reason
  - Next actions
  - Exclusions and audit log links

**API:** 
- `GET /api/sitters/srs` (list all sitters' SRS)
- `GET /api/sitters/:id/srs` (detailed SRS for specific sitter)

## Architecture Rules

1. **Messaging owns tier data and signals:**
   - Tier calculations driven by messaging responsiveness, assignment windows, visit events, offers
   - All tier APIs and background jobs remain in place
   - No architectural separation from Messaging domain

2. **No duplicate tier views:**
   - Removed `SitterDashboardTab` (was unused)
   - `/sitters/:id` remains admin profile only (shows tier badge for reference, not growth dashboard)
   - No tier tabs in sitter dashboards (replaced with single card)

3. **No new top-level navigation:**
   - All tier UI lives inside existing Messaging structure
   - Growth is a subtab within Sitters panel
   - Sitter tier display is a card within their dashboard

4. **Scoping:**
   - Owners see all sitters' tiers in Growth tab
   - Sitters see only their own tier in `/sitter` dashboard
   - No cross-sitter visibility for sitters

## File Structure

**Owner Growth UI:**
- `src/components/messaging/SittersPanel.tsx` - Contains Directory and Growth subtabs
- `src/components/sitter/SitterGrowthTab.tsx` - Growth table and drilldown

**Sitter Tier Display:**
- `src/app/sitter/page.tsx` - Sitter dashboard with SitterSRSCard
- `src/components/sitter/SitterSRSCard.tsx` - Single card showing tier, score, next actions

**Owner Admin Profile:**
- `src/app/sitters/[id]/page.tsx` - Admin profile view (shows tier badge only, no growth UI)

**Backend (unchanged):**
- All SRS APIs, models, queues, background jobs remain in place
- No backend changes required for UI placement
