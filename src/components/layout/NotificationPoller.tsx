'use client'
// src/components/layout/NotificationPoller.tsx
// Polls /api/notifications every 15s and updates the store
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

export default function NotificationPoller() {
  const { setNotifications, notifications } = useAppStore()
  const prevUnread = useRef(0)

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data)

      // Play subtle sound / browser notification if new unread arrived
      const unread = data.filter((n: any) => !n.read).length
      if (unread > prevUnread.current && prevUnread.current !== -1) {
        // Visual pulse via document title
        const original = document.title
        document.title = `(${unread}) ${original.replace(/^\(\d+\)\s*/, '')}`
      }
      prevUnread.current = unread
    } catch {}
  }

  useEffect(() => {
    prevUnread.current = -1 // skip first pulse
    fetchNotifications()
    prevUnread.current = 0
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  return null
}
