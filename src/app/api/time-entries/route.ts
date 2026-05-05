// src/app/api/time-entries/route.ts
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
  const projectId = searchParams.get('projectId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const isAdmin = session.user.role === 'ADMIN'

  const entries = await prisma.timeEntry.findMany({
    where: {
      // Non-admins can only see their own entries
      userId: isAdmin ? (userId || undefined) : session.user.id,
      ...(projectId && { task: { projectId } }),
      ...(from && to && {
        date: {
          gte: parseLocalDate(from),
          lte: parseLocalDate(to),
        }
      }),
    },
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId, date, hours, minutes, note } = await req.json()

  if (!taskId || !date) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      userId: session.user.id,
      date: parseLocalDate(date),
      hours: hours || 0,
      minutes: minutes || 0,
      note: note || null,
    },
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
