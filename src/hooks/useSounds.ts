// src/hooks/useSounds.ts
import { useCallback, useRef } from 'react'

export function useSounds() {
  const audioCtxRef = useRef<AudioContext | null>(null)

  function getCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  // Pop suave tipo Slack — para mensajes de chat
  const playChatSound = useCallback(() => {
    try {
      const ctx = getCtx()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08)

      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.12)
    } catch {}
  }, [])

  // Doble nota suave — para notificaciones del sistema (tareas, etc.)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getCtx()

      function playNote(freq: number, startTime: number, duration: number, volume: number) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      // Dos notas ascendentes suaves
      playNote(523, ctx.currentTime, 0.12, 0.15)        // Do
      playNote(659, ctx.currentTime + 0.1, 0.15, 0.12)  // Mi
    } catch {}
  }, [])

  return { playChatSound, playNotificationSound }
}
