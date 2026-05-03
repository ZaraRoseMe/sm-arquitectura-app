'use client'
// src/components/dashboard/ProjectsList.tsx
import Link from 'next/link'
import { formatDate, daysBetween } from '@/lib/utils'
import { isAfter } from 'date-fns'
import type { Project } from '@/types'

interface ProjectsListProps {
  projects: Project[]
}

export default function ProjectsList({ projects }: ProjectsListProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Proyectos</h2>
        <Link href="/dashboard/projects" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Ver todos →
        </Link>
      </div>

      <div className="p-3 space-y-2">
        {projects.slice(0, 5).map((project) => {
          const totalDays = daysBetween(project.startDate, project.endDate)
          const elapsedDays = daysBetween(project.startDate, new Date())
          const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
          const isActive = isAfter(new Date(project.endDate), new Date())

          return (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {project.name}
                </p>
              </div>
              <div className="h-1 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: project.color }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{progress}% transcurrido</span>
                <span className="text-xs text-gray-400">{formatDate(project.endDate)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
