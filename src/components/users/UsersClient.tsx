'use client'
// src/components/users/UsersClient.tsx
import { useState, useEffect } from 'react'
import { Plus, Shield, User, Trash2, Edit2, AtSign, Users, X, ChevronDown, ChevronUp, CheckCircle, Clock, PauseCircle, Circle } from 'lucide-react'
import { getInitials, getStatusColor, getStatusLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import UserModal from './UserModal'

interface UsersClientProps {
  users: any[]
  teams: any[]
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

// ─── Drawer lateral ──────────────────────────────────────────────────────────
function UserDrawer({ user, currentUserId, onClose, onEdit, onDelete }: {
  user: any
  currentUserId: string
  onClose: () => void
  onEdit: (user: any) => void
  onDelete: (id: string) => void
}) {
  const avatarColor = user.color || '#6366F1'
  const tasks = user.tasks || []
  const totalTasks = user._count?.tasks ?? tasks.length
  const inProgress = tasks.filter((t: any) => t.status === 'EN_PROGRESO')
  const pending = tasks.filter((t: any) => t.status === 'PENDIENTE')
  const paused = tasks.filter((t: any) => t.status === 'PAUSADO')
  const done = tasks.filter((t: any) => t.status === 'TERMINADO')
  const teamInfo = user.ledTeam || user.teamMemberships?.[0]?.team

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-neutral-900 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Perfil de usuario</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Avatar + info básica */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: avatarColor }}>
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{user.name}</p>
              {user.username && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AtSign className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-400">{user.username}</p>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <RoleBadge role={user.role} />
                {user.id === currentUserId && (
                  <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Tú</span>
                )}
              </div>
            </div>
          </div>

          {/* Equipo */}
          {teamInfo && (
            <div className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm',
              user.role === 'COORDINADOR'
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-400'
            )}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <div>
                {user.role === 'COORDINADOR'
                  ? <><span className="text-xs text-amber-500 uppercase tracking-wide font-medium block mb-0.5">Lidera el equipo</span><strong>{teamInfo.name}</strong></>
                  : <><span className="text-xs text-gray-400 uppercase tracking-wide font-medium block mb-0.5">Pertenece al equipo</span><strong>{teamInfo.name}</strong> · {teamInfo.coordinator?.name}</>
                }
              </div>
            </div>
          )}

          {/* Estadísticas */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tareas</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3.5">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total tareas</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3.5">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{inProgress.length}</p>
                <p className="text-xs text-blue-500 mt-0.5">En progreso</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3.5">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{pending.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3.5">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{paused.length}</p>
                <p className="text-xs text-amber-500 mt-0.5">Pausadas</p>
              </div>
            </div>
          </div>

          {/* Colaboradores del equipo (solo coordinadores) */}
          {user.role === 'COORDINADOR' && teamInfo && teamInfo.members && teamInfo.members.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Colaboradores del equipo ({teamInfo.members.length})
              </p>
              <div className="space-y-2">
                {teamInfo.members.map((m: any) => {
                  const member = m.user
                  return (
                    <button
                      key={member.id}
                      onClick={() => {
                        // Buscar el usuario completo en la lista para abrir su drawer
                        const fullUser = document.querySelector(`[data-user-id="${member.id}"]`)
                        onClose()
                        setTimeout(() => {
                          const event = new CustomEvent('open-user-drawer', { detail: { userId: member.id } })
                          window.dispatchEvent(event)
                        }, 150)
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors text-left group">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: member.color || '#6366F1' }}>
                        {getInitials(member.name).charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-brand-700 dark:group-hover:text-brand-400">{member.name}</p>
                        <p className="text-xs text-gray-400">@{member.username}</p>
                      </div>
                      <span className="text-xs text-gray-300 group-hover:text-brand-400">→</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tareas activas */}
          {tasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Detalle de tareas</p>
              <div className="space-y-2">
                {tasks.slice(0, 8).map((task: any) => {
                  const StatusIcon = task.status === 'TERMINADO' ? CheckCircle
                    : task.status === 'EN_PROGRESO' ? Clock
                    : task.status === 'PAUSADO' ? PauseCircle
                    : Circle
                  const iconColor = task.status === 'TERMINADO' ? 'text-emerald-500'
                    : task.status === 'EN_PROGRESO' ? 'text-blue-500'
                    : task.status === 'PAUSADO' ? 'text-amber-500'
                    : 'text-gray-400'
                  return (
                    <div key={task.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-neutral-800">
                      <StatusIcon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', iconColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{task.name}</p>
                        {task.project?.name && <p className="text-xs text-gray-400 truncate mt-0.5">{task.project.name}</p>}
                      </div>
                      {task.progress > 0 && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{task.progress}%</span>
                      )}
                    </div>
                  )
                })}
                {tasks.length > 8 && (
                  <p className="text-xs text-gray-400 text-center py-1">+{tasks.length - 8} tareas más</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(user) }}
            className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
          {user.id !== currentUserId && (
            <button
              onClick={() => { onClose(); onDelete(user.id) }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-sm font-medium">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Panel de gestión de equipo ───────────────────────────────────────────────
function TeamPanel({ team, allUsers, onUpdated }: {
  team: any
  allUsers: any[]
  onUpdated: (teamId: string, members: any[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const memberIds = new Set(team.members.map((m: any) => m.user.id))
  const available = allUsers.filter(u => !memberIds.has(u.id) && u.id !== team.coordinator?.id)

  async function addMember(userId: string) {
    setLoading(true)
    const res = await fetch(`/api/teams/${team.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      const data = await res.json()
      onUpdated(team.id, [...team.members, data])
      toast.success('Colaborador agregado al equipo')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al agregar')
    }
    setLoading(false)
  }

  async function removeMember(userId: string) {
    if (!confirm('¿Quitar este colaborador del equipo?')) return
    setLoading(true)
    const res = await fetch(`/api/teams/${team.id}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      onUpdated(team.id, team.members.filter((m: any) => m.user.id !== userId))
      toast.success('Colaborador removido del equipo')
    } else toast.error('Error al remover')
    setLoading(false)
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: team.coordinator?.color || '#F59E0B' }}>
            {getInitials(team.coordinator?.name || '')}
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{team.name}</p>
            <p className="text-xs text-gray-400">Coordinador: {team.coordinator?.name} · {team.members.length} miembro{team.members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {team.members.slice(0, 4).map((m: any) => (
              <div key={m.user.id}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                style={{ backgroundColor: m.user.color || '#6366F1' }} title={m.user.name}>
                {getInitials(m.user.name).charAt(0)}
              </div>
            ))}
            {team.members.length > 4 && (
              <div className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-900 bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] text-gray-600 dark:text-gray-300 font-bold">
                +{team.members.length - 4}
              </div>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-neutral-800 p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Miembros del equipo</p>
            {team.members.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin miembros aún</p>
            ) : (
              <div className="space-y-2">
                {team.members.map((m: any) => (
                  <div key={m.user.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-neutral-800 group">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: m.user.color || '#6366F1' }}>
                        {getInitials(m.user.name).charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{m.user.name}</p>
                        <p className="text-xs text-gray-400">@{m.user.username}</p>
                      </div>
                    </div>
                    <button onClick={() => removeMember(m.user.id)} disabled={loading}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {available.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Agregar colaborador</p>
              <div className="space-y-1.5">
                {available.map((u: any) => (
                  <button key={u.id} onClick={() => addMember(u.id)} disabled={loading}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg border border-dashed border-gray-200 dark:border-neutral-700 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all group">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: u.color || '#6366F1' }}>
                      {getInitials(u.name).charAt(0)}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-brand-700 dark:group-hover:text-brand-400">{u.name}</span>
                    <span className="text-xs text-gray-400">@{u.username}</span>
                    <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {available.length === 0 && team.members.length > 0 && (
            <p className="text-xs text-gray-400 italic">Todos los colaboradores ya están en este equipo</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function UsersClient({ users: initialUsers, teams: initialTeams, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [teams, setTeams] = useState(initialTeams)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [drawerUser, setDrawerUser] = useState<any>(null)

  // Listener para abrir drawer desde lista de colaboradores del coordinador
  useEffect(() => {
    function handleOpenDrawer(e: any) {
      const user = users.find(u => u.id === e.detail.userId)
      if (user) setDrawerUser(user)
    }
    window.addEventListener('open-user-drawer', handleOpenDrawer)
    return () => window.removeEventListener('open-user-drawer', handleOpenDrawer)
  }, [users])

  async function handleDelete(id: string) {
    if (id === currentUserId) { toast.error('No puedes eliminarte a ti mismo'); return }
    if (!confirm('¿Eliminar este usuario? Sus tareas quedarán sin asignar.')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('Usuario eliminado')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al eliminar')
    }
  }

  function handleSaved(user: any) {
    if (editUser) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...user } : u))
    } else {
      setUsers(prev => [...prev, { ...user, tasks: [], _count: { tasks: 0 } }])
      if (user.role === 'COORDINADOR' && user.ledTeam) {
        setTeams(prev => [...prev, { ...user.ledTeam, coordinator: user, members: [] }])
      }
    }
    setShowModal(false)
    setEditUser(null)
  }

  function handleTeamUpdated(teamId: string, members: any[]) {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members } : t))
  }

  const admins = users.filter(u => u.role === 'ADMIN')
  const coordinadores = users.filter(u => u.role === 'COORDINADOR')
  const colaboradores = users.filter(u => u.role === 'COLABORADOR')

  // ─── Card simplificada ────────────────────────────────────────────────────
  function UserCard({ user }: { user: any }) {
    const avatarColor = user.color || '#6366F1'
    return (
      <div
        onClick={() => setDrawerUser(user)}
        className="card p-4 group hover:shadow-md transition-all cursor-pointer flex items-center gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold flex-shrink-0"
          style={{ backgroundColor: avatarColor }}>
          {getInitials(user.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{user.name}</p>
            {user.id === currentUserId && (
              <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] py-0 px-1.5">Tú</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <AtSign className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-400 truncate">{user.username}</p>
          </div>
        </div>

        {/* Rol */}
        <div className="flex-shrink-0">
          <RoleBadge role={user.role} />
        </div>

        {/* Botones editar/eliminar — solo visibles en hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}>
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
        <div className="space-y-2">
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

      {teams.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Equipos</h2>
          </div>
          <div className="space-y-3">
            {teams.map(team => (
              <TeamPanel key={team.id} team={team} allUsers={users} onUpdated={handleTeamUpdated} />
            ))}
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerUser && (
        <UserDrawer
          user={drawerUser}
          currentUserId={currentUserId}
          onClose={() => setDrawerUser(null)}
          onEdit={(user) => { setEditUser(user); setShowModal(true) }}
          onDelete={handleDelete}
        />
      )}

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
