import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Defaults to .env (development). Run with ENV_FILE=.env.prod to target production.
// Import it before @prisma/client: Prisma loads .env on import and process.loadEnvFile never overrides a
// variable that is already set, so a production run used to reach the development database and Clerk.
export const envFile = process.env.ENV_FILE ?? '.env'
Object.assign(process.env, parseEnv(readFileSync(envFile, 'utf8')))

let dbUrl: URL | null = null
try {
  dbUrl = new URL(process.env.DATABASE_URL ?? '')
} catch {}
// `vercel env pull` writes sensitive variables (DATABASE_URL, DIRECT_URL) as empty placeholders.
if (!dbUrl?.host) {
  console.error(`DATABASE_URL in ${envFile} is not a database URL. Paste it from Neon (Vercel does not export sensitive values).`)
  process.exit(1)
}

const clerkInstance = process.env.CLERK_SECRET_KEY?.startsWith('sk_live_') ? 'production' : 'development'
console.log(`Using ${envFile} → database ${dbUrl.host}, Clerk ${clerkInstance}`)
