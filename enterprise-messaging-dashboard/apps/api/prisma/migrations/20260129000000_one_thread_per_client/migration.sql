-- Migration: One Thread Per Client Per Org
-- Enforces unique constraint: one thread per (orgId, clientId)
-- Removes per-booking thread creation logic

-- Add unique constraint on Thread(orgId, clientId)
-- This will fail if duplicate threads exist - must clean up first
DO $$ 
BEGIN
  -- Check for duplicates and log them
  IF EXISTS (
    SELECT orgId, clientId, COUNT(*) as cnt
    FROM "Thread"
    GROUP BY orgId, clientId
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'WARNING: Duplicate threads found. Please merge them before applying this constraint.';
    -- Log duplicates for manual cleanup
    CREATE TEMP TABLE IF NOT EXISTS duplicate_threads AS
    SELECT orgId, clientId, COUNT(*) as thread_count, array_agg(id) as thread_ids
    FROM "Thread"
    GROUP BY orgId, clientId
    HAVING COUNT(*) > 1;
  END IF;
END $$;

-- Add unique constraint (will fail if duplicates exist)
CREATE UNIQUE INDEX IF NOT EXISTS "Thread_orgId_clientId_key" ON "Thread"("orgId", "clientId");
