// src/app/api/teams/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// POST — agregar colaborador al equipo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: teamId } = await params
  const { userId } = await req.json()

  if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 })

  // Verificar que el usuario es COLABORADOR
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (user.role !== 'COLABORADOR') {
    return NextResponse.json({ error: 'Solo se pueden agregar colaboradores a un equipo' }, { status: 400 })
  }

  // Verificar que no esté ya en este equipo
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  if (existing) return NextResponse.json({ error: 'El usuario ya está en este equipo' }, { status: 409 })

  const member = await prisma.teamMember.create({
    data: { teamId, userId },
    include: {
      user: { select: { id: true, name: true, color: true, username: true } },
    },
  })

  return NextResponse.json(member, { status: 201 })
}

// DELETE — quitar colaborador del equipo
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: teamId } = await params
  const { userId } = await req.json()

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  })

  return NextResponse.json({ success: true })
}
