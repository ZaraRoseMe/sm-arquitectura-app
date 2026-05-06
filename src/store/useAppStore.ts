// src/store/useAppStore.ts
import { create } from 'zustand'
import { Task, Project, Notification } from '@/types'

export interface ChatWindow {
  id: string        // userId para DM, teamId para grupo
  type: 'dm' | 'group'
  label: string
  color: string
  minimized: boolean
  unread: number
  lastSender?: string
}

interface AppStore {
  // UI State
  sidebarOpen: boolean
  darkMode: boolean
  selectedProject: string | null
  selectedUser: string | null

  // Data
  notifications: Notification[]
  unreadCount: number

  // Chat windows — persisten entre navegaciones
  chatWindows: ChatWindow[]

  // Actions
  toggleSidebar: () => void
  toggleDarkMode: () => void
  setSelectedProject: (id: string | null) => void
  setSelectedUser: (id: string | null) => void
  setNotifications: (notifications: Notification[]) => void
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  addNotification: (notification: Notification) => void

  // Chat actions
  openChatWindow: (win: Omit<ChatWindow, 'minimized' | 'unread'>) => void
  openMinimized: (win: Omit<ChatWindow, 'minimized' | 'unread'>) => void // ← NUEVO
  closeChatWindow: (id: string) => void
  minimizeChatWindow: (id: string) => void
  maximizeChatWindow: (id: string) => void
  setChatWindowUnread: (id: string, count: number, lastSender?: string) => void
  clearChatWindowUnread: (id: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  darkMode: false,
  selectedProject: null,
  selectedUser: null,
  notifications: [],
  unreadCount: 0,
  chatWindows: [],

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set(state => {
    const newMode = !state.darkMode
    if (newMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    return { darkMode: newMode }
  }),
  setSelectedProject: (id) => set({ selectedProject: id }),
  setSelectedUser: (id) => set({ selectedUser: id }),
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
  }),
  markNotificationRead: (id) => set(state => {
    const updated = state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    return { notifications: updated, unreadCount: updated.filter(n => !n.read).length }
  }),
  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  addNotification: (notification) => set(state => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),

  // ─── Chat window actions ──────────────────────────────────────────────────
  openChatWindow: (win) => set(state => {
    const exists = state.chatWindows.find(w => w.id === win.id)
    if (exists) {
      // Si ya existe, solo desminimizar
      return {
        chatWindows: state.chatWindows.map(w =>
          w.id === win.id ? { ...w, minimized: false, unread: 0, lastSender: undefined } : w
        )
      }
    }
    // Nueva ventana — agregar al inicio
    return {
      chatWindows: [{ ...win, minimized: false, unread: 0 }, ...state.chatWindows]
    }
  }),

  // ← NUEVO: aparece minimizada sin interrumpir al usuario
  openMinimized: (win) => set(state => {
    const exists = state.chatWindows.find(w => w.id === win.id)
    if (exists) return state // ya existe (abierta o minimizada), no tocar
    return {
      chatWindows: [...state.chatWindows, { ...win, minimized: true, unread: 0 }]
    }
  }),

  closeChatWindow: (id) => set(state => ({
    chatWindows: state.chatWindows.filter(w => w.id !== id)
  })),

  minimizeChatWindow: (id) => set(state => ({
    chatWindows: state.chatWindows.map(w => w.id === id ? { ...w, minimized: true } : w)
  })),

  maximizeChatWindow: (id) => set(state => ({
    chatWindows: state.chatWindows.map(w =>
      w.id === id ? { ...w, minimized: false, unread: 0, lastSender: undefined } : w
    )
  })),

  setChatWindowUnread: (id, count, lastSender) => set(state => ({
    chatWindows: state.chatWindows.map(w =>
      w.id === id ? { ...w, unread: count, lastSender } : w
    )
  })),

  clearChatWindowUnread: (id) => set(state => ({
    chatWindows: state.chatWindows.map(w =>
      w.id === id ? { ...w, unread: 0, lastSender: undefined } : w
    )
  })),
}))
