'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, CheckSquare, Users, BarChart2, ChevronLeft, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Proyectos', icon: FolderOpen },
  { href: '/dashboard/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/dashboard/gantt', label: 'Gantt', icon: BarChart2 },
  { href: '/dashboard/timesheets', label: 'Tiempos', icon: Clock },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users },
]

const coordinadorLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Mis Proyectos', icon: FolderOpen },
  { href: '/dashboard/tasks', label: 'Tareas del equipo', icon: CheckSquare },
  { href: '/dashboard/gantt', label: 'Gantt', icon: BarChart2 },
  { href: '/dashboard/timesheets', label: 'Tiempos', icon: Clock },
]

const colaboradorLinks = [
  { href: '/dashboard', label: 'Mi Panel', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Mis Tareas', icon: CheckSquare },
  { href: '/dashboard/gantt', label: 'Calendario', icon: BarChart2 },
  { href: '/dashboard/timesheets', label: 'Mis Tiempos', icon: Clock },
]

function KronozMark({ size = 32 }: { size?: number }) {
  const cx = size / 2, cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.26
  const angles = [90, 30, 330, 270, 210, 150]

  function pt(r: number, i: number) {
    const a = (angles[i] * Math.PI) / 180
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }

  const outerPts = Array.from({ length: 6 }, (_, i) => pt(outerR, i))
  const innerPts = Array.from({ length: 6 }, (_, i) => pt(innerR, i))

  const outerPoly = outerPts.map(p => `${p.x},${p.y}`).join(' ')
  const innerPoly = innerPts.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <polygon points={outerPoly} stroke="#6366F1" strokeWidth="0.9" fill="none"/>
      <polygon points={innerPoly} stroke="#A5B4FC" strokeWidth="0.6" fill="none"/>
      {innerPts.map((p, i) => (
        <line key={i} x1={p.x} y1={p.y} x2={cx} y2={cy} stroke="#A5B4FC" strokeWidth="0.6" strokeOpacity="0.7"/>
      ))}
      {innerPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={size * 0.055} fill="#A5B4FC"/>
      ))}
      <circle cx={cx} cy={cy} r={size * 0.08} fill="#6366F1"/>
    </svg>
  )
}

interface SidebarProps { role: string }

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const links = role === 'ADMIN' ? adminLinks : role === 'COORDINADOR' ? coordinadorLinks : colaboradorLinks

  return (
    <aside className={cn(
      'bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 flex flex-col transition-all duration-300 h-full',
      sidebarOpen ? 'w-60' : 'w-16'
    )}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
        {sidebarOpen ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <KronozMark size={30} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none tracking-widest">KRONOZ</p>
              </div>
            </div>
            <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button onClick={toggleSidebar} className="mx-auto">
            <KronozMark size={28} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!sidebarOpen && (
          <button onClick={toggleSidebar} className="w-full flex justify-center py-2 text-gray-400 hover:text-gray-600 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200',
                !sidebarOpen && 'justify-center'
              )}
              title={!sidebarOpen ? link.label : undefined}>
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : '')} />
              {sidebarOpen && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      {sidebarOpen && (
        <div className="p-4 border-t border-gray-100 dark:border-neutral-800">
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
            role === 'ADMIN'
              ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
              : role === 'COORDINADOR'
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-400')}>
            <div className={cn('w-1.5 h-1.5 rounded-full',
              role === 'ADMIN' ? 'bg-brand-500' : role === 'COORDINADOR' ? 'bg-amber-500' : 'bg-gray-400')} />
            {role === 'ADMIN' ? 'Administrador' : role === 'COORDINADOR' ? 'Coordinador' : 'Colaborador'}
          </div>
        </div>
      )}
    </aside>
  )
}
