// src/app/dashboard/layout.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const userRole = session.user.role as string
  const userName = session.user.name as string
  const userEmail = session.user.email as string

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-neutral-950 overflow-hidden">
      <Sidebar role={userRole} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userName={userName} userEmail={userEmail} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
