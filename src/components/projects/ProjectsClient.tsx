'use client'
// src/components/projects/ProjectsClient.tsx
import { useState } from 'react'
import { Plus, Search, FolderOpen, Calendar, CheckSquare, Trash2, Edit2, Users } from 'lucide-react'
import { formatDate, getStatusColor, daysBetween } from '@/lib/utils'
import { isAfter } from 'date-fns'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Project, User } from '@/types'
import ProjectModal from './ProjectModal'

interface ProjectsClientProps {
  projects: Project[]
  users: User[]
  teams: any[]
  isAdmin: boolean
  isCoordinador: boolean
}

export default function ProjectsClient({ projects: initialProjects, users, teams, isAdmin, isCoordinador }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== id))
      toast.success('Proyecto eliminado')
    } else toast.error('Error al eliminar')
  }

  function handleSaved(project: Project) {
    if (editProject) {
      setProjects(prev => prev.map(p => p.id === project.id ? project : p))
    } else {
      setProjects(prev => [project, ...prev])
    }
    setShowModal(false)
    setEditProject(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isCoordinador ? 'Mis Proyectos' : 'Proyectos'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{projects.length} proyectos en total</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </button>
        )}
      </div>

      {/* Aviso admin — solo lectura */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs text-amber-700 dark:text-amber-400">
          <span>👁</span>
          <span>Puedes crear y ver proyectos. La gestión de tareas dentro de cada proyecto la hacen los coordinadores.</span>
        </div>
      )}

      {/* Aviso coordinador */}
      {isCoordinador && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 rounded-xl text-xs text-brand-700 dark:text-brand-400">
          <span>📋</span>
          <span>Estos son los proyectos asignados a tu equipo por el administrador.</span>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Buscar proyectos..." />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(project => {
          const tasks = (project as any).tasks || []
          const totalDays = daysBetween(project.startDate, project.endDate)
          const elapsedDays = daysBetween(project.startDate, new Date())
          const timeProgress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
          const completedTasks = tasks.filter((t: any) => t.status === 'TERMINADO').length
          const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
          const isActive = isAfter(new Date(project.endDate), new Date())
          const coordinator = (project as any).team?.coordinator

          return (
            <div key={project.id} className="card p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: project.color + '20' }}>
                    <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</h3>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-gray-400')}>
                      {isActive ? 'Activo' : 'Finalizado'}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditProject(project); setShowModal(true) }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(project.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {project.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{project.description}</p>
              )}

              {/* Coordinador asignado — solo visible para admin */}
              {isAdmin && coordinator && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="w-3 h-3" />
                  <span>Coordinador: <span className="font-medium text-gray-700 dark:text-gray-300">{coordinator.name}</span></span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Tareas</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{completedTasks}/{tasks.length}</p>
                </div>
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Fin</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDate(project.endDate, 'dd MMM')}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Progreso de tareas</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{taskProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${taskProgress}%`, backgroundColor: project.color }} />
                </div>
              </div>

              {tasks.length > 0 && (
                <div className="mt-4 flex -space-x-2">
                  {Array.from(new Set(tasks.map((t: any) => t.user?.id))).slice(0, 4).map((uid: any) => {
                    const user = tasks.find((t: any) => t.user?.id === uid)?.user
                    if (!user) return null
                    return (
                      <div key={uid}
                        className="w-7 h-7 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: project.color }}
                        title={user.name}>
                        {user.name[0]}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {isCoordinador ? 'No tienes proyectos asignados aún' : 'No hay proyectos'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editProject}
          teams={teams}
          onClose={() => { setShowModal(false); setEditProject(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
