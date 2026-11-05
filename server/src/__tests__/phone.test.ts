import { describe, expect, it } from 'vitest';
import { normalizePhone, isLikelyExtension } from '@cerdik-crm/shared';

describe('normalizePhone', () => {
  it('normalizes a local MY landline with a trunk prefix to E.164', () => {
    expect(normalizePhone('03-87654321')).toBe('+60387654321');
  });

  it('normalizes a local MY mobile number', () => {
    expect(normalizePhone('012-3456789')).toBe('+60123456789');
  });

  it('passes through a number already in E.164 form', () => {
    expect(normalizePhone('+60387654321')).toBe('+60387654321');
  });

  it('handles spaces and parentheses', () => {
    expect(normalizePhone('(03) 8765 4321')).toBe('+60387654321');
  });

  it('returns null for a bare PBX extension', () => {
    expect(normalizePhone('204')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(normalizePhone('not a number')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(normalizePhone('')).toBeNull();
  });
});

describe('isLikelyExtension', () => {
  it('treats short digit-only strings as extensions', () => {
    expect(isLikelyExtension('204')).toBe(true);
    expect(isLikelyExtension('100')).toBe(true);
  });

  it('does not treat a full phone number as an extension', () => {
    expect(isLikelyExtension('0387654321')).toBe(false);
  });

  it('does not treat non-digit strings as extensions', () => {
    expect(isLikelyExtension('abc')).toBe(false);
  });
});
