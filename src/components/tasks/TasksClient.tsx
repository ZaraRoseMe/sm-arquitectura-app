'use client'
// src/components/tasks/TasksClient.tsx
import { useState, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { cn, getStatusColor, getStatusLabel } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Task, Project, User } from '@/types'
import TaskModal from './TaskModal'
import TaskCard from './TaskCard'
import ConflictModal from './ConflictModal'

type StatusFilter = 'ALL' | 'PENDIENTE' | 'EN_PROGRESO' | 'PAUSADO' | 'TERMINADO'

interface TasksClientProps {
  tasks: Task[]
  projects: any[]
  users: User[]
  isAdmin: boolean
  isCoordinador: boolean
  isColaborador: boolean
  isReportes?: boolean
  currentUserId: string
  currentUserName: string
}

export default function TasksClient({
  tasks: initialTasks, projects, users,
  isAdmin, isCoordinador, isColaborador, isReportes = false,
  currentUserId, currentUserName
}: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [conflictData, setConflictData] = useState<any>(null)

  // REPORTES no puede crear ni editar tareas
  const canCreate = !isReportes && (isAdmin || isCoordinador || isColaborador)

  const canManageTask = (task: any) => {
    if (isReportes) return false
    if (isAdmin) return true
    if (isCoordinador) return true
    if (isColaborador) return task.userId === currentUserId
    return false
  }

  const canEditTask = (task: any) => {
    if (isReportes) return false
    if (isAdmin) return true
    if (isCoordinador) return true
    if (isColaborador) return task.userId === currentUserId
    return false
  }

  const filtered = useMemo(() => tasks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false
    if (userFilter !== 'ALL' && t.userId !== userFilter) return false
    return true
  }), [tasks, search, statusFilter, projectFilter, userFilter])

  async function handleSave(taskData: any) {
    const method = editTask ? 'PATCH' : 'POST'
    const url = editTask ? `/api/tasks/${editTask.id}` : '/api/tasks'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    })
    const data = await res.json()
    if (res.status === 409 && data.conflicts) {
      setConflictData({ taskData, conflicts: data.conflicts, editTask })
      return false
    }
    if (!res.ok) { toast.error(data.error || 'Error al guardar'); return false }
    if (editTask) {
      setTasks(prev => prev.map(t => t.id === data.id ? data : t))
      toast.success('Tarea actualizada')
    } else {
      setTasks(prev => [data, ...prev])
      toast.success('Tarea creada')
    }
    setShowModal(false); setEditTask(null)
    return true
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) { setTasks(prev => prev.filter(t => t.id !== id)); toast.success('Tarea eliminada') }
    else toast.error('Error al eliminar')
  }

  async function handleStatusChange(id: string, status: string, pauseReason?: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, pauseReason }),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
      toast.success(`Estado actualizado: ${getStatusLabel(status)}`)
    } else toast.error('Error al actualizar estado')
  }

  async function handleConflictResolve(action: string, taskData: any) {
    const body = { ...taskData, forceCreate: action === 'force' }
    const method = conflictData.editTask ? 'PATCH' : 'POST'
    const url = conflictData.editTask ? `/api/tasks/${conflictData.editTask.id}` : '/api/tasks'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      if (conflictData.editTask) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
      else setTasks(prev => [data, ...prev])
      toast.success('Tarea guardada')
      setConflictData(null); setShowModal(false); setEditTask(null)
    }
  }

  const statusCounts = useMemo(() => ({
    ALL: tasks.length,
    PENDIENTE: tasks.filter(t => t.status === 'PENDIENTE').length,
    EN_PROGRESO: tasks.filter(t => t.status === 'EN_PROGRESO').length,
    PAUSADO: tasks.filter(t => t.status === 'PAUSADO').length,
    TERMINADO: tasks.filter(t => t.status === 'TERMINADO').length,
  }), [tasks])

  const pageTitle = isReportes ? 'Tareas'
    : isAdmin ? 'Tareas'
    : isCoordinador ? 'Tareas del equipo'
    : 'Mis Tareas'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tasks.length} tareas en total</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {isColaborador ? 'Nueva tarea propia' : 'Nueva tarea'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-56" placeholder="Buscar tareas..." />
        </div>
        {(isAdmin || isCoordinador || isReportes) && (
          <>
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input w-48">
              <option value="ALL">Todos los proyectos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="input w-44">
              <option value="ALL">Todos los usuarios</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['ALL', 'PENDIENTE', 'EN_PROGRESO', 'PAUSADO', 'TERMINADO'] as const).map(status => {
          const colors = status !== 'ALL' ? getStatusColor(status) : null
          return (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                statusFilter === status
                  ? status === 'ALL' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : cn(colors?.bg, colors?.text, 'ring-1', colors?.border)
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-neutral-800 dark:text-gray-400')}>
              {status === 'ALL' ? 'Todas' : getStatusLabel(status)}
              <span className="text-xs opacity-70">({statusCounts[status]})</span>
            </button>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isAdmin={isAdmin || isCoordinador}
            currentUserId={currentUserId}
            onEdit={canEditTask(task) ? (t) => { setEditTask(t); setShowModal(true) } : undefined}
            onDelete={canEditTask(task) ? handleDelete : undefined}
            onStatusChange={canManageTask(task) || task.userId === currentUserId ? handleStatusChange : undefined}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400">No hay tareas que mostrar</p>
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          projects={projects}
          users={isColaborador ? [] : users}
          isAdmin={isAdmin || isCoordinador}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => { setShowModal(false); setEditTask(null) }}
          onSave={handleSave}
        />
      )}

      {conflictData && (
        <ConflictModal
          conflicts={conflictData.conflicts}
          taskData={conflictData.taskData}
          users={users}
          onResolve={handleConflictResolve}
          onClose={() => setConflictData(null)}
        />
      )}
    </div>
  )
}
