// src/app/dashboard/tasks/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TasksClient from '@/components/tasks/TasksClient'

// Include recursivo de children (igual que antes)
const childrenInclude: any = {
  orderBy: { name: 'asc' },
  include: {
    children: {
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
          include: {
            children: {
              orderBy: { name: 'asc' },
              include: { children: true },
            },
          },
        },
      },
    },
  },
}

export default async function TasksPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'
  const isColaborador = role === 'COLABORADOR'

  // Obtener todos los miembros del equipo del coordinador
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

  const [tasks, projects, users] = await Promise.all([
    // ADMIN: ve todas | COORDINADOR: todas las de sus colaboradores | COLABORADOR: solo las suyas
    prisma.task.findMany({
      where: isAdmin
        ? {}
        : isCoordinador
          ? { userId: { in: [session.user.id, ...teamMemberIds] } }
          : { userId: session.user.id },
      include: { project: true, user: true, pauseLogs: true },
      orderBy: { updatedAt: 'desc' },
    }),

    // Proyectos en árbol
    isCoordinador && teamId
      ? (async () => {
          // 1. Encontrar TODOS los proyectos que pertenecen al equipo (en cualquier nivel)
          const assignedProjects = await prisma.project.findMany({
            where: { teamId },
            select: { id: true, parentId: true },
          })

          // 2. Recolectar los IDs raíz: subir por parentId hasta llegar a parentId: null
          const assignedIds = assignedProjects.map(p => p.id)
          const rootIds = new Set<string>()

          for (const p of assignedProjects) {
            // Si ya es raíz, agregarlo directo
            if (!p.parentId) {
              rootIds.add(p.id)
              continue
            }
            // Subir hasta encontrar la raíz
            let current: { id: string; parentId: string | null } | null = p
            while (current?.parentId) {
              current = await prisma.project.findUnique({
                where: { id: current.parentId },
                select: { id: true, parentId: true },
              })
            }
            if (current) rootIds.add(current.id)
          }

          // Si no hay proyectos asignados, devolver vacío
          if (rootIds.size === 0) return []

          // 3. Traer esas raíces con children anidados
          return prisma.project.findMany({
            where: { id: { in: Array.from(rootIds) } },
            orderBy: { name: 'asc' },
            include: childrenInclude,
          })
        })()
      : prisma.project.findMany({
          where: { parentId: null },
          orderBy: { name: 'asc' },
          include: childrenInclude,
        }),

    // Usuarios para asignar tareas
    isAdmin
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
      currentUserId={session.user.id}
      currentUserName={session.user.name || ''}
    />
  )
}
