// src/app/api/time-entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const entry = await prisma.timeEntry.findUnique({ where: { id } })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only owner or admin can delete
  if (entry.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await prisma.timeEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
