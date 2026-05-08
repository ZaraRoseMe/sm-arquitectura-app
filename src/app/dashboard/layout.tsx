// src/app/dashboard/layout.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import NotificationPoller from '@/components/layout/NotificationPoller'
import ChatPanel from '@/components/chat/ChatPanel'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const userRole = session.user.role as string
  const userName = session.user.name as string
  const userEmail = session.user.email as string
  const userColor = (session.user as any).color as string
  const currentUserId = session.user.id as string

  const [users, team] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
    userRole === 'COORDINADOR'
      ? prisma.team.findUnique({
          where: { coordinatorId: currentUserId },
          include: {
            coordinator: { select: { id: true, name: true, color: true } },
            members: { include: { user: { select: { id: true, name: true, color: true } } } },
          },
        })
      // COLABORADOR y REPORTES: buscar si pertenecen a algún equipo (para chat grupal)
      : prisma.team.findFirst({
          where: { members: { some: { userId: currentUserId } } },
          include: {
            coordinator: { select: { id: true, name: true, color: true } },
            members: { include: { user: { select: { id: true, name: true, color: true } } } },
          },
        }),
  ])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-neutral-950 overflow-hidden">
      <Sidebar role={userRole} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          userColor={userColor}
          currentUserId={currentUserId}
          users={users}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <NotificationPoller />
      <ChatPanel
        currentUserId={currentUserId}
        users={users}
        team={team as any}
        userRole={userRole}
      />
    </div>
  )
}
