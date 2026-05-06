// src/app/api/group-messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId')
  if (!teamId) return NextResponse.json({ error: 'Falta teamId' }, { status: 400 })

  const messages = await prisma.groupMessage.findMany({
    where: { teamId },
    include: {
      sender: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId, content } = await req.json()
  if (!teamId || !content) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  // Verificar que el usuario pertenece al equipo (como coordinador o miembro)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { select: { userId: true } } },
  })
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

  const isMember = team.coordinatorId === session.user.id || team.members.some(m => m.userId === session.user.id)
  if (!isMember) return NextResponse.json({ error: 'No perteneces a este equipo' }, { status: 403 })

  const message = await prisma.groupMessage.create({
    data: { teamId, senderId: session.user.id, content },
    include: {
      sender: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(message, { status: 201 })
}
