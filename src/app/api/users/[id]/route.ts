// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const { name, role, password, color, teamName } = await req.json()

  const data: any = {
    ...(name && { name }),
    ...(role && { role }),
    ...(color && { color }),
  }
  if (password) data.password = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, username: true, name: true, email: true,
      role: true, color: true,
      ledTeam: { select: { id: true, name: true } },
      teamMemberships: { select: { team: { select: { id: true, name: true, coordinator: { select: { id: true, name: true } } } } } },
    },
  })

  // Si cambió a COORDINADOR y no tiene equipo, crear uno
  if (role === 'COORDINADOR') {
    const existingTeam = await prisma.team.findUnique({ where: { coordinatorId: id } })
    if (!existingTeam) {
      await prisma.team.create({
        data: {
          name: teamName || `Equipo de ${user.name}`,
          coordinatorId: id,
        },
      })
    } else if (teamName) {
      // Actualizar nombre del equipo si se provee
      await prisma.team.update({ where: { coordinatorId: id }, data: { name: teamName } })
    }
  }

  // Si cambió de COORDINADOR a otro rol, eliminar su equipo
  if (role && role !== 'COORDINADOR') {
    const existingTeam = await prisma.team.findUnique({ where: { coordinatorId: id } })
    if (existingTeam) {
      await prisma.team.delete({ where: { coordinatorId: id } })
    }
  }

  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params

  const taskCount = await prisma.task.count({ where: { userId: id } })
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar — tiene ${taskCount} tarea${taskCount > 1 ? 's' : ''} asignada${taskCount > 1 ? 's' : ''}. Reasígnalas primero.` },
      { status: 409 }
    )
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
