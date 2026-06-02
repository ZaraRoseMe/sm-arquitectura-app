'use client'
// src/components/gantt/GanttWeeklyView.tsx
import { useMemo } from 'react'
import { format, addDays, startOfWeek, differenceInDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseDate, getInitials } from '@/lib/utils'
import type { Task } from '@/types'

interface GanttWeeklyViewProps {
  tasks: Task[]
  users: { id: string; name: string; color?: string }[]
  projects: { id: string; name: string; color: string; startDate?: any; endDate?: any }[]
  groupedByProject: { project: any; tasks: Task[] }[]
  groupedByUser: { user: any; tasks: Task[] }[]
  groupMode: 'project' | 'user'
  colorMode: 'status' | 'user' | 'project'
  conflictIds: Set<string>
  onSelectTask: (task: Task) => void
}

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: '#9CA3AF', EN_PROGRESO: '#3B82F6', PAUSADO: '#F59E0B', TERMINADO: '#10B981',
}

function prevMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

function getWeeks(start: Date, end: Date): Date[] {
  let mon = prevMonday(start)
  const weeks: Date[] = []
  const limit = addDays(end, 6)
  while (mon <= limit) {
    weeks.push(new Date(mon))
    mon = addDays(mon, 7)
  }
  return weeks
}

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 99, g: 102, b: 241 }
}

