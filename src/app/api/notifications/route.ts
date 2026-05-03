// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(notifications)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { markAllRead, id } = body

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id },
      data: { read: true },
    })
  } else if (id) {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    })
  }

  return NextResponse.json({ success: true })
}
