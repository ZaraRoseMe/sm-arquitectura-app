// src/app/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'SM Arquitectura — Gestión de Proyectos',
  description: 'Plataforma de gestión de proyectos y tiempos para SM Arquitectura',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><rect width='60' height='60' rx='12' fill='%231e1b4b'/><polygon points='30,4 52,17 52,43 30,56 8,43 8,17' stroke='white' stroke-width='1' fill='none'/><polygon points='30,14 44,22 44,38 30,46 16,38 16,22' stroke='rgba(255,255,255,0.4)' stroke-width='0.8' fill='none'/><line x1='30' y1='14' x2='30' y2='30' stroke='rgba(255,255,255,0.4)' stroke-width='0.7'/><line x1='44' y1='22' x2='30' y2='30' stroke='rgba(255,255,255,0.4)' stroke-width='0.7'/><line x1='44' y1='38' x2='30' y2='30' stroke='rgba(255,255,255,0.4)' stroke-width='0.7'/><line x1='30' y1='46' x2='30' y2='30' stroke='rgba(255,255,255,0.4)' stroke-width='0.7'/><line x1='16' y1='38' x2='30' y2='30' stroke='rgba(255,255,255,0.4)' stroke-width='0.7'/><line x1='16' y1='22' x2='30' y2='30' stroke='rgba(255,255,255,0.4)' stroke-width='0.7'/><circle cx='30' cy='14' r='2' fill='rgba(255,255,255,0.6)'/><circle cx='44' cy='22' r='2' fill='rgba(255,255,255,0.6)'/><circle cx='44' cy='38' r='2' fill='rgba(255,255,255,0.6)'/><circle cx='30' cy='46' r='2' fill='rgba(255,255,255,0.6)'/><circle cx='16' cy='38' r='2' fill='rgba(255,255,255,0.6)'/><circle cx='16' cy='22' r='2' fill='rgba(255,255,255,0.6)'/><circle cx='30' cy='30' r='3.5' fill='white'/></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Playfair+Display:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '8px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