function lighten(hex: string, amount = 0.85): string {
  const { r, g, b } = hexToRgb(hex)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr},${lg},${lb})`
}

const WEEK_W = 72
const NAME_W = 180
const DATE_W = 70
const LABEL_W = NAME_W + DATE_W + DATE_W
const ROW_H = 40
const PROJ_H = 48
const MONTH_H = 20
const WEEK_H = 28

export default function GanttWeeklyView({
  tasks, users, projects, groupedByProject, groupedByUser,
  groupMode, colorMode, conflictIds, onSelectTask
}: GanttWeeklyViewProps) {
  const today = new Date()

  // Calcular rango de fechas desde todas las tareas
  const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : today
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : addDays(today, 90)

  // Extender rango 2 semanas antes y después
  const rangeStart = addDays(prevMonday(minDate), -14)
  const rangeEnd = addDays(maxDate, 14)

  const weeks = useMemo(() => getWeeks(rangeStart, rangeEnd), [rangeStart.getTime(), rangeEnd.getTime()])

  // Agrupar semanas por mes
  const monthGroups = useMemo(() => {
    const groups: { label: string; weeks: Date[] }[] = []
    let cur = ''; let wks: Date[] = []
    weeks.forEach(mon => {
      const friday = addDays(mon, 4)
      // El mes que más días tiene esa semana
      const label = format(differenceInDays(friday, mon) >= 4 ? friday : mon, 'MMMM yyyy', { locale: es })
      if (label !== cur) { if (wks.length) groups.push({ label: cur, weeks: wks }); cur = label; wks = [] }
      wks.push(mon)
    })
    if (wks.length) groups.push({ label: cur, weeks: wks })
    return groups
  }, [weeks])

  const totalW = weeks.length * WEEK_W

  // X position de una fecha
  function dateToX(d: Date): number {
    const days = differenceInDays(d, rangeStart)
    return LABEL_W + (days / 7) * WEEK_W
  }

  // Posición y ancho de barra (al borde derecho de la semana fin)
  function getBarPos(startD: Date, endD: Date) {
    const x = dateToX(startD)
    const endMon = prevMonday(endD)
    const endWeekIdx = weeks.findIndex(w => isSameDay(w, endMon))
    const barRight = LABEL_W + (endWeekIdx + 1) * WEEK_W
    const width = Math.max(WEEK_W * 0.5, barRight - x)
    return { x, width }
  }

  function getTaskColor(task: Task, conflict: boolean): string {
    if (conflict) return '#F59E0B'
    if (colorMode === 'user') return users.find(u => u.id === task.userId)?.color || '#6366F1'
    if (colorMode === 'project') return projects.find(p => p.id === task.projectId)?.color || '#3B82F6'
    return STATUS_COLORS[task.status] || '#9CA3AF'
  }

  const todayX = dateToX(today)

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-neutral-800" style={{ background: '#F8F7F4' }}>
      <div style={{ minWidth: LABEL_W + totalW, position: 'relative' }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20" style={{ background: '#F8F7F4' }}>

          {/* Fila de meses */}
          <div className="flex" style={{ height: MONTH_H }}>
            <div style={{ width: NAME_W, flexShrink: 0 }} className="border-r border-b border-gray-200 bg-gray-50 flex items-center px-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tarea</span>
            </div>
            <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-b border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Inicio</span>
            </div>
            <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-b border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fin</span>
            </div>
            {monthGroups.map((mg, i) => (
              <div key={i}
                className="border-r border-b border-gray-200 flex items-center px-2"
                style={{ width: mg.weeks.length * WEEK_W, background: '#EDEDEA', flexShrink: 0 }}>
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide capitalize truncate">
                  {mg.label}
                </span>
              </div>
            ))}
          </div>

          {/* Fila de semanas */}
          <div className="flex" style={{ height: WEEK_H }}>
            <div style={{ width: NAME_W, flexShrink: 0 }} className="border-r border-b border-gray-200 bg-gray-50" />
            <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-b border-gray-200 bg-gray-50" />
            <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-b border-gray-200 bg-gray-50" />
            {weeks.map((mon, i) => {
              const fri = addDays(mon, 4)
              const isThisWeek = today >= mon && today <= addDays(mon, 6)
              return (
                <div key={i}
                  className="border-r border-b border-gray-200 flex flex-col items-center justify-center"
                  style={{
                    width: WEEK_W, flexShrink: 0,
                    background: isThisWeek ? '#FDE8EE' : '#EDEDEA',
                  }}>
                  <span className="text-[9px] font-bold" style={{ color: isThisWeek ? '#E07A96' : '#888780' }}>
                    S{i + 1}
                  </span>
                  <span className="text-[9px]" style={{ color: isThisWeek ? '#E07A96' : '#888780' }}>
                    {format(mon, 'd')}-{format(fri, 'd')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── FILAS ──────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>

          {/* Línea de hoy */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: todayX,
            width: 2, background: '#E24B4A', zIndex: 10, pointerEvents: 'none'
          }} />
          {/* Triángulo de hoy */}
          <div style={{
            position: 'absolute', top: -8, left: todayX - 5,
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '8px solid #E24B4A',
            zIndex: 11, pointerEvents: 'none'
          }} />

          {/* Columnas de semana (fondo alterno) */}
          {weeks.map((mon, i) => {
            const isThisWeek = today >= mon && today <= addDays(mon, 6)
            return (
              <div key={i} style={{
                position: 'absolute', top: 0, bottom: 0,
                left: LABEL_W + i * WEEK_W, width: WEEK_W,
                background: isThisWeek ? 'rgba(224,122,150,0.05)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                borderRight: '1px solid #E8E6E0',
                pointerEvents: 'none', zIndex: 0,
              }} />
            )
          })}

          {/* ── CONTENIDO POR PROYECTO ─────────────────────────────────── */}
          {groupMode === 'project' && groupedByProject.map(({ project, tasks: pt }, gi) => {
            const pColor = project.color || '#2C2C2A'

            // Barra del proyecto (negro)
            let projBarEl = null
            if (project.startDate && project.endDate) {
              const ps = new Date(String(project.startDate).substring(0, 10) + 'T12:00:00')
              const pe = new Date(String(project.endDate).substring(0, 10) + 'T12:00:00')
              const { x, width } = getBarPos(ps, pe)
              projBarEl = (
                <div style={{
                  position: 'absolute', left: x, width,
                  height: 6, top: '50%', transform: 'translateY(-50%)',
                  background: '#2C2C2A', borderRadius: 3,
                }} />
              )
            }

            return (
              <div key={project.id}>
                {/* Fila encabezado proyecto */}
                <div className="flex border-b border-gray-200" style={{ height: PROJ_H, background: lighten(pColor, 0.92) }}>
                  <div style={{ width: NAME_W, flexShrink: 0 }}
                    className="border-r border-gray-200 flex items-center px-3 gap-2">
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: pColor, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-800 truncate block">{project.name}</span>
                      <span className="text-[10px] text-gray-400">{pt.length} tareas</span>
                    </div>
                  </div>
                  <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-200 flex items-center justify-center">
                    {project.startDate && <span className="text-[10px] text-gray-500">{format(new Date(String(project.startDate).substring(0, 10) + 'T12:00:00'), 'dd MMM yy', { locale: es })}</span>}
                  </div>
                  <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-200 flex items-center justify-center">
                    {project.endDate && <span className="text-[10px] text-gray-500">{format(new Date(String(project.endDate).substring(0, 10) + 'T12:00:00'), 'dd MMM yy', { locale: es })}</span>}
                  </div>
                  <div style={{ flex: 1, position: 'relative', minWidth: totalW }}>
                    {projBarEl}
                  </div>
                </div>

                {/* Filas de tareas */}
                {pt.map((task, ti) => {
                  const conflict = conflictIds.has(task.id)
                  const barColor = getTaskColor(task, conflict)
                  const user = users.find(u => u.id === task.userId)
                  const ts = parseDate(task.startDate)
                  const te = parseDate(task.endDate)
                  const { x, width } = getBarPos(ts, te)
                  const barH = 18

                  return (
                    <div key={task.id} className="flex border-b border-gray-100"
                      style={{ height: ROW_H, background: ti % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                      <div style={{ width: NAME_W, flexShrink: 0 }}
                        className="border-r border-gray-100 flex items-center px-3 pl-6">
                        <p className="text-xs text-gray-700 truncate font-medium">{task.name}</p>
                      </div>
                      <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-100 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500">{format(ts, 'dd MMM yy', { locale: es })}</span>
                      </div>
                      <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-100 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500">{format(te, 'dd MMM yy', { locale: es })}</span>
                      </div>
                      <div style={{ flex: 1, position: 'relative', minWidth: totalW }}>
                        {/* Barra */}
                        <div
                          onClick={() => onSelectTask(task)}
                          style={{
                            position: 'absolute',
                            left: x - LABEL_W,
                            width,
                            height: barH,
                            top: '50%', transform: 'translateY(-50%)',
                            background: barColor,
                            borderRadius: 4,
                            cursor: 'pointer',
                            opacity: task.status === 'TERMINADO' ? 0.7 : 1,
                            border: conflict ? '2px solid #F59E0B' : 'none',
                          }}
                        >
                          {/* Progreso */}
                          {task.progress > 0 && (
                            <div style={{
                              position: 'absolute', top: 0, left: 0,
                              width: `${task.progress}%`, height: '100%',
                              background: 'rgba(255,255,255,0.25)', borderRadius: 4,
                            }} />
                          )}
                        </div>
                        {/* Nombre responsable al final de la barra */}
                        {user && (
                          <div style={{
                            position: 'absolute',
                            left: x - LABEL_W + width + 4,
                            top: '50%', transform: 'translateY(-50%)',
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ fontSize: 9, color: '#2C2C2A', fontWeight: 500 }}>
                              {user.name.split(' ')[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* ── CONTENIDO POR USUARIO ──────────────────────────────────── */}
          {groupMode === 'user' && groupedByUser.map(({ user, tasks: ut }, gi) => {
            const uColor = user.color || '#6366F1'

            return (
              <div key={user.id}>
                {/* Fila encabezado usuario */}
                <div className="flex border-b border-gray-200" style={{ height: PROJ_H, background: lighten(uColor, 0.92) }}>
                  <div style={{ width: NAME_W, flexShrink: 0 }}
                    className="border-r border-gray-200 flex items-center px-3 gap-2">
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: uColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{user.name}</p>
                      <p className="text-[10px] text-gray-400">{ut.length} tarea{ut.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-200" />
                  <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-200" />
                  <div style={{ flex: 1, position: 'relative', minWidth: totalW }} />
                </div>

                {/* Filas de tareas */}
                {ut.map((task, ti) => {
                  const conflict = conflictIds.has(task.id)
                  const barColor = getTaskColor(task, conflict)
                  const project = projects.find(p => p.id === task.projectId)
                  const ts = parseDate(task.startDate)
                  const te = parseDate(task.endDate)
                  const { x, width } = getBarPos(ts, te)
                  const barH = 18

                  return (
                    <div key={task.id} className="flex border-b border-gray-100"
                      style={{ height: ROW_H, background: ti % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                      <div style={{ width: NAME_W, flexShrink: 0 }}
                        className="border-r border-gray-100 flex flex-col justify-center px-3 pl-6 gap-0.5">
                        <p className="text-xs text-gray-700 truncate font-medium">{task.name}</p>
                        {project && (
                          <div className="flex items-center gap-1">
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                            <p className="text-[10px] text-gray-400 truncate">{project.name}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-100 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500">{format(ts, 'dd MMM yy', { locale: es })}</span>
                      </div>
                      <div style={{ width: DATE_W, flexShrink: 0 }} className="border-r border-gray-100 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500">{format(te, 'dd MMM yy', { locale: es })}</span>
                      </div>
                      <div style={{ flex: 1, position: 'relative', minWidth: totalW }}>
                        <div
                          onClick={() => onSelectTask(task)}
                          style={{
                            position: 'absolute',
                            left: x - LABEL_W,
                            width,
                            height: barH,
                            top: '50%', transform: 'translateY(-50%)',
                            background: barColor,
                            borderRadius: 4,
                            cursor: 'pointer',
                            opacity: task.status === 'TERMINADO' ? 0.7 : 1,
                            border: conflict ? '2px solid #F59E0B' : 'none',
                          }}
                        >
                          {task.progress > 0 && (
                            <div style={{
                              position: 'absolute', top: 0, left: 0,
                              width: `${task.progress}%`, height: '100%',
                              background: 'rgba(255,255,255,0.25)', borderRadius: 4,
                            }} />
                          )}
                        </div>
                        {/* Nombre al final de la barra */}
                        <div style={{
                          position: 'absolute',
                          left: x - LABEL_W + width + 4,
                          top: '50%', transform: 'translateY(-50%)',
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{ fontSize: 9, color: '#2C2C2A', fontWeight: 500 }}>
                            {user.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Sin tareas */}
          {(groupMode === 'project' ? groupedByProject : groupedByUser).length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-500 text-sm">No hay tareas para mostrar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
