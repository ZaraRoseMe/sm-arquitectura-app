'use client'
// src/components/layout/Header.tsx
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bell, Moon, Sun, LogOut, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getInitials, formatDate } from '@/lib/utils'

interface HeaderProps {
  userName: string
  userEmail: string
  userRole: string
  userColor?: string
  currentUserId: string
  users: { id: string; name: string; color?: string }[]
}

export default function Header({ userName, userEmail, userRole, userColor, currentUserId, users }: HeaderProps) {
  const router = useRouter()
  const { darkMode, toggleDarkMode, notifications, unreadCount, markNotificationRead, markAllRead } = useAppStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const avatarColor = userColor || '#6366F1'
  const initials = getInitials(userName || '')

  const roleLabel = userRole === 'ADMIN' ? 'Admin'
    : userRole === 'COORDINADOR' ? 'Coordinador'
    : userRole === 'REPORTES' ? 'Reportes'
    : 'Colaborador'

  async function handleNotificationClick(notif: any) {
    markNotificationRead(notif.id)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notif.id }),
    })
    setShowNotifications(false)
    if (notif.taskId) router.push(`/dashboard/tasks?highlight=${notif.taskId}`)
  }

  async function handleMarkAllRead() {
    markAllRead()
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  return (
    <header className="h-16 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <button onClick={toggleDarkMode} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 card z-50 shadow-xl animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
                <h3 className="text-sm font-semibold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:text-brand-700">Marcar todas como leídas</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-neutral-800">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">Sin notificaciones</p>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <button key={notif.id} onClick={() => handleNotificationClick(notif)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group">
                      <div className="flex items-start gap-3">
                        {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
                        <div className={notif.read ? 'ml-4 flex-1' : 'flex-1'}>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-400">{formatDate(notif.createdAt)}</p>
                            {notif.taskId && <span className="text-xs text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">Ver tarea →</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: avatarColor }}>
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{roleLabel}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-11 w-48 card z-50 shadow-xl animate-slide-up py-1">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{userEmail}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
