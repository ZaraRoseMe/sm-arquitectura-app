'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LayoutDashboard, FolderOpen, CheckSquare, Users, BarChart2, Settings, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Proyectos', icon: FolderOpen },
  { href: '/dashboard/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/dashboard/gantt', label: 'Gantt', icon: BarChart2 },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users },
]

const colaboradorLinks = [
  { href: '/dashboard', label: 'Mi Panel', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Mis Tareas', icon: CheckSquare },
  { href: '/dashboard/gantt', label: 'Calendario', icon: BarChart2 },
]

interface SidebarProps {
  role: string
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const links = role === 'ADMIN' ? adminLinks : colaboradorLinks

  return (
    <aside
      className={cn(
        'bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 flex flex-col transition-all duration-300 h-full',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
        {sidebarOpen && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">SM</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Arquitectura</p>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mx-auto">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="w-full flex justify-center py-2 text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}

        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200',
                !sidebarOpen && 'justify-center'
              )}
              title={!sidebarOpen ? link.label : undefined}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : '')} />
              {sidebarOpen && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Role badge */}
      {sidebarOpen && (
        <div className="p-4 border-t border-gray-100 dark:border-neutral-800">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
            role === 'ADMIN'
              ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
              : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-400'
          )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', role === 'ADMIN' ? 'bg-brand-500' : 'bg-gray-400')} />
            {role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
          </div>
        </div>
      )}
    </aside>
  )
}
