// src/app/dashboard/tasks/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TasksClient from '@/components/tasks/TasksClient'

export default async function TasksPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: { project: true, user: true, pauseLogs: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, color: true } })
      : Promise.resolve([]),
  ])

  return (
    <TasksClient
      tasks={tasks as any}
      projects={projects as any}
      users={users as any}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      currentUserName={session.user.name || ''}
    />
  )
}
