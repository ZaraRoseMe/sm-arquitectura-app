// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

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

  const currentTask = await prisma.task.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!currentTask) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (status === 'PAUSADO' && currentTask.status !== 'PAUSADO') {
    await prisma.pauseLog.create({
      data: { taskId: id, userId: currentTask.userId, pausedAt: new Date(), reason: body.pauseReason || 'Sin motivo' },
    })
  }

  if (status && status !== 'PAUSADO' && currentTask.status === 'PAUSADO') {
    const lastPause = await prisma.pauseLog.findFirst({
      where: { taskId: id, resumedAt: null },
      orderBy: { pausedAt: 'desc' },
    })
    if (lastPause) {
      await prisma.pauseLog.update({ where: { id: lastPause.id }, data: { resumedAt: new Date() } })
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(progress !== undefined && { progress }),
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: parseLocalDate(startDate) }),
      ...(endDate && { endDate: parseLocalDate(endDate) }),
      ...(userId && { userId }),
      ...(projectId && { projectId }),
      ...(priority && { priority }),
    },
    include: { user: true, project: true, pauseLogs: true },
  })

  if (session.user.role === 'ADMIN' && task.userId !== session.user.id) {
    const changes: string[] = []
    if (name && name !== currentTask.name) changes.push(`nombre: "${name}"`)
    if (status && status !== currentTask.status) changes.push(`estado: ${formatStatus(status)}`)
    if (startDate && parseLocalDate(startDate).toDateString() !== currentTask.startDate.toDateString())
      changes.push(`inicio: ${format(parseLocalDate(startDate), "dd 'de' MMMM", { locale: es })}`)
    if (endDate && parseLocalDate(endDate).toDateString() !== currentTask.endDate.toDateString())
      changes.push(`fin: ${format(parseLocalDate(endDate), "dd 'de' MMMM", { locale: es })}`)
    if (description !== undefined && description !== currentTask.description) changes.push('descripción actualizada')

    if (changes.length > 0) {
      await prisma.notification.create({
        data: {
          userId: task.userId,
          taskId: task.id,
          title: '✏️ Tarea actualizada',
          message: `"${task.name}" fue modificada — ${changes.join(', ')}`,
        },
      })
    }
  }

  return NextResponse.json(task)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'
  const isColaborador = role === 'COLABORADOR'

  // Buscar la tarea para verificar permisos
  const task = await prisma.task.findUnique({ where: { id }, select: { userId: true } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ADMIN y COORDINADOR pueden eliminar cualquier tarea
  // COLABORADOR solo puede eliminar sus propias tareas
  if (!isAdmin && !isCoordinador && !(isColaborador && task.userId === session.user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

function formatStatus(s: string) {
  const map: Record<string, string> = { PENDIENTE: 'Pendiente', EN_PROGRESO: 'En progreso', PAUSADO: 'Pausado', TERMINADO: 'Terminado' }
  return map[s] || s
}
