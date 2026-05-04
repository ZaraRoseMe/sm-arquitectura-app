// src/app/dashboard/gantt/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import GanttClient from '@/components/gantt/GanttClient'

export default async function GanttPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  const [tasks, users, projectsRaw] = await Promise.all([
    prisma.task.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: { project: true, user: true },
      orderBy: [{ userId: 'asc' }, { startDate: 'asc' }],
    }),
    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true, color: true } })
      : Promise.resolve([{ id: session.user.id, name: session.user.name || '', color: (session.user as any).color }]),
    prisma.project.findMany({
      select: { id: true, name: true, color: true, startDate: true, endDate: true },
    }),
  ])

  // Pass dates as YYYY-MM-DD strings to avoid UTC serialization issues
  const projects = projectsRaw.map(p => ({
    ...p,
    startDate: format(p.startDate, 'yyyy-MM-dd'),
    endDate: format(p.endDate, 'yyyy-MM-dd'),
  }))

  return (
    <GanttClient
      tasks={tasks as any}
      users={users}
      projects={projects as any}
      isAdmin={isAdmin}
    />
  )
}
