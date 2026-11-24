/**
 * Neon suspends an idle database, and the first query has to wake it. That can take longer than
 * Prisma's 5 s default to connect, so the scheduled job that runs alone at night failed with
 * "Can't reach database server" (P1001). Give the connection 15 s unless the URL already sets it.
 */
export const CONNECT_TIMEOUT_SECONDS = 15

export function withConnectTimeout(url: string | undefined, seconds = CONNECT_TIMEOUT_SECONDS): string | undefined {
  if (!url || /[?&]connect_timeout=/.test(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}connect_timeout=${seconds}`
}
