// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isWithinInterval } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const projectId = searchParams.get('projectId')

  const tasks = await prisma.task.findMany({
    where: {
      ...(session.user.role !== 'ADMIN' && { userId: session.user.id }),
      ...(userId && { userId }),
      ...(projectId && { projectId }),
    },
    include: { project: true, user: true, pauseLogs: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, startDate, endDate, status, progress, projectId, userId, forceCreate } = body

  if (!name || !startDate || !endDate || !projectId || !userId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Check for conflicts unless forced
  if (!forceCreate) {
    const existingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ['TERMINADO'] },
      },
    })

    const newStart = new Date(startDate)
    const newEnd = new Date(endDate)

    const conflicts = existingTasks.filter((task) => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      return (
        isWithinInterval(newStart, { start: taskStart, end: taskEnd }) ||
        isWithinInterval(newEnd, { start: taskStart, end: taskEnd }) ||
        isWithinInterval(taskStart, { start: newStart, end: newEnd })
      )
    })

    if (conflicts.length > 0) {
      return NextResponse.json({ conflicts }, { status: 409 })
    }
  }

  const task = await prisma.task.create({
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'PENDIENTE',
      progress: progress || 0,
      projectId,
      userId,
    },
    include: { project: true, user: true },
  })

  // Create notification for assigned user
  if (userId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId,
        taskId: task.id,
        title: 'Nueva tarea asignada',
        message: `Se te asignó la tarea "${name}" en el proyecto "${task.project?.name}"`,
      },
    })
  }

  return NextResponse.json(task, { status: 201 })
}
