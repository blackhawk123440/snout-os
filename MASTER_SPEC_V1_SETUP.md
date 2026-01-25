# Master Spec V1 Database Setup

## Quick Start

```bash
npm run setup:master-spec -- --orgId=default --frontDeskE164=+15551234567 --poolNumbers=+15559876543,+15559876544,+15559876545
```

## Usage

### Basic Setup
```bash
npx tsx scripts/setup-master-spec-v1.ts \
  --orgId=default \
  --frontDeskE164=+15551234567 \
  --poolNumbers=+15559876543,+15559876544,+15559876545
```

### Dry Run (Preview Changes)
```bash
npx tsx scripts/setup-master-spec-v1.ts \
  --orgId=default \
  --frontDeskE164=+15551234567 \
  --poolNumbers=+15559876543,+15559876544 \
  --dry-run
```

### With Pool Count Validation
```bash
npx tsx scripts/setup-master-spec-v1.ts \
  --orgId=default \
  --frontDeskE164=+15551234567 \
  --poolNumbers=+15559876543,+15559876544,+15559876545 \
  --poolCount=3
```

## Arguments

- `--orgId=<id>` - Organization ID (default: 'default')
- `--orgSlug=<slug>` - Organization slug (alternative to orgId)
- `--frontDeskE164=<number>` - **REQUIRED** Front desk phone number in E.164 format
- `--poolNumbers=<n1,n2,n3>` - Comma-separated list of pool numbers
- `--poolCount=<n>` - Expected count of pool numbers (must match poolNumbers length)
- `--provider=<name>` - Provider name (default: 'twilio')
- `--dry-run` - Preview changes without applying them

## What It Does

1. **Front Desk Number**: Ensures exactly one active front desk number exists
2. **Pool Numbers**: Creates/activates specified pool numbers
3. **Sitter Masked Numbers**: Allocates masked numbers to all active sitters

## For Staging

1. Get your Twilio numbers (front desk + pool numbers)
2. Run setup script:
   ```bash
   npm run setup:master-spec -- \
     --orgId=default \
     --frontDeskE164=<your-front-desk-number> \
     --poolNumbers=<pool1>,<pool2>,<pool3>
   ```
3. Verify in database:
   ```sql
   SELECT * FROM "MessageNumber" WHERE "orgId" = 'default' AND "status" = 'active';
   SELECT * FROM "SitterMaskedNumber" WHERE "orgId" = 'default' AND "status" = 'active';
   ```

## Idempotency

The script is idempotent - running it multiple times is safe:
- Existing numbers are not duplicated
- Inactive numbers are reactivated
- Missing numbers are created
