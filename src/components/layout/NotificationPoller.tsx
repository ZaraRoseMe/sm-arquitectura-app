'use client'
// src/components/layout/NotificationPoller.tsx
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useSounds } from '@/hooks/useSounds'

export default function NotificationPoller() {
  const { setNotifications, setOnlineUsers } = useAppStore()
  const { playNotificationSound } = useSounds()
  const prevUnread = useRef(0)
  const isFirst = useRef(true)

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data)
      const unread = data.filter((n: any) => !n.read).length
      if (!isFirst.current && unread > prevUnread.current) {
        playNotificationSound()
        const base = document.title.replace(/^\(\d+\)\s*/, '')
        document.title = `(${unread}) ${base}`
      } else if (unread === 0) {
        document.title = document.title.replace(/^\(\d+\)\s*/, '')
      }
      prevUnread.current = unread
    } catch {}
  }

  async function updatePresence() {
    try {
      // Actualizar lastSeen del usuario actual
      await fetch('/api/presence', { method: 'PATCH' })
      // Obtener usuarios online
      const res = await fetch('/api/presence')
      if (res.ok) {
        const onlineIds = await res.json()
        setOnlineUsers(onlineIds)
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    updatePresence()
    isFirst.current = false
    const interval = setInterval(() => {
      fetchNotifications()
      updatePresence()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  return null
}
