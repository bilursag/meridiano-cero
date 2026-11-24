// The brand manual's safe alphabet: no 0/O or 1/I/L, so a code read out loud can't be misheard.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Random access code from the safe alphabet. */
export function generateAccessCode(length = 6): string {
  return Array.from({ length }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}

/** How an access code is stored: upper case, without spaces ("t3h a75" → "T3HA75"). */
export function normalizeAccessCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase()
}

/**
 * The codes to look up for what someone typed: as typed, then without spaces. The app shows codes
 * in groups ("T3H A75") and sends them that way, but an older code an admin saved with a space in
 * it must still match as typed.
 */
export function accessCodeCandidates(input: string): string[] {
  const typed = input.trim().toUpperCase()
  const compact = normalizeAccessCode(typed)
  return compact === typed ? [typed] : [typed, compact]
}
