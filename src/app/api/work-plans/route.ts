// src/app/api/work-plans/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const month = searchParams.get('month') // YYYY-MM

  const isAdmin = session.user.role === 'ADMIN'

  const plans = await prisma.workPlan.findMany({
    where: {
      userId: isAdmin ? (userId || undefined) : session.user.id,
      ...(month && {
        date: {
          gte: parseLocalDate(`${month}-01`),
          lte: parseLocalDate(`${month}-31`),
        }
      }),
    },
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo los administradores pueden programar tiempo' }, { status: 403 })
  }

  const { taskId, userId, date, hours, minutes, note } = await req.json()

  if (!taskId || !userId || !date) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const plan = await prisma.workPlan.create({
    data: {
      taskId,
      userId,
      date: parseLocalDate(date),
      hours: hours || 0,
      minutes: minutes || 0,
      note: note || null,
      createdBy: session.user.id,
    },
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, name: true, color: true } },
    },
  })

  // Notificar al usuario
  await prisma.notification.create({
    data: {
      userId,
      taskId,
      title: '📅 Tiempo programado',
      message: `Se te programaron ${hours}h${minutes > 0 ? ` ${minutes}min` : ''} en "${plan.task.name}" para el ${date}`,
    },
  })

  return NextResponse.json(plan, { status: 201 })
}
