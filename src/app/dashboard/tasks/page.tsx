// src/app/dashboard/tasks/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TasksClient from '@/components/tasks/TasksClient'

export default async function TasksPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'
  const isColaborador = role === 'COLABORADOR'

  // Obtener equipo del coordinador si aplica
  let teamMemberIds: string[] = []
  if (isCoordinador) {
    const team = await prisma.team.findUnique({
      where: { coordinatorId: session.user.id },
      include: { members: { select: { userId: true } } },
    })
    teamMemberIds = team?.members.map(m => m.userId) || []
  }

  const [tasks, projects, users] = await Promise.all([
    // ADMIN: ve todas | COORDINADOR: sus colaboradores + él | COLABORADOR: solo las suyas
    prisma.task.findMany({
      where: isAdmin
        ? {}
        : isCoordinador
          ? { userId: { in: [session.user.id, ...teamMemberIds] } }
          : { userId: session.user.id },
      include: { project: true, user: true, pauseLogs: true },
      orderBy: { updatedAt: 'desc' },
    }),

    // Proyectos: COORDINADOR solo ve los de su equipo
    isCoordinador
      ? prisma.project.findMany({
          where: { team: { coordinatorId: session.user.id } },
          orderBy: { name: 'asc' },
        })
      : prisma.project.findMany({ orderBy: { name: 'asc' } }),

    // Usuarios para asignar tareas: ADMIN ve todos, COORDINADOR ve sus colaboradores
    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, color: true } })
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
      currentUserId={session.user.id}
      currentUserName={session.user.name || ''}
    />
  )
}
