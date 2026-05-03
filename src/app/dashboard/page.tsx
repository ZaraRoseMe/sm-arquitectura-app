// src/app/dashboard/page.tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAfter } from 'date-fns'
import StatCard from '@/components/dashboard/StatCard'
import RecentTasks from '@/components/dashboard/RecentTasks'
import ProjectsList from '@/components/dashboard/ProjectsList'
import WorkloadChart from '@/components/dashboard/WorkloadChart'
import { FolderOpen, CheckSquare, AlertTriangle, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = session?.user.role === 'ADMIN'

  // Fetch data based on role
  const whereClause = isAdmin ? {} : { userId: session?.user.id }

  const [projects, tasks, users] = await Promise.all([
    prisma.project.findMany({
      include: {
        tasks: {
          where: isAdmin ? {} : { userId: session?.user.id },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
    prisma.task.findMany({
      where: whereClause,
      include: { project: true, user: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    isAdmin
      ? prisma.user.findMany({
          include: {
            tasks: { where: { status: { not: 'TERMINADO' } } },
            _count: { select: { tasks: true } },
          },
        })
      : Promise.resolve([]),
  ])

  // Calculate stats
  const allTasks = isAdmin
    ? await prisma.task.findMany()
    : tasks

  const tasksByStatus = {
    PENDIENTE: allTasks.filter((t) => t.status === 'PENDIENTE').length,
    EN_PROGRESO: allTasks.filter((t) => t.status === 'EN_PROGRESO').length,
    PAUSADO: allTasks.filter((t) => t.status === 'PAUSADO').length,
    TERMINADO: allTasks.filter((t) => t.status === 'TERMINADO').length,
  }

  const overdueTasks = allTasks.filter(
    (t) => t.status !== 'TERMINADO' && isAfter(new Date(), new Date(t.endDate))
  ).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Buenos días, {session?.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {isAdmin ? 'Vista general de todos los proyectos y equipo' : 'Aquí está el resumen de tus tareas'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Proyectos activos"
          value={projects.filter(p => isAfter(new Date(p.endDate), new Date())).length}
          total={projects.length}
          icon={FolderOpen}
          color="brand"
        />
        <StatCard
          label="En progreso"
          value={tasksByStatus.EN_PROGRESO}
          total={allTasks.length}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="Tareas retrasadas"
          value={overdueTasks}
          icon={AlertTriangle}
          color="red"
          alert={overdueTasks > 0}
        />
        <StatCard
          label="Completadas"
          value={tasksByStatus.TERMINADO}
          total={allTasks.length}
          icon={CheckSquare}
          color="green"
        />
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentTasks tasks={tasks} />
        </div>
        <div className="space-y-6">
          <ProjectsList projects={projects} />
          {isAdmin && users.length > 0 && (
            <WorkloadChart users={users} />
          )}
        </div>
      </div>
    </div>
  )
}
