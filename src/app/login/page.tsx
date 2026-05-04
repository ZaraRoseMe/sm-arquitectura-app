'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

function KronozLogo() {
  return (
    <div className="flex items-center gap-4">
      {/* Símbolo */}
      <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
        <polygon points="16,2 26,8 26,20 16,26 6,20 6,8" stroke="white" strokeWidth="1.5" fill="none"/>
        <polygon points="16,7 21,10 21,16 16,19 11,16 11,10" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" fill="none"/>
        <rect x="13" y="8" width="2" height="14" fill="white" rx="0.5"/>
        <polygon points="15,15 21,8 23.5,8 17.5,15" fill="white"/>
        <polygon points="15,16 21,22 23.5,22 17.5,16" fill="white"/>
        <circle cx="16" cy="0.5" r="1.2" fill="white"/>
        <circle cx="16" cy="29.5" r="1.2" fill="rgba(255,255,255,0.4)"/>
      </svg>
      {/* Texto */}
      <div>
        {/* K geométrica + RONOZ */}
        <div className="flex items-center">
          <svg width="38" height="44" viewBox="0 0 38 44" fill="none">
            <rect x="2" y="2" width="5.5" height="40" fill="white" rx="1"/>
            <polygon points="7.5,21 28,2 34,2 13,21" fill="white"/>
            <polygon points="7.5,23 28,42 34,42 13,23" fill="white"/>
          </svg>
          <span className="text-white font-bold tracking-tight" style={{ fontSize: '38px', lineHeight: 1, letterSpacing: '-0.5px' }}>RONOZ</span>
        </div>
        <p className="text-white/50 text-xs tracking-widest uppercase mt-0.5">Plataforma de gestión arquitectónica</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { username, password, redirect: false })
    if (result?.error) toast.error('Usuario o contraseña incorrectos')
    else { router.push('/dashboard'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-950 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99,102,241,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(79,82,229,0.3) 0%, transparent 50%)` }} />
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative">
          <div className="mb-16"><KronozLogo /></div>
          <div>
            <h1 className="text-white font-display text-4xl font-medium leading-tight mb-4">Gestiona tu estudio<br />con precisión.</h1>
            <p className="text-white/50 text-base leading-relaxed max-w-sm">Proyectos, equipos y tiempos — todo en un solo lugar.</p>
          </div>
        </div>

        <div className="relative space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {[{ value: '3', label: 'Proyectos activos' }, { value: '11', label: 'Tareas en curso' }, { value: '4', label: 'Colaboradores' }].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-white text-2xl font-semibold mb-1">{stat.value}</div>
                <div className="text-white/40 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-white/30 text-xs tracking-wide">by ZR Nexus</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <polygon points="16,2 26,8 26,20 16,26 6,20 6,8" stroke="#6366F1" strokeWidth="1.5" fill="none"/>
              <polygon points="16,7 21,10 21,16 16,19 11,16 11,10" stroke="#A5B4FC" strokeWidth="0.8" fill="none"/>
              <rect x="13" y="8" width="2" height="14" fill="#6366F1" rx="0.5"/>
              <polygon points="15,15 21,8 23.5,8 17.5,15" fill="#6366F1"/>
              <polygon points="15,16 21,22 23.5,22 17.5,16" fill="#6366F1"/>
              <circle cx="16" cy="0.5" r="1.2" fill="#6366F1"/>
              <circle cx="16" cy="29.5" r="1.2" fill="#A5B4FC"/>
            </svg>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight text-lg">KRONOZ</span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Iniciar sesión</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Ingresa tu usuario y contraseña para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="input pl-9" placeholder="tu_usuario" required autoComplete="username" />
              </div>
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-10" placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mt-2">
              {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ingresando...</>) : 'Ingresar'}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-gray-300 dark:text-gray-600">by ZR Nexus</p>
        </div>
      </div>
    </div>
  )
}
