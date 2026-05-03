'use client'
// src/components/dashboard/WorkloadChart.tsx
import { getInitials } from '@/lib/utils'

interface WorkloadChartProps {
  users: {
    id: string
    name: string
    color?: string
    tasks: any[]
    _count: { tasks: number }
  }[]
}

export default function WorkloadChart({ users }: WorkloadChartProps) {
  const maxTasks = Math.max(...users.map((u) => u.tasks.length), 1)

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Carga de trabajo</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tareas activas por colaborador</p>
      </div>

      <div className="p-4 space-y-3">
        {users.map((user) => {
          const activeTasks = user.tasks.length
          const percentage = Math.round((activeTasks / maxTasks) * 100)
          const avatarColor = user.color || '#6366F1'
          const isOverloaded = activeTasks > 3

          return (
            <div key={user.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {user.name.split(' ')[0]}
                  </span>
                </div>
                <span className={`text-xs font-medium ${isOverloaded ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {activeTasks} {activeTasks === 1 ? 'tarea' : 'tareas'}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: isOverloaded ? '#EF4444' : avatarColor,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
