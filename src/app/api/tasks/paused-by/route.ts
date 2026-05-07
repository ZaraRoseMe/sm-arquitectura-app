// src/app/api/tasks/paused-by/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const taskName = searchParams.get('taskName')
  const userId = searchParams.get('userId')

  if (!taskName || !userId) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  // Buscar tareas pausadas cuyo pauseLog tenga reason con el nombre de la tarea que causó la pausa
  const pausedTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'PAUSADO',
      pauseLogs: {
        some: {
          reason: `__paused_by_task__:${taskName}`,
          resumedAt: null, // Solo pausas activas
        },
      },
    },
    include: {
      pauseLogs: {
        where: {
          reason: `__paused_by_task__:${taskName}`,
          resumedAt: null,
        },
        orderBy: { pausedAt: 'desc' },
        take: 1,
      },
      project: true,
    },
  })

  return NextResponse.json(pausedTasks)
}
