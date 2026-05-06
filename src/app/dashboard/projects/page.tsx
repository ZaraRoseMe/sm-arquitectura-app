// src/app/dashboard/projects/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProjectsClient from '@/components/projects/ProjectsClient'

export default async function ProjectsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'

  // Colaboradores no tienen acceso a proyectos
  if (role === 'COLABORADOR') redirect('/dashboard')

  const [projects, users] = await Promise.all([
    isCoordinador
      ? prisma.project.findMany({
          where: { team: { coordinatorId: session.user.id } },
          include: {
            tasks: { include: { user: true } },
            _count: { select: { tasks: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : prisma.project.findMany({
          include: {
            tasks: { include: { user: true } },
            _count: { select: { tasks: true } },
            team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),

    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    }),
  ])

  return (
    <ProjectsClient
      projects={projects as any}
      users={users as any}
      isAdmin={isAdmin}
      isCoordinador={isCoordinador}
    />
  )
}
