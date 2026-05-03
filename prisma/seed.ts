// prisma/seed.ts
import { PrismaClient, Role, TaskStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await prisma.notification.deleteMany()
  await prisma.pauseLog.deleteMany()
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword = await bcrypt.hash('user123', 12)

  const admin = await prisma.user.create({
    data: {
      name: 'Carlos Mendoza',
      email: 'admin@smarquitectura.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  })

  const user1 = await prisma.user.create({
    data: {
      name: 'Ana García',
      email: 'ana@smarquitectura.com',
      password: userPassword,
      role: Role.COLABORADOR,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      name: 'Luis Ramírez',
      email: 'luis@smarquitectura.com',
      password: userPassword,
      role: Role.COLABORADOR,
    },
  })

  const user3 = await prisma.user.create({
    data: {
      name: 'María Torres',
      email: 'maria@smarquitectura.com',
      password: userPassword,
      role: Role.COLABORADOR,
    },
  })

  console.log('✅ Users created')

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Residencia Los Pinos',
      description: 'Diseño y construcción de residencia unifamiliar de 3 niveles en zona residencial.',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-08-30'),
      color: '#3B82F6',
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Torre Corporativa Centro',
      description: 'Proyecto de torre de oficinas de 12 pisos en el centro de la ciudad.',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2026-06-30'),
      color: '#10B981',
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'Remodelación Hotel Pacífico',
      description: 'Remodelación integral de hotel boutique frente al mar.',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-11-30'),
      color: '#F59E0B',
    },
  })

  console.log('✅ Projects created')

  // Create tasks
  const now = new Date()

  await prisma.task.createMany({
    data: [
      // Project 1 tasks
      {
        name: 'Levantamiento topográfico',
        description: 'Medición y análisis del terreno',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-25'),
        status: TaskStatus.TERMINADO,
        progress: 100,
        projectId: project1.id,
        userId: user1.id,
      },
      {
        name: 'Anteproyecto arquitectónico',
        description: 'Diseño conceptual y plantas',
        startDate: new Date('2025-01-26'),
        endDate: new Date('2025-02-20'),
        status: TaskStatus.TERMINADO,
        progress: 100,
        projectId: project1.id,
        userId: user1.id,
      },
      {
        name: 'Proyecto ejecutivo',
        description: 'Planos constructivos completos',
        startDate: new Date('2025-02-21'),
        endDate: new Date('2025-04-15'),
        status: TaskStatus.EN_PROGRESO,
        progress: 65,
        projectId: project1.id,
        userId: user2.id,
      },
      {
        name: 'Especificaciones técnicas',
        description: 'Catálogo de conceptos y especificaciones',
        startDate: new Date('2025-03-15'),
        endDate: new Date('2025-04-30'),
        status: TaskStatus.EN_PROGRESO,
        progress: 40,
        projectId: project1.id,
        userId: user3.id,
      },
      {
        name: 'Supervisión de obra',
        description: 'Visitas y supervisión semanal',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-08-30'),
        status: TaskStatus.PENDIENTE,
        progress: 0,
        projectId: project1.id,
        userId: user1.id,
      },
      // Project 2 tasks
      {
        name: 'Estudios de factibilidad',
        description: 'Análisis de suelo y factibilidad del proyecto',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        status: TaskStatus.TERMINADO,
        progress: 100,
        projectId: project2.id,
        userId: user2.id,
      },
      {
        name: 'Diseño estructural',
        description: 'Cálculo y diseño de estructura',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-06-30'),
        status: TaskStatus.EN_PROGRESO,
        progress: 55,
        projectId: project2.id,
        userId: user3.id,
      },
      {
        name: 'Diseño de fachadas',
        description: 'Diseño de fachadas y acabados exteriores',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-07-31'),
        status: TaskStatus.PENDIENTE,
        progress: 0,
        projectId: project2.id,
        userId: user1.id,
      },
      // Project 3 tasks
      {
        name: 'Diagnóstico de instalaciones',
        description: 'Evaluación de instalaciones existentes',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-03-20'),
        status: TaskStatus.TERMINADO,
        progress: 100,
        projectId: project3.id,
        userId: user3.id,
      },
      {
        name: 'Diseño de interiores',
        description: 'Concepto y diseño de espacios interiores',
        startDate: new Date('2025-03-21'),
        endDate: new Date('2025-05-31'),
        status: TaskStatus.EN_PROGRESO,
        progress: 70,
        projectId: project3.id,
        userId: user2.id,
      },
      {
        name: 'Coordinación con contratistas',
        description: 'Gestión y coordinación con empresas constructoras',
        startDate: new Date('2025-04-15'),
        endDate: new Date('2025-11-30'),
        status: TaskStatus.PAUSADO,
        progress: 20,
        projectId: project3.id,
        userId: user1.id,
      },
    ],
  })

  console.log('✅ Tasks created')

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        title: 'Nueva tarea asignada',
        message: 'Se te asignó la tarea "Supervisión de obra" en Residencia Los Pinos',
        read: false,
      },
      {
        userId: user2.id,
        title: 'Nueva tarea asignada',
        message: 'Se te asignó la tarea "Diseño de interiores" en Hotel Pacífico',
        read: false,
      },
      {
        userId: user3.id,
        title: 'Tarea próxima a vencer',
        message: 'La tarea "Diseño estructural" vence en 30 días',
        read: true,
      },
    ],
  })

  console.log('✅ Notifications created')
  console.log('\n🎉 Seed completed!')
  console.log('\n📋 Credentials:')
  console.log('  Admin:       admin@smarquitectura.com / admin123')
  console.log('  Ana García:  ana@smarquitectura.com / user123')
  console.log('  Luis Ramírez: luis@smarquitectura.com / user123')
  console.log('  María Torres: maria@smarquitectura.com / user123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
