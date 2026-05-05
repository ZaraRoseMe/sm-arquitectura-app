// src/app/dashboard/gantt/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import GanttClient from '@/components/gantt/GanttClient'

// Extract YYYY-MM-DD from a Date avoiding UTC offset issues
function toDateStr(date: Date): string {
  // Use UTC methods since dates are stored at 12:00 UTC — safe to extract UTC date
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

  // Pass dates as YYYY-MM-DD strings using UTC methods (dates stored at 12:00 UTC)
  const projects = projectsRaw.map(p => ({
    ...p,
    startDate: toDateStr(p.startDate),
    endDate: toDateStr(p.endDate),
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
