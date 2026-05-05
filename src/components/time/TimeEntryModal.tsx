'use client'
// src/components/time/TimeEntryModal.tsx
import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface TimeEntryModalProps {
  taskId: string
  taskName: string
  onClose: () => void
  onSaved: (entry: any) => void
}

export default function TimeEntryModal({ taskId, taskName, onClose, onSaved }: TimeEntryModalProps) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [form, setForm] = useState({
    date: todayStr,
    hours: 0,
    minutes: 0,
    note: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.hours === 0 && form.minutes === 0) {
      toast.error('Ingresa al menos 1 minuto')
      return
    }
    setLoading(true)
    const res = await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, ...form }),
    })
    if (res.ok) {
      const data = await res.json()
      onSaved(data)
      toast.success('Tiempo registrado')
    } else {
      toast.error('Error al registrar')
    }
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Registrar tiempo</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tarea</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white">{taskName}</p>
          </div>

          <div>
            <label className="label">Fecha *</label>
            <input type="date" className="input" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>

          <div>
            <label className="label">Tiempo trabajado *</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={23} className="input text-center"
                    value={form.hours}
                    onChange={e => setForm({ ...form, hours: Math.max(0, parseInt(e.target.value) || 0) })} />
                  <span className="text-sm text-gray-500 flex-shrink-0">hrs</span>
                </div>
              </div>
              <span className="text-gray-400 text-lg">:</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={59} className="input text-center"
                    value={form.minutes}
                    onChange={e => setForm({ ...form, minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })} />
                  <span className="text-sm text-gray-500 flex-shrink-0">min</span>
                </div>
              </div>
            </div>
            {/* Quick buttons */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[[0,30],[1,0],[2,0],[4,0],[8,0]].map(([h,m]) => (
                <button key={`${h}${m}`} type="button"
                  onClick={() => setForm({ ...form, hours: h, minutes: m })}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                  {h > 0 ? `${h}h` : ''}{m > 0 ? `${m}min` : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Nota (opcional)</label>
            <textarea className="input resize-none" rows={2} value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="¿Qué hiciste en este tiempo?" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
