import {
  generateRefreshToken,
  hashToken,
  parseDurationToSeconds,
} from './token.util';

describe('token.util', () => {
  describe('generateRefreshToken', () => {
    it('produces a high-entropy, unique value each call', () => {
      const a = generateRefreshToken();
      const b = generateRefreshToken();
      expect(a).not.toEqual(b);
      expect(a.length).toBeGreaterThan(40);
    });
  });

  describe('hashToken', () => {
    it('is deterministic', () => {
      expect(hashToken('same-value')).toBe(hashToken('same-value'));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashToken('a')).not.toBe(hashToken('b'));
    });
  });

  describe('parseDurationToSeconds', () => {
    it.each([
      ['15m', 900],
      ['900s', 900],
      ['1h', 3600],
      ['7d', 604800],
    ])('parses %s to %d seconds', (input, expected) => {
      expect(parseDurationToSeconds(input)).toBe(expected);
    });

    it('throws on an invalid duration string', () => {
      expect(() => parseDurationToSeconds('not-a-duration')).toThrow();
    });
  });
});
