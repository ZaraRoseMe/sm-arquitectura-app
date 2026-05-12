// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isReportes = role === 'REPORTES'

  const tasks = await prisma.task.findMany({
    where: isAdmin || isReportes ? {} : { userId: session.user.id },
    include: { project: true, user: true, pauseLogs: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const isCoordinador = role === 'COORDINADOR'

  const isColaborador = role === 'COLABORADOR'

  // REPORTES no puede crear tareas
  if (!isAdmin && !isCoordinador && !isColaborador) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, startDate, endDate, status, progress, projectId, userId, forceCreate } = body

  if (!name || !startDate || !endDate || !projectId || !userId) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  if (isCoordinador) {
    const team = await prisma.team.findUnique({
      where: { coordinatorId: session.user.id },
      include: { members: { select: { userId: true } } },
    })
    const teamMemberIds = [session.user.id, ...(team?.members.map(m => m.userId) || [])]
    if (!teamMemberIds.includes(userId)) {
      return NextResponse.json({ error: 'No puedes asignar tareas fuera de tu equipo' }, { status: 403 })
    }
  }

  if (!forceCreate) {
    const conflicts = await prisma.task.findMany({
      where: {
        userId, status: { not: 'TERMINADO' },
        AND: [{ startDate: { lte: new Date(endDate) } }, { endDate: { gte: new Date(startDate) } }],
      },
      include: { project: true },
    })
    if (conflicts.length > 0) return NextResponse.json({ conflicts }, { status: 409 })
  }

  const task = await prisma.task.create({
    data: {
      name, description: description || '',
      startDate: new Date(startDate), endDate: new Date(endDate),
      status: status || 'PENDIENTE', progress: progress || 0,
      projectId, userId,
    },
    include: { project: true, user: true, pauseLogs: true },
  })

  if (userId !== session.user.id) {
    const days = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1
    const startFmt = format(new Date(startDate), "dd 'de' MMMM", { locale: es })
    const endFmt = format(new Date(endDate), "dd 'de' MMMM", { locale: es })
    await prisma.notification.create({
      data: {
        userId, taskId: task.id,
        title: '📋 Nueva tarea asignada',
        message: `"${name}" — del ${startFmt} al ${endFmt} (${days} días). Proyecto: ${task.project.name}`,
      },
    })
  }

  return NextResponse.json(task, { status: 201 })
}
