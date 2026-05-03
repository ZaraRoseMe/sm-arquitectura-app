'use client'
// src/components/users/UserModal.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserModalProps {
  user: any | null
  onClose: () => void
  onSaved: (user: any) => void
}

export default function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'COLABORADOR',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const method = user ? 'PATCH' : 'POST'
    const url = user ? `/api/users/${user.id}` : '/api/users'

    const body = { ...form }
    if (!body.password) delete (body as any).password

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      onSaved(data)
      toast.success(user ? 'Usuario actualizado' : 'Usuario creado')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al guardar')
    }

    setLoading(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Ana García"
              required
            />
          </div>

          <div>
            <label className="label">Correo electrónico *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ana@smarquitectura.com"
              required
            />
          </div>

          <div>
            <label className="label">{user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required={!user}
              minLength={6}
            />
          </div>

          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
            >
              <option value="COLABORADOR">Colaborador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {user ? 'Actualizar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
