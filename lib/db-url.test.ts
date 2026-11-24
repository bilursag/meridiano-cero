import { describe, expect, it } from 'vitest'
import { withConnectTimeout } from './db-url'

describe('withConnectTimeout', () => {
  it('adds the timeout after the existing parameters', () => {
    expect(withConnectTimeout('postgresql://u:p@host/db?sslmode=require&channel_binding=require')).toBe(
      'postgresql://u:p@host/db?sslmode=require&channel_binding=require&connect_timeout=15'
    )
  })

  it('starts the query string when there is none', () => {
    expect(withConnectTimeout('postgresql://u:p@host/db')).toBe('postgresql://u:p@host/db?connect_timeout=15')
  })

  it('keeps a timeout the URL already sets', () => {
    const url = 'postgresql://u:p@host/db?connect_timeout=30&sslmode=require'
    expect(withConnectTimeout(url)).toBe(url)
  })

  it('leaves a missing URL to Prisma', () => {
    expect(withConnectTimeout(undefined)).toBeUndefined()
  })
})
