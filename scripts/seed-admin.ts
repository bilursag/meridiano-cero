import './load-env'
import { createClerkClient } from '@clerk/backend'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: [ENV_FILE=.env.prod] npx tsx scripts/seed-admin.ts <email>')
    process.exit(1)
  }

  const user = (await clerk.users.getUserList({ emailAddress: [email] })).data[0]
  if (!user) throw new Error(`No Clerk user found for ${email}`)

  await prisma.adminUser.upsert({
    where: { clerkUserId: user.id },
    update: {},
    create: { clerkUserId: user.id },
  })

  console.log(`Granted admin access to ${email} (${user.id})`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
