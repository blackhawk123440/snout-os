import { describe, it, expect } from 'vitest';
import { PolicyService } from './policy.service';

describe('PolicyService', () => {
  const service = new PolicyService();

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
