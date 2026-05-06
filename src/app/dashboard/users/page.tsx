// src/app/dashboard/users/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/users/UsersClient'

export default async function UsersPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      include: {
        tasks: {
          where: { status: { not: 'TERMINADO' } },
          include: { project: true },
        },
        _count: { select: { tasks: true } },
        ledTeam: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, color: true, username: true } },
              },
            },
          },
        },
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true, name: true,
                coordinator: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.team.findMany({
      include: {
        coordinator: { select: { id: true, name: true, color: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, color: true, username: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <UsersClient
      users={users as any}
      teams={teams as any}
      currentUserId={session.user.id}
    />
  )
}
