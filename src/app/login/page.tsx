'use client'
// src/app/login/page.tsx
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

function KronozAnimatedLogo() {
  const [phase, setPhase] = useState(0)
  // phase 0: nada
  // phase 1: hexágonos aparecen
  // phase 2: líneas se dibujan
  // phase 3: nodos aparecen
  // phase 4: texto aparece

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setPhase(4), 1400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // Vértices del hexágono exterior (cx=55, cy=55, r=48)
  const outerR = 48
  const innerR = 28
  const cx = 55, cy = 55
  const angles = [90, 30, 330, 270, 210, 150] // empezando arriba

  function hex(r: number, i: number) {
    const a = (angles[i] * Math.PI) / 180
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }

  const outerPoints = Array.from({ length: 6 }, (_, i) => hex(outerR, i))
  const innerPoints = Array.from({ length: 6 }, (_, i) => hex(innerR, i))

  const outerPoly = outerPoints.map(p => `${p.x},${p.y}`).join(' ')
  const innerPoly = innerPoints.map(p => `${p.x},${p.y}`).join(' ')

  // Líneas desde cada vértice interior al centro
  const lines = innerPoints.map((p, i) => ({
    x1: p.x, y1: p.y, x2: cx, y2: cy,
    delay: i * 80,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <svg
        width="110" height="110" viewBox="0 0 110 110" fill="none"
        style={{ overflow: 'visible' }}>

        {/* Definición del clip para animar líneas */}
        <defs>
          {lines.map((_, i) => (
            <clipPath key={i} id={`clip-line-${i}`}>
              <rect
                x={cx - 1} y={cy - 1} width={2} height={2}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  animation: phase >= 2
                    ? `growLine${i} 0.5s ease-out ${_.delay}ms forwards`
                    : 'none',
                }}
              />
            </clipPath>
          ))}
        </defs>

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes drawLine {
            from { stroke-dashoffset: 60 }
            to   { stroke-dashoffset: 0 }
          }
          @keyframes popIn {
            from { transform: scale(0); opacity: 0 }
            to   { transform: scale(1); opacity: 1 }
          }
          .hex-outer {
            opacity: 0;
            animation: ${phase >= 1 ? 'fadeIn 0.6s ease forwards' : 'none'};
          }
          .hex-inner {
            opacity: 0;
            animation: ${phase >= 1 ? 'fadeIn 0.6s ease 0.2s forwards' : 'none'};
          }
          .anim-line {
            stroke-dasharray: 60;
            stroke-dashoffset: 60;
          }
          ${phase >= 2 ? lines.map((l, i) => `
            .anim-line-${i} {
              animation: drawLine 0.45s ease-out ${l.delay}ms forwards;
            }
          `).join('') : ''}
          .node-dot {
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
          }
          ${phase >= 3 ? innerPoints.map((_, i) => `
            .node-${i} {
              animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms forwards;
            }
          `).join('') : ''}
          .center-dot {
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
            animation: ${phase >= 3 ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 400ms forwards' : 'none'};
          }
        `}</style>

        {/* Hexágono exterior */}
        <polygon
          points={outerPoly}
          stroke="#6366F1"
          strokeWidth="0.8"
          fill="none"
          className="hex-outer"
        />

        {/* Hexágono interior */}
        <polygon
          points={innerPoly}
          stroke="#a5b4fc"
          strokeWidth="0.6"
          fill="none"
          className="hex-inner"
        />

        {/* Líneas al centro */}
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1} y1={l.y1} x2={cx} y2={cy}
            stroke="#a5b4fc"
            strokeWidth="0.7"
            className={`anim-line anim-line-${i}`}
          />
        ))}

        {/* Nodos en vértices interiores */}
        {innerPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r="2.2"
            fill="#a5b4fc"
            className={`node-dot node-${i}`}
          />
        ))}

        {/* Nodo central */}
        <circle cx={cx} cy={cy} r="3.5" fill="#6366F1" className="center-dot" />
      </svg>

      {/* Texto del logo */}
      <div style={{
        textAlign: 'center',
        opacity: phase >= 4 ? 1 : 0,
        transform: phase >= 4 ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 300,
          fontSize: '32px',
          color: '#1e1b4b',
          letterSpacing: '0.28em',
          lineHeight: 1,
        }}>
          KRONOZ
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '11px',
          color: '#a5b4fc',
          letterSpacing: '0.18em',
          marginTop: '6px',
        }}>
          by ZR Nexus
        </div>
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 50)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', { username, password, redirect: false })
    if (result?.error) toast.error('Usuario o contraseña incorrectos')
    else { router.push('/dashboard'); router.refresh() }
    setLoading(false)
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap"
        rel="stylesheet"
      />
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Halo índigo muy sutil arriba */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px', pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 0%, #e0e7ff 0%, transparent 70%)',
          opacity: 0.5,
        }} />

        {/* Contenedor centrado */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '48px',
          width: '100%',
          maxWidth: '360px',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}>

          {/* Logo animado */}
          <KronozAnimatedLogo />

          {/* Formulario */}
          <div style={{
            width: '100%',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
          }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" style={{ color: 'rgba(255,255,255,0.75)' }}>Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="input pl-9"
                    placeholder="tu_usuario"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <label className="label" style={{ color: 'rgba(255,255,255,0.75)' }}>Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pl-9 pr-10"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mt-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ingresando...</>
                  : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

        <style>{`
          input::placeholder { color: rgba(255,255,255,0.2); }
          input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 1000px #1e1b4b inset !important;
            -webkit-text-fill-color: white !important;
          }
        `}</style>
      </div>
    </>
  )
}
