'use client'
// src/components/projects/ProjectsClient.tsx
import { useState, useMemo } from 'react'
import { Plus, Search, FolderOpen, Folder, Calendar, CheckSquare, Trash2, Edit2, Users, ChevronRight, ChevronDown, FolderPlus } from 'lucide-react'
import { formatDate, daysBetween } from '@/lib/utils'
import { isAfter } from 'date-fns'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { User } from '@/types'
import ProjectModal from './ProjectModal'

interface ProjectsClientProps {
  projects: any[]
  users: User[]
  teams: any[]
  isAdmin: boolean
  isCoordinador: boolean
}

function getAllTasks(project: any): any[] {
  const own = project.tasks || []
  const childTasks = (project.children || []).flatMap((c: any) => getAllTasks(c))
  return [...own, ...childTasks]
}

function countDescendants(project: any): number {
  const children = project.children || []
  return children.length + children.reduce((sum: number, c: any) => sum + countDescendants(c), 0)
}

function flattenTree(projects: any[]): any[] {
  return projects.flatMap(p => [p, ...flattenTree(p.children || [])])
}

function ProjectNode({ project, depth, isAdmin, isCoordinador, allProjects, onEdit, onDelete, onAddChild, teams, defaultExpanded = false }: {
  project: any; depth: number; isAdmin: boolean; isCoordinador: boolean
  allProjects: any[]; onEdit: (p: any) => void; onDelete: (id: string) => void
  onAddChild: (parent: any) => void; teams: any[]; defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth === 0)
  const hasChildren = (project.children || []).length > 0
  const allTasks = getAllTasks(project)
  const completedTasks = allTasks.filter((t: any) => t.status === 'TERMINADO').length
  const taskProgress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0
  const isActive = isAfter(new Date(project.endDate), new Date())
  const coordinator = project.team?.coordinator
  const descendantCount = countDescendants(project)
  const indent = depth * 20

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors',
          depth === 0 && 'bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-sm mb-1'
        )}
        style={{ marginLeft: indent }}>

        {/* Toggle */}
        <button className="w-5 h-5 flex items-center justify-center flex-shrink-0"
          onClick={() => setExpanded(v => !v)}>
          {hasChildren
            ? expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            : <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-neutral-700 mx-auto" />
          }
        </button>

        {/* Ícono */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
          style={{ backgroundColor: project.color + '20' }}>
          {depth === 0
            ? <FolderOpen className="w-4 h-4" style={{ color: project.color }} />
            : <Folder className="w-3.5 h-3.5" style={{ color: project.color }} />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-medium text-gray-900 dark:text-white truncate', depth === 0 ? 'text-sm' : 'text-xs')}>
              {project.name}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0',
              isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-neutral-800')}>
              {isActive ? 'Activo' : 'Finalizado'}
            </span>
            {descendantCount > 0 && (
              <span className="text-[10px] text-gray-400 flex-shrink-0">{descendantCount} sub</span>
            )}
          </div>
          {project.description && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{project.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          {isAdmin && coordinator && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Users className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{coordinator.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <CheckSquare className="w-3 h-3" />
            <span>{completedTasks}/{allTasks.length}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(project.endDate, 'dd MMM')}</span>
          </div>
          <div className="w-16 h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${taskProgress}%`, backgroundColor: project.color }} />
          </div>
          <span className="text-[10px] text-gray-400 w-7 text-right">{taskProgress}%</span>
        </div>

        {/* Acciones */}
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onAddChild(project)} title="Agregar subproyecto"
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(project)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(project.id)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Hijos */}
      {expanded && hasChildren && (
        <div className="border-l-2 border-gray-100 dark:border-neutral-800 mt-0.5 mb-1"
          style={{ marginLeft: indent + 28 }}>
          {(project.children || []).map((child: any) => (
            <ProjectNode key={child.id} project={child} depth={depth + 1}
              isAdmin={isAdmin} isCoordinador={isCoordinador} allProjects={allProjects}
              onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} teams={teams} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectsClient({ projects: initialProjects, users, teams, isAdmin, isCoordinador }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<any>(null)
  const [parentForNew, setParentForNew] = useState<any>(null)

  const flat = useMemo(() => flattenTree(projects), [projects])
  const totalProjects = flat.length
  const rootCount = projects.length

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    return flat.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    )
  }, [flat, search])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proyecto?')) return
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const fresh = await fetch('/api/projects').then(r => r.json())
      setProjects(fresh)
      toast.success('Proyecto eliminado')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al eliminar')
    }
  }

  function handleSaved() {
    fetch('/api/projects').then(r => r.json()).then(data => setProjects(data))
    setShowModal(false)
    setEditProject(null)
    setParentForNew(null)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isCoordinador ? 'Mis Proyectos' : 'Proyectos'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {rootCount} desarrollo{rootCount !== 1 ? 's' : ''} · {totalProjects} nodo{totalProjects !== 1 ? 's' : ''} en total
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setParentForNew(null); setEditProject(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo desarrollo
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs text-amber-700 dark:text-amber-400">
          <span>💡</span>
          <span>Haz hover en cualquier fila para ver las acciones. El botón <strong>📁+</strong> agrega un subproyecto dentro.</span>
        </div>
      )}
      {isCoordinador && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 rounded-xl text-xs text-brand-700 dark:text-brand-400">
          <span>📋</span>
          <span>Estos son los proyectos asignados a tu equipo.</span>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Buscar en todos los niveles..." />
      </div>

      {/* Resultados de búsqueda */}
      {search.trim() && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-neutral-800">
            <p className="text-xs text-gray-500">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-neutral-800">
            {searchResults.length === 0
              ? <p className="text-sm text-gray-400 px-4 py-8 text-center">Sin resultados</p>
              : searchResults.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800/30 group">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: p.color + '20' }}>
                    <Folder className="w-3.5 h-3.5" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                    {p.parent && <p className="text-[10px] text-gray-400 truncate">en: {p.parent.name}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setParentForNew(p); setEditProject(null); setShowModal(true) }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-emerald-600">
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditProject(p); setParentForNew(null); setShowModal(true) }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-brand-600">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Árbol */}
      {!search.trim() && (
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="py-16 text-center">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No hay proyectos</p>
              {isAdmin && (
                <button onClick={() => { setParentForNew(null); setEditProject(null); setShowModal(true) }}
                  className="mt-4 btn-primary text-sm">
                  <Plus className="w-4 h-4 inline mr-1" /> Crear primer desarrollo
                </button>
              )}
            </div>
          ) : projects.map(project => (
            <ProjectNode key={project.id} project={project} depth={0}
              isAdmin={isAdmin} isCoordinador={isCoordinador} allProjects={flat}
              onEdit={p => { setEditProject(p); setParentForNew(null); setShowModal(true) }}
              onDelete={handleDelete}
              onAddChild={p => { setParentForNew(p); setEditProject(null); setShowModal(true) }}
              teams={teams} defaultExpanded={true} />
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal
          project={editProject}
          parentProject={parentForNew}
          projects={flat}
          teams={teams}
          onClose={() => { setShowModal(false); setEditProject(null); setParentForNew(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
