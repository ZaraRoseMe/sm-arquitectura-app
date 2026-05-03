// src/store/useAppStore.ts
import { create } from 'zustand'
import { Task, Project, Notification } from '@/types'

interface AppStore {
  // UI State
  sidebarOpen: boolean
  darkMode: boolean
  selectedProject: string | null
  selectedUser: string | null

  // Data
  notifications: Notification[]
  unreadCount: number

  // Actions
  toggleSidebar: () => void
  toggleDarkMode: () => void
  setSelectedProject: (id: string | null) => void
  setSelectedUser: (id: string | null) => void
  setNotifications: (notifications: Notification[]) => void
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  addNotification: (notification: Notification) => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  darkMode: false,
  selectedProject: null,
  selectedUser: null,
  notifications: [],
  unreadCount: 0,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.darkMode
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { darkMode: newMode }
    }),

  setSelectedProject: (id) => set({ selectedProject: id }),
  setSelectedUser: (id) => set({ selectedUser: id }),

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  markNotificationRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
}))
