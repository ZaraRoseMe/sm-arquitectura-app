// src/app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })

  // Solo el coordinador del equipo puede editar el nombre
  const team = await prisma.team.findUnique({ where: { id } })
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  if (team.coordinatorId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo el coordinador puede editar el nombre' }, { status: 403 })
  }

  const updated = await prisma.team.update({
    where: { id },
    data: { name: name.trim() },
  })

  return NextResponse.json(updated)
}
