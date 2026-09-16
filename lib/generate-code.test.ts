import { describe, expect, it } from 'vitest'
import { generateAccessCode } from './generate-code'

describe('generateAccessCode', () => {
  it('defaults to 6 characters', () => {
    expect(generateAccessCode()).toHaveLength(6)
  })

  it('honors a custom length', () => {
    expect(generateAccessCode(10)).toHaveLength(10)
  })

  it('never includes visually ambiguous characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode(20)
      expect(code).not.toMatch(/[IO01]/)
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
