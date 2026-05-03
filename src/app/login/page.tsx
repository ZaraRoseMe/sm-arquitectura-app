'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      toast.error('Credenciales incorrectas')
    } else {
      router.push('/dashboard')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-950 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99,102,241,0.4) 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, rgba(79,82,229,0.3) 0%, transparent 50%)`,
            }}
          />
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-display text-xl font-medium">SM Arquitectura</span>
          </div>

          <div>
            <h1 className="text-white font-display text-5xl font-medium leading-tight mb-6">
              Gestión<br />de Proyectos
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              Planifica, coordina y supervisa todos tus proyectos arquitectónicos en un solo lugar.
            </p>
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '3', label: 'Proyectos activos' },
              { value: '11', label: 'Tareas en curso' },
              { value: '4', label: 'Colaboradores' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-white text-2xl font-semibold mb-1">{stat.value}</div>
                <div className="text-white/50 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ZR Nexus branding — solo texto */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-white/40 text-xs">
              desarrollado por{' '}
              <span
                className="text-white/70"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '13px' }}
              >
                ZR Nexus
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-medium">SM Arquitectura</span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Iniciar sesión</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="tu@smarquitectura.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Credenciales de demo</p>
            <div className="space-y-2">
              {[
                { role: 'Admin', email: 'admin@smarquitectura.com', pass: 'admin123' },
                { role: 'Colaborador', email: 'ana@smarquitectura.com', pass: 'user123' },
              ].map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => { setEmail(cred.email); setPassword(cred.pass) }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{cred.role}</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{cred.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Usar →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ZR Nexus mobile */}
          <p className="mt-6 text-center text-xs text-gray-400 lg:hidden">
            desarrollado por{' '}
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}>ZR Nexus</span>
          </p>
        </div>
      </div>
    </div>
  )
}
