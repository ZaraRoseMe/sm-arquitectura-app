// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: { user: true, project: true, pauseLogs: true },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { status, progress, name, description, startDate, endDate, userId, projectId, priority } = body

  const currentTask = await prisma.task.findUnique({ where: { id } })
  if (!currentTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Handle pause/resume logic
  if (status === 'PAUSADO' && currentTask.status !== 'PAUSADO') {
    await prisma.pauseLog.create({
      data: { taskId: id, pausedAt: new Date(), reason: body.pauseReason || 'Sin motivo' },
    })
  }
  if (status && status !== 'PAUSADO' && currentTask.status === 'PAUSADO') {
    const lastPause = await prisma.pauseLog.findFirst({
      where: { taskId: id, resumedAt: null },
      orderBy: { pausedAt: 'desc' },
    })
    if (lastPause) {
      await prisma.pauseLog.update({
        where: { id: lastPause.id },
        data: { resumedAt: new Date() },
      })
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(progress !== undefined && { progress }),
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(userId && { userId }),
      ...(projectId && { projectId }),
      ...(priority && { priority }),
    },
    include: { user: true, project: true, pauseLogs: true },
  })
  return NextResponse.json(task)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
