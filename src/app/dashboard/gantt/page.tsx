// src/app/dashboard/gantt/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import GanttClient from '@/components/gantt/GanttClient'

function toDateStr(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function GanttPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'

  // Miembros del equipo del coordinador
  let teamMemberIds: string[] = []
  if (isCoordinador) {
    const team = await prisma.team.findUnique({
      where: { coordinatorId: session.user.id },
      include: { members: { select: { userId: true } } },
    })
    teamMemberIds = team?.members.map(m => m.userId) || []
  }

  const [tasks, users, projectsRaw] = await Promise.all([
    prisma.task.findMany({
      where: isAdmin
        ? {}
        : isCoordinador
          ? { userId: { in: [session.user.id, ...teamMemberIds] } }
          : { userId: session.user.id },
      include: { project: true, user: true },
      orderBy: [{ userId: 'asc' }, { startDate: 'asc' }],
    }),

    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true, color: true } })
      : isCoordinador
        ? prisma.user.findMany({
            where: { id: { in: [session.user.id, ...teamMemberIds] } },
            select: { id: true, name: true, color: true },
          })
        : Promise.resolve([{ id: session.user.id, name: session.user.name || '', color: (session.user as any).color }]),

    isCoordinador
      ? prisma.project.findMany({
          where: { team: { coordinatorId: session.user.id } },
          select: { id: true, name: true, color: true, startDate: true, endDate: true },
        })
      : prisma.project.findMany({
          select: { id: true, name: true, color: true, startDate: true, endDate: true },
        }),
  ])

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
      isAdmin={isAdmin || isCoordinador}
    />
  )
}
