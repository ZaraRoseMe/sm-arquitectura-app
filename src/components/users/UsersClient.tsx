'use client'
// src/components/users/UsersClient.tsx
import { useState } from 'react'
import { Plus, Shield, User, Trash2, Edit2, AtSign, Users } from 'lucide-react'
import { getInitials, getStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import UserModal from './UserModal'

interface UsersClientProps {
  users: any[]
  currentUserId: string
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') return (
    <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400 flex items-center gap-1">
      <Shield className="w-3 h-3" /> Administrador
    </span>
  )
  if (role === 'COORDINADOR') return (
    <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 flex items-center gap-1">
      <Users className="w-3 h-3" /> Coordinador
    </span>
  )
  return (
    <span className="badge bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 flex items-center gap-1">
      <User className="w-3 h-3" /> Colaborador
    </span>
  )
}

export default function UsersClient({ users: initialUsers, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  async function handleDelete(id: string) {
    if (id === currentUserId) { toast.error('No puedes eliminarte a ti mismo'); return }
    if (!confirm('¿Eliminar este usuario? Sus tareas quedarán sin asignar.')) return

    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('Usuario eliminado')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al eliminar — puede tener tareas asignadas')
    }
  }

  function handleSaved(user: any) {
    if (editUser) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...user } : u))
    } else {
      setUsers(prev => [...prev, { ...user, tasks: [], _count: { tasks: 0 } }])
    }
    setShowModal(false)
    setEditUser(null)
  }

  // Agrupar por rol para mostrar ordenado
  const admins = users.filter(u => u.role === 'ADMIN')
  const coordinadores = users.filter(u => u.role === 'COORDINADOR')
  const colaboradores = users.filter(u => u.role === 'COLABORADOR')

  function UserCard({ user }: { user: any }) {
    const avatarColor = user.color || '#6366F1'
    const activeTasks = (user.tasks || []).filter((t: any) => t.status === 'EN_PROGRESO')
    const teamInfo = user.ledTeam || user.teamMemberships?.[0]?.team

    return (
      <div className="card p-5 group hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
              style={{ backgroundColor: avatarColor }}>
              {getInitials(user.name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
              {user.username && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AtSign className="w-3 h-3 text-gray-400" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">{user.username}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setEditUser(user); setShowModal(true) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {user.id !== currentUserId && (
              <button onClick={() => handleDelete(user.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <RoleBadge role={user.role} />
          {user.id === currentUserId && (
            <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Tú</span>
          )}
        </div>

        {/* Info de equipo */}
        {teamInfo && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-4',
            user.role === 'COORDINADOR'
              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
              : 'bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400'
          )}>
            <Users className="w-3 h-3 flex-shrink-0" />
            {user.role === 'COORDINADOR'
              ? <span>Lidera: <strong>{teamInfo.name}</strong></span>
              : <span>Equipo: <strong>{teamInfo.name}</strong> · {teamInfo.coordinator?.name}</span>
            }
          </div>
        )}

        {/* Task stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{user._count?.tasks ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total tareas</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
            <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">{activeTasks.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">En progreso</p>
          </div>
        </div>

        {/* Active tasks preview */}
        {activeTasks.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {activeTasks.slice(0, 2).map((task: any) => {
              const colors = getStatusColor(task.status)
              return (
                <div key={task.id} className="flex items-center gap-2 text-xs">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', colors.dot)} />
                  <span className="text-gray-600 dark:text-gray-400 truncate">{task.name}</span>
                  <span className="text-gray-400 flex-shrink-0">{task.project?.name}</span>
                </div>
              )
            })}
            {activeTasks.length > 2 && <p className="text-xs text-gray-400 pl-3.5">+{activeTasks.length - 2} más</p>}
          </div>
        )}
      </div>
    )
  }

  function Section({ title, users, color }: { title: string; users: any[]; color: string }) {
    if (users.length === 0) return null
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', color)} />
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {title} <span className="font-normal">({users.length})</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map(u => <UserCard key={u.id} user={u} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{users.length} miembros del equipo</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      <Section title="Administradores" users={admins} color="bg-brand-500" />
      <Section title="Coordinadores" users={coordinadores} color="bg-amber-500" />
      <Section title="Colaboradores" users={colaboradores} color="bg-gray-400" />

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
