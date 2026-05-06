'use client'
// src/components/layout/NotificationPoller.tsx
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useSounds } from '@/hooks/useSounds'

export default function NotificationPoller() {
  const { setNotifications } = useAppStore()
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
        // Sonido de notificación del sistema
        playNotificationSound()
        // Título del documento
        const base = document.title.replace(/^\(\d+\)\s*/, '')
        document.title = `(${unread}) ${base}`
      } else if (unread === 0) {
        document.title = document.title.replace(/^\(\d+\)\s*/, '')
      }

      prevUnread.current = unread
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    isFirst.current = false
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  return null
}
