// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isWithinInterval } from 'date-fns'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { project: true, user: true, pauseLogs: { include: { user: true } } },
  })

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Colaboradores can only see their own tasks
  if (session.user.role !== 'ADMIN' && task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Colaboradores can only update their own tasks and only status/progress
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, description, startDate, endDate,
    status, progress, projectId, userId,
    pauseReason, forceCreate,
  } = body

  // Handle conflict detection for date changes
  if ((startDate || endDate) && !forceCreate && isAdmin) {
    const newStart = new Date(startDate || task.startDate)
    const newEnd = new Date(endDate || task.endDate)
    const assignedUserId = userId || task.userId

    const existingTasks = await prisma.task.findMany({
      where: {
        userId: assignedUserId,
        id: { not: params.id },
        status: { notIn: ['TERMINADO'] },
      },
    })

    const conflicts = existingTasks.filter((t) => {
      const tStart = new Date(t.startDate)
      const tEnd = new Date(t.endDate)
      return (
        isWithinInterval(newStart, { start: tStart, end: tEnd }) ||
        isWithinInterval(newEnd, { start: tStart, end: tEnd }) ||
        isWithinInterval(tStart, { start: newStart, end: newEnd })
      )
    })

    if (conflicts.length > 0) {
      return NextResponse.json({ conflicts }, { status: 409 })
    }
  }

  // Handle pause/resume logic
  if (status === 'PAUSADO' && task.status !== 'PAUSADO') {
    // Pause the task — create pause log
    await prisma.pauseLog.create({
      data: {
        taskId: params.id,
        userId: session.user.id,
        reason: pauseReason,
      },
    })
  } else if (status === 'EN_PROGRESO' && task.status === 'PAUSADO') {
    // Resume — update the open pause log
    const openPause = await prisma.pauseLog.findFirst({
      where: { taskId: params.id, resumedAt: null },
      orderBy: { pausedAt: 'desc' },
    })
    if (openPause) {
      await prisma.pauseLog.update({
        where: { id: openPause.id },
        data: { resumedAt: new Date() },
      })
    }
  }

  const updateData: any = {}
  if (isAdmin) {
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)
    if (projectId) updateData.projectId = projectId
    if (userId) updateData.userId = userId
    if (progress !== undefined) updateData.progress = progress
  }

  if (status) updateData.status = status
  if (!isAdmin && progress !== undefined) updateData.progress = progress

  // Auto-set progress on terminal states
  if (status === 'TERMINADO') updateData.progress = 100
  if (status === 'PENDIENTE') updateData.progress = 0

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: { project: true, user: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
