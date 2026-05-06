// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

// Include recursivo — soporta hasta 5 niveles de profundidad
const projectInclude: any = {
  tasks: { include: { user: true } },
  _count: { select: { tasks: true } },
  team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
  children: {
    orderBy: { name: 'asc' },
    include: {
      tasks: { include: { user: true } },
      _count: { select: { tasks: true } },
      team: { include: { coordinator: { select: { id: true, name: true, color: true } } } },
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
    },
  },
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Solo nodos raíz — los hijos vienen anidados
  const projects = await prisma.project.findMany({
    where: { parentId: null },
    include: projectInclude,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, startDate, endDate, color, teamId, parentId } = body

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  // Heredar color del padre si no se especifica
  let resolvedColor = color || '#3B82F6'
  if (parentId && !color) {
    const parent = await prisma.project.findUnique({ where: { id: parentId } })
    if (parent) resolvedColor = parent.color
  }

  const project = await prisma.project.create({
    data: {
      name,
      description: description || '',
      startDate: parseLocalDate(startDate),
      endDate: parseLocalDate(endDate),
      color: resolvedColor,
      ...(teamId ? { teamId } : {}),
      ...(parentId ? { parentId } : {}),
    },
    include: projectInclude,
  })

  return NextResponse.json(project, { status: 201 })
}
