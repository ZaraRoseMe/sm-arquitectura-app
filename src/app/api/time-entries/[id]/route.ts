// src/app/api/time-entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { hours, minutes, note } = await req.json()

  // Solo el dueño o admin puede editar
  const existing = await prisma.timeEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(hours !== undefined && { hours }),
      ...(minutes !== undefined && { minutes }),
      ...('note' in { hours, minutes, note } && { note: note || null }),
    },
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(entry)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.timeEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await prisma.timeEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
