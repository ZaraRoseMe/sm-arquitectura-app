// src/app/dashboard/tasks/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TasksClient from '@/components/tasks/TasksClient'

const childrenInclude = {
  children: {
    orderBy: { name: 'asc' as const },
    include: {
      children: {
        orderBy: { name: 'asc' as const },
        include: {
          children: {
            orderBy: { name: 'asc' as const },
            include: {
              children: {
                orderBy: { name: 'asc' as const },
                include: { children: true },
              },
            },
          },
        },
      },
    },
  },
}

async function getCoordinadorProjects(teamId: string) {
  const assignedProjects = await prisma.project.findMany({
    where: { teamId },
    select: { id: true, parentId: true },
  })
  if (assignedProjects.length === 0) return []
  const rootIds = new Set<string>()
  for (const p of assignedProjects) {
    if (!p.parentId) { rootIds.add(p.id); continue }
    let current: { id: string; parentId: string | null } | null = p
    while (current?.parentId) {
      current = await prisma.project.findUnique({
        where: { id: current.parentId },
        select: { id: true, parentId: true },
      })
    }
    if (current) rootIds.add(current.id)
  }
  if (rootIds.size === 0) return []
  return prisma.project.findMany({
    where: { id: { in: Array.from(rootIds) } },
    orderBy: { name: 'asc' },
    include: childrenInclude,
  })
}

export default async function TasksPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'
  const isColaborador = role === 'COLABORADOR'
  const isReportes = role === 'REPORTES'

  let teamMemberIds: string[] = []
  let teamId: string | null = null

  if (isCoordinador) {
    const team = await prisma.team.findUnique({
      where: { coordinatorId: session.user.id },
      include: { members: { select: { userId: true } } },
    })
    teamMemberIds = team?.members.map(m => m.userId) || []
    teamId = team?.id || null
  }

  const projects = isCoordinador && teamId
    ? await getCoordinadorProjects(teamId)
    : await prisma.project.findMany({
        where: { parentId: null },
        orderBy: { name: 'asc' },
        include: childrenInclude,
      })

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where: isAdmin || isReportes
        ? {}
        : isCoordinador
          ? { userId: { in: [session.user.id, ...teamMemberIds] } }
          : { userId: session.user.id },
      include: { project: true, user: true, pauseLogs: true },
      orderBy: { updatedAt: 'desc' },
    }),
    isAdmin || isReportes
      ? prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true, color: true },
        })
      : isCoordinador
        ? prisma.user.findMany({
            where: { id: { in: teamMemberIds } },
            select: { id: true, name: true, email: true, role: true, color: true },
          })
        : Promise.resolve([]),
  ])

  return (
    <TasksClient
      tasks={tasks as any}
      projects={projects as any}
      users={users as any}
      isAdmin={isAdmin}
      isCoordinador={isCoordinador}
      isColaborador={isColaborador}
      isReportes={isReportes}
      currentUserId={session.user.id}
      currentUserName={session.user.name || ''}
    />
  )
}
