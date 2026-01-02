# Tab Posture Rule Clarification

**Date:** 2025-01-27
**Rule Added:** `TABS_ARE_CONTENT_ORGANIZATION: true`

---

## Rule Statement

Tabbed subviews may vary layout density and components, but they must not introduce posture switching behavior. AppShell physiology remains the single source of truth for motion cadence, energy semantics, and spatial discipline across the page. Tabs are content organization, not posture changes.

---

## Rationale

- **Single Posture Principle:** The system always communicates exactly one dominant posture at a time (SYSTEM_DNA_RULES.SINGLE_POSTURE)
- **Consistency:** Motion cadence, energy semantics, and spatial discipline must remain consistent across a page
- **Tabs as Organization:** Tabs organize content by category or view, not by system posture
- **AppShell Authority:** AppShell's `physiology` prop is the authoritative source for posture behavior

---

## Application

This rule applies to pages with tabs such as:
- `/sitter` (today, upcoming, completed, earnings, settings, tier tabs)
- `/sitter-dashboard` (pending, accepted, archived, tooLate, tier tabs)
- Any other page using tabs

**Correct Approach:**
- AppShell declares single dominant posture (e.g., `physiology="operational"`)
- All tabs respect this posture for motion, energy, and spatial rules
- Tabs can vary content layout and component density
- Comments can indicate subordinate content nature (e.g., "Analytical but subordinate via TabPanel")

**Incorrect Approach:**
- Switching posture per tab
- Changing motion cadence per tab
- Varying energy semantics per tab
- Breaking spatial discipline per tab

---

## Verification

- ✅ `/sitter`: Operational posture dominant, tabs are content organization
- ✅ `/sitter-dashboard`: Operational posture dominant, tabs are content organization

