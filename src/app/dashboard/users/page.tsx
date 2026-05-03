// src/app/dashboard/users/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/users/UsersClient'

export default async function UsersPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    include: {
      tasks: {
        where: { status: { not: 'TERMINADO' } },
        include: { project: true },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return <UsersClient users={users as any} currentUserId={session.user.id} />
}
