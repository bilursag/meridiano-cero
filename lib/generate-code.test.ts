import { describe, expect, it } from 'vitest'
import { accessCodeCandidates, generateAccessCode, normalizeAccessCode } from './generate-code'

describe('generateAccessCode', () => {
  it('defaults to 6 characters', () => {
    expect(generateAccessCode()).toHaveLength(6)
  })

  it('honors a custom length', () => {
    expect(generateAccessCode(10)).toHaveLength(10)
  })

  it('never includes visually ambiguous characters (0, O, 1, I, L)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode(20)
      expect(code).not.toMatch(/[IOL01]/)
    }
  })

  it('only uses uppercase letters and digits', () => {
    const code = generateAccessCode(50)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('produces different codes across calls (not a fixed sequence)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateAccessCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('normalizeAccessCode', () => {
  it('uppercases and drops spaces', () => {
    expect(normalizeAccessCode(' t3h a75 ')).toBe('T3HA75')
  })

  it('keeps hyphens of codes typed by hand', () => {
    expect(normalizeAccessCode('bar-2026')).toBe('BAR-2026')
  })
})

describe('accessCodeCandidates', () => {
  it('tries the grouped code as typed, then without the space', () => {
    expect(accessCodeCandidates('t3h a75')).toEqual(['T3H A75', 'T3HA75'])
  })

  it('tries a code without spaces once', () => {
    expect(accessCodeCandidates(' bar-2026 ')).toEqual(['BAR-2026'])
  })
})
