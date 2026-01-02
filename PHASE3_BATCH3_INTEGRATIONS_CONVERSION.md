# Phase 3 Batch 3: Integrations Page Conversion

**Route:** `/integrations`  
**Posture:** Configuration  
**Date:** 2025-01-27

---

## Posture Determination

The integrations page is a **configuration surface** for:
- Setting up third-party integrations (Stripe, OpenPhone, Google Calendar, Database)
- Managing credentials and API keys
- Testing connections
- Viewing setup instructions

This is clearly **Configuration posture** - setup and rules management.

---

## Changes Applied

### AppShell
- Added `physiology="configuration"`

### State Tokens
- Added `depth="elevated"` to all Cards:
  - Success banner
  - Stripe Product IDs Reference Card
  - Integration Cards (one per integration)
  - Credential Cards (nested within integration Cards)
  - Webhook URL Cards
  - Quick Links Card
- Added `depth="critical"` to error Card (load failures, save failures)
- Added `energy="active"` to "Test Connection" button (primary action per integration)

### Component Updates
- All Cards now use explicit depth tokens
- Primary action buttons (Test Connection) use active energy
- Error states use critical depth for heightened visibility

---

## Verification

- ✅ Typecheck passes
- ✅ All Cards have depth tokens
- ✅ Primary actions have active energy
- ✅ Error states use critical depth
- ✅ Configuration posture correctly applied

---

## Notes

- Each integration has its own "Test Connection" button as the primary action
- Credentials are nested within integration Cards (elevated depth)
- Webhook URLs are displayed in elevated Cards with primary background color
- Quick Links section uses elevated Card for consistency

