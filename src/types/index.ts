// src/types/index.ts
export type Role = 'ADMIN' | 'COLABORADOR'
export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'PAUSADO' | 'TERMINADO'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string | null
  startDate: Date
  endDate: Date
  color: string
  createdAt: Date
  updatedAt: Date
  tasks?: Task[]
  _count?: { tasks: number }
}

export interface Task {
  id: string
  name: string
  description?: string | null
  startDate: Date
  endDate: Date
  status: TaskStatus
  progress: number
  projectId: string
  userId: string
  createdAt: Date
  updatedAt: Date
  project?: Project
  user?: User
  pauseLogs?: PauseLog[]
}

export interface PauseLog {
  id: string
  taskId: string
  userId: string
  pausedAt: Date
  resumedAt?: Date | null
  reason?: string | null
  user?: User
}

export interface Notification {
  id: string
  userId: string
  taskId?: string | null
  title: string
  message: string
  read: boolean
  createdAt: Date
  task?: Task | null
}

export interface GanttTask {
  id: string
  name: string
  startDate: Date
  endDate: Date
  status: TaskStatus
  progress: number
  userId: string
  userName: string
  projectName: string
  projectColor: string
  hasConflict?: boolean
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  tasksByStatus: {
    PENDIENTE: number
    EN_PROGRESO: number
    PAUSADO: number
    TERMINADO: number
  }
  overdueTasks: number
  userWorkload: {
    userId: string
    userName: string
    taskCount: number
    activeTasks: number
  }[]
}

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      image?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
  }
}
