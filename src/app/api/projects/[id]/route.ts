// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const projectInclude: any = {
  tasks: { include: { user: true, pauseLogs: true } },
  _count: { select: { tasks: true } },
  team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
  parent: { select: { id: true, name: true, color: true, parentId: true } },
  children: {
    orderBy: { name: 'asc' },
    include: {
      tasks: { include: { user: true } },
      _count: { select: { tasks: true } },
      children: {
        orderBy: { name: 'asc' },
        include: {
          tasks: { include: { user: true } },
          _count: { select: { tasks: true } },
          children: {
            orderBy: { name: 'asc' },
            include: {
              tasks: { include: { user: true } },
              _count: { select: { tasks: true } },
              children: { include: { tasks: true, _count: { select: { tasks: true } } } },
            },
          },
        },
      },
    },
  },
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: projectInclude,
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
  const { name, description, startDate, endDate, color, teamId, parentId } = body

  // Evitar ciclos — no se puede asignar como padre a un descendiente
  if (parentId) {
    const wouldCreateCycle = await checkCycle(id, parentId)
    if (wouldCreateCycle) {
      return NextResponse.json({ error: 'No se puede crear un ciclo en la jerarquía' }, { status: 400 })
    }
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: new Date(`${startDate}T12:00:00.000Z`) }),
      ...(endDate && { endDate: new Date(`${endDate}T12:00:00.000Z`) }),
      ...(color && { color }),
      ...('teamId' in body && { teamId: teamId || null }),
      ...('parentId' in body && { parentId: parentId || null }),
    },
    include: projectInclude,
  })
  return NextResponse.json(project)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params

  // Verificar si tiene hijos
  const childCount = await prisma.project.count({ where: { parentId: id } })
  if (childCount > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar — tiene ${childCount} subproyecto${childCount > 1 ? 's' : ''}. Elimínalos primero.` },
      { status: 409 }
    )
  }

  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// Verifica si asignar parentId a projectId crearía un ciclo
async function checkCycle(projectId: string, newParentId: string): Promise<boolean> {
  if (projectId === newParentId) return true
  let current = newParentId
  for (let i = 0; i < 20; i++) {
    const p = await prisma.project.findUnique({ where: { id: current }, select: { parentId: true } })
    if (!p?.parentId) return false
    if (p.parentId === projectId) return true
    current = p.parentId
  }
  return false
}
