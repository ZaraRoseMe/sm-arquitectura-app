// src/app/dashboard/projects/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProjectsClient from '@/components/projects/ProjectsClient'

export default async function ProjectsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        include: { user: true },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  })

  return (
    <ProjectsClient
      projects={projects as any}
      users={users as any}
      isAdmin={session.user.role === 'ADMIN'}
    />
  )
}
