import { beforeEach, describe, expect, it, vi } from 'vitest'

const deleteUser = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn(async () => ({ users: { deleteUser } })) }))

// The transaction mock runs the callback against the same delegates and records whether it threw,
// standing in for Postgres rolling back.
const tx = {
  tripMembership: { deleteMany: vi.fn() },
  redeemAttempt: { deleteMany: vi.fn() },
  adminUser: { deleteMany: vi.fn() },
}
let committed = false
vi.mock('@/lib/db', () => ({
  prisma: {
    adminUser: { findUnique: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
      await callback(tx)
      committed = true
    }),
  },
}))

const { prisma } = await import('@/lib/db')
const { deleteAccount } = await import('./account-deletion')
const findAdmin = vi.mocked(prisma.adminUser.findUnique)
const countAdmins = vi.mocked(prisma.adminUser.count)

beforeEach(() => {
  committed = false
  vi.mocked(prisma.$transaction).mockClear()
  deleteUser.mockReset().mockResolvedValue({})
  findAdmin.mockReset().mockResolvedValue(null)
  countAdmins.mockReset().mockResolvedValue(2)
  for (const delegate of Object.values(tx)) delegate.deleteMany.mockReset().mockResolvedValue({ count: 0 })
})

describe('deleteAccount', () => {
  it("deletes the person's memberships, redeem attempts and admin access, then the Clerk user", async () => {
    await deleteAccount('user_1')

    expect(tx.tripMembership.deleteMany).toHaveBeenCalledWith({ where: { clerkUserId: 'user_1' } })
    expect(tx.redeemAttempt.deleteMany).toHaveBeenCalledWith({ where: { clerkUserId: 'user_1' } })
    expect(tx.adminUser.deleteMany).toHaveBeenCalledWith({ where: { clerkUserId: 'user_1' } })
    expect(deleteUser).toHaveBeenCalledWith('user_1')
    expect(committed).toBe(true)
  })

  it('rolls the rows back when Clerk fails, so the person can try again', async () => {
    deleteUser.mockRejectedValue(Object.assign(new Error('Clerk is down'), { status: 503 }))

    await expect(deleteAccount('user_1')).rejects.toThrow('Clerk is down')
    expect(committed).toBe(false)
  })

  it('finishes when the Clerk user is already gone (a retry)', async () => {
    deleteUser.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }))

    await expect(deleteAccount('user_1')).resolves.toBeUndefined()
    expect(committed).toBe(true)
  })

  it('refuses to delete the last admin, touching nothing', async () => {
    findAdmin.mockResolvedValue({ clerkUserId: 'user_1' } as never)
    countAdmins.mockResolvedValue(1)

    await expect(deleteAccount('user_1')).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('lets an admin delete their account when another admin remains', async () => {
    findAdmin.mockResolvedValue({ clerkUserId: 'user_1' } as never)

    await deleteAccount('user_1')

    expect(tx.adminUser.deleteMany).toHaveBeenCalled()
    expect(deleteUser).toHaveBeenCalledWith('user_1')
  })
})
