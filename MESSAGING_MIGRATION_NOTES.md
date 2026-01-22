# Messaging Schema Migration Notes

## Current Status

The messaging models (`MessageThread`, `MessageNumber`, `AssignmentWindow`, `AntiPoachingAttempt`, etc.) were added to the Prisma schema during Phase 1-4 implementation.

## Migration Strategy

**Development**: Schema changes were applied using `prisma db push` during development.

**Staging/Production**: For staging and production deployments, you have two options:

### Option 1: Generate Migration (Recommended)

If you need proper migration history:

```bash
# Create a migration for messaging models
npx prisma migrate dev --name add_messaging_models

# This will create a new migration in prisma/migrations/
```

### Option 2: Use db push (Quick Deploy)

For initial staging setup, you can use:

```bash
# In your build command or deployment script
npx prisma db push --skip-generate
```

**Note**: `db push` does not create migration files, so this is only recommended for:
- Initial staging setup
- When you need to sync schema quickly
- When migration history is not critical

## Schema Verification

To verify messaging models are in your database:

```bash
# Check schema matches
npx prisma db pull

# Or use Prisma Studio
npx prisma studio
```

## Models Added

The following models were added to support messaging:

- `MessageAccount` - Organization-level messaging account
- `MessageNumber` - Phone numbers (front desk, sitter masked, pool)
- `MessageThread` - Conversation threads
- `MessageParticipant` - Participants in threads
- `MessageEvent` - Individual messages (inbound/outbound)
- `ThreadAssignmentAudit` - Assignment history
- `AssignmentWindow` - Time windows for sitter messaging
- `AntiPoachingAttempt` - Anti-poaching violation records
- `SitterMaskedNumber` - Sitter-specific number assignments
- `OptOutState` - Client opt-out tracking
- `ResponseRecord` - Auto-response tracking

## Next Steps

1. **For Staging**: Use `prisma db push` in build command OR generate migration
2. **For Production**: Generate proper migration and deploy with `prisma migrate deploy`
3. **Verify**: Run `npm run proof:phase1-4` after migration to verify data integrity

## References

- See `GATE_2_SETUP_GUIDE.md` for Twilio setup
- See `ROLLOUT_PHASE_1.md` for deployment steps
- See `PHASE_1_4_ACCEPTANCE.md` for migration acceptance criteria
