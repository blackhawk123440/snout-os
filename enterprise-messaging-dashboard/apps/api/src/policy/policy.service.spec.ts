import { describe, it, expect, vi } from 'vitest';
import { PolicyService } from './policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('PolicyService', () => {
  const prisma = {} as PrismaService;
  const audit = {} as AuditService;
  const service = new PolicyService(prisma, audit);

  it('should detect phone numbers', () => {
    const violations = service.detectViolations('Call me at 555-123-4567');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.type === 'phone')).toBe(true);
  });

  it('should detect email addresses', () => {
    const violations = service.detectViolations('Email me at test@example.com');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.type === 'email')).toBe(true);
  });

  it('should detect URLs', () => {
    const violations = service.detectViolations('Visit https://example.com');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.type === 'url')).toBe(true);
  });

  it('should handle obfuscated phone numbers', () => {
    const violations = service.detectViolations('Call 555 123 4567');
    expect(violations.length).toBeGreaterThan(0);
  });
});
