// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: { include: { user: true, pauseLogs: true } },
      team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { name, description, startDate, endDate, color, teamId } = body

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: new Date(`${startDate}T12:00:00.000Z`) }),
      ...(endDate && { endDate: new Date(`${endDate}T12:00:00.000Z`) }),
      ...(color && { color }),
      // teamId puede ser string (asignar) o null (desasignar)
      ...('teamId' in body && { teamId: teamId || null }),
    },
    include: {
      tasks: { include: { user: true, pauseLogs: true } },
      team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
    },
  })
  return NextResponse.json(project)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
