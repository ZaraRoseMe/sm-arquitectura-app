'use client'
// src/components/dashboard/RecentTasks.tsx
import Link from 'next/link'
import { formatDate, getStatusColor, getStatusLabel, isOverdue, generateAvatarColor, getInitials } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

interface RecentTasksProps {
  tasks: Task[]
}

export default function RecentTasks({ tasks }: RecentTasksProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Tareas recientes</h2>
        <Link href="/dashboard/tasks" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Ver todas →
        </Link>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-neutral-800">
        {tasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No hay tareas aún</p>
          </div>
        ) : (
          tasks.map((task) => {
            const colors = getStatusColor(task.status)
            const overdue = isOverdue(task.endDate) && task.status !== 'TERMINADO'
            const avatarColor = task.user ? generateAvatarColor(task.user.name) : '#6470f1'

            return (
              <div key={task.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {overdue && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.project?.name}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className={cn('text-xs', overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400')}>
                        {formatDate(task.endDate)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {task.status === 'EN_PROGRESO' && (
                      <div className="mt-2 h-1 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden w-24">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Assignee avatar */}
                    {task.user && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: avatarColor }}
                        title={task.user.name}
                      >
                        {getInitials(task.user.name)}
                      </div>
                    )}

                    {/* Status badge */}
                    <span className={cn('badge', colors.bg, colors.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
