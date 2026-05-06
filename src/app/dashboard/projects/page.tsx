// src/app/dashboard/projects/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProjectsClient from '@/components/projects/ProjectsClient'

const projectInclude: any = {
  tasks: { include: { user: true } },
  _count: { select: { tasks: true } },
  team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
  parent: { select: { id: true, name: true, color: true } },
  children: {
    orderBy: { name: 'asc' },
    include: {
      tasks: { include: { user: true } },
      _count: { select: { tasks: true } },
      team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
      parent: { select: { id: true, name: true, color: true } },
      children: {
        orderBy: { name: 'asc' },
        include: {
          tasks: { include: { user: true } },
          _count: { select: { tasks: true } },
          parent: { select: { id: true, name: true, color: true } },
          children: {
            orderBy: { name: 'asc' },
            include: {
              tasks: { include: { user: true } },
              _count: { select: { tasks: true } },
              parent: { select: { id: true, name: true, color: true } },
              children: {
                orderBy: { name: 'asc' },
                include: {
                  tasks: { include: { user: true } },
                  _count: { select: { tasks: true } },
                  parent: { select: { id: true, name: true, color: true } },
                  children: { include: { tasks: true, _count: { select: { tasks: true } } } },
                },
              },
            },
          },
        },
      },
    },
  },
}

export default async function ProjectsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'

  if (role === 'COLABORADOR') redirect('/dashboard')

  const [projects, users, teams] = await Promise.all([
    isCoordinador
      ? prisma.project.findMany({
          where: { parentId: null, team: { coordinatorId: session.user.id } },
          include: projectInclude,
          orderBy: { name: 'asc' },
        })
      : prisma.project.findMany({
          where: { parentId: null },
          include: projectInclude,
          orderBy: { name: 'asc' },
        }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    }),
    isAdmin
      ? prisma.team.findMany({
          include: { coordinator: { select: { id: true, name: true, color: true } } },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ])

  return (
    <ProjectsClient
      projects={projects as any}
      users={users as any}
      teams={teams as any}
      isAdmin={isAdmin}
      isCoordinador={isCoordinador}
    />
  )
}
