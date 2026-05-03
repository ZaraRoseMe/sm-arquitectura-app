// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    include: {
      tasks: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, startDate, endDate, color } = body

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      color: color || '#3B82F6',
    },
  })

  return NextResponse.json(project, { status: 201 })
}
