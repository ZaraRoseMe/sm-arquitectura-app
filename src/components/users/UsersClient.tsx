'use client'
// src/components/users/UsersClient.tsx
import { useState } from 'react'
import { Plus, Users, Shield, User, Trash2, Edit2 } from 'lucide-react'
import { generateAvatarColor, getInitials, getStatusColor, getStatusLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import UserModal from './UserModal'
import type { User } from '@/types'

interface UsersClientProps {
  users: any[]
  currentUserId: string
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
      setUsers((prev) => prev.filter((u) => u.id !== id))
      toast.success('Usuario eliminado')
    } else {
      toast.error('Error al eliminar')
    }
  }

  function handleSaved(user: any) {
    if (editUser) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...user } : u)))
    } else {
      setUsers((prev) => [...prev, { ...user, tasks: [], _count: { tasks: 0 } }])
    }
    setShowModal(false)
    setEditUser(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{users.length} miembros del equipo</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((user) => {
          const avatarColor = user.color || generateAvatarColor(user.name)
          const activeTasks = user.tasks.filter((t: any) => t.status === 'EN_PROGRESO')

          return (
            <div key={user.id} className="card p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditUser(user); setShowModal(true) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                  'badge',
                  user.role === 'ADMIN'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'
                )}>
                  {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {user.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                </span>
                {user.id === currentUserId && (
                  <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Tú
                  </span>
                )}
              </div>

              {/* Task stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{user._count.tasks}</p>
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
                  {activeTasks.length > 2 && (
                    <p className="text-xs text-gray-400 pl-3.5">+{activeTasks.length - 2} más</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

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
