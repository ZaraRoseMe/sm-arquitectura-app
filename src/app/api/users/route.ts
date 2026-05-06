// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, name: true, email: true,
      role: true, color: true, createdAt: true,
      ledTeam: { select: { id: true, name: true } },
      teamMemberships: { select: { team: { select: { id: true, name: true, coordinator: { select: { id: true, name: true } } } } } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { username, name, password, role, color, teamName } = await req.json()

  if (!username || !name || !password) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { username, name, password: hashed, role: role || 'COLABORADOR', color: color || '#6366F1' },
    select: {
      id: true, username: true, name: true, email: true,
      role: true, color: true, createdAt: true,
      ledTeam: { select: { id: true, name: true } },
      teamMemberships: { select: { team: { select: { id: true, name: true, coordinator: { select: { id: true, name: true } } } } } },
    },
  })

  // Si es COORDINADOR, crear su equipo automáticamente
  if (role === 'COORDINADOR') {
    await prisma.team.create({
      data: {
        name: teamName || `Equipo de ${name}`,
        coordinatorId: user.id,
      },
    })
  }

  return NextResponse.json(user, { status: 201 })
}
