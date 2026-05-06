// src/app/dashboard/timesheets/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TimesheetsClient from '@/components/time/TimesheetsClient'

export default async function TimesheetsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  const [entries, workPlans, projects, users, tasks, myTasks] = await Promise.all([
    prisma.timeEntry.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        task: { include: { project: true } },
        user: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.workPlan.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        task: { include: { project: true } },
        user: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } })
      : prisma.user.findMany({ where: { id: session.user.id }, select: { id: true, name: true, color: true } }),
    isAdmin
      ? prisma.task.findMany({ include: { project: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
    // Tareas asignadas al usuario actual (para la vista semanal de registro)
    prisma.task.findMany({
      where: { userId: session.user.id },
      include: { project: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <TimesheetsClient
      entries={entries as any}
      workPlans={workPlans as any}
      projects={projects}
      users={users}
      tasks={tasks as any}
      myTasks={myTasks as any}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      currentUserColor={(session.user as any).color}
    />
  )
}
