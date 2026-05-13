// src/app/api/push-subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// POST — guardar suscripción del navegador
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, p256dh, auth: authKey } = await req.json()

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Upsert — si ya existe este endpoint, actualizar
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth: authKey, userId: session.user.id },
    create: { endpoint, p256dh, auth: authKey, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}

// DELETE — eliminar suscripción (cuando el usuario rechaza permisos)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
