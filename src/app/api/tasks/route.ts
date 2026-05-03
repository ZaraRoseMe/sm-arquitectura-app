// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'ADMIN'

  const tasks = await prisma.task.findMany({
    where: isAdmin ? {} : { userId: session.user.id },
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
  const { name, description, startDate, endDate, status, progress, projectId, userId } = body

  if (!name || !startDate || !endDate || !projectId || !userId) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  // Detectar conflictos: tareas del mismo usuario en el mismo rango de fechas
  const conflicts = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'TERMINADO' },
      AND: [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } },
      ],
    },
    include: { project: true },
  })

  if (conflicts.length > 0) {
    return NextResponse.json({ conflicts }, { status: 409 })
  }

  const task = await prisma.task.create({
    data: {
      name,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'PENDIENTE',
      progress: progress || 0,
      projectId,
      userId,
    },
    include: { project: true, user: true, pauseLogs: true },
  })

  // Crear notificación si se asigna a otro usuario
  if (userId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId,
        taskId: task.id,
        title: 'Nueva tarea asignada',
        message: `Se te ha asignado la tarea "${name}"`,
      },
    })
  }

  return NextResponse.json(task, { status: 201 })
}
