// src/app/dashboard/timesheets/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TimesheetsClient from '@/components/time/TimesheetsClient'

export default async function TimesheetsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  const [entries, projects, users] = await Promise.all([
    prisma.timeEntry.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        task: { include: { project: true } },
        user: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } })
      : prisma.user.findMany({ where: { id: session.user.id }, select: { id: true, name: true, color: true } }),
  ])

  return (
    <TimesheetsClient
      entries={entries as any}
      projects={projects}
      users={users}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      currentUserColor={(session.user as any).color}
    />
  )
}
