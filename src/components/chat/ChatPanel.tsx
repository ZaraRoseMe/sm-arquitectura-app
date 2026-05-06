'use client'
// src/components/chat/ChatPanel.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageCircle, SmilePlus, ChevronDown, ChevronUp, Users, X } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const EMOJIS = ['😊','😂','👍','❤️','🔥','✅','⚠️','📋','🏗️','📅','👏','🙌','💪','🤔','👀','✍️','📌','🚀','⏰','💬']

interface User { id: string; name: string; color?: string }
interface Message {
  id: string; content: string; createdAt: string; read: boolean
  senderId: string; sender: { id: string; name: string; color?: string }
}
interface GroupMessage {
  id: string; content: string; createdAt: string
  senderId: string; sender: { id: string; name: string; color?: string }
}
interface Team {
  id: string; name: string
  coordinator: { id: string; name: string; color?: string }
  members: { user: User }[]
}

// Una "ventana" puede ser un DM o el chat grupal
interface ChatWindow {
  id: string          // userId para DM, teamId para grupo
  type: 'dm' | 'group'
  label: string
  color: string
  minimized: boolean
  unread: number
  lastSender?: string  // para notificación parpadeante
}

interface ChatPanelProps {
  currentUserId: string
  users: User[]
  team?: Team | null
  userRole?: string
}

export default function ChatPanel({ currentUserId, users, team, userRole }: ChatPanelProps) {
  const [listOpen, setListOpen] = useState(false)
  const [windows, setWindows] = useState<ChatWindow[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})       // keyed by userId
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [showEmojis, setShowEmojis] = useState<Record<string, boolean>>({})
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({})
  const [groupUnread, setGroupUnread] = useState(0)
  const [lastGroupMsgId, setLastGroupMsgId] = useState<string | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const otherUsers = users.filter(u => u.id !== currentUserId)
  const totalUnread = Object.values(dmUnread).reduce((a, b) => a + b, 0) + groupUnread

  // ─── Fetch DM unread ─────────────────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    const res = await fetch('/api/messages/unread')
    if (res.ok) {
      const data = await res.json()
      const map: Record<string, number> = {}
      data.forEach((d: any) => { map[d.senderId] = d._count.id })
      setDmUnread(map)
      // Actualizar unread en ventanas minimizadas
      setWindows(prev => prev.map(w => {
        if (w.type === 'dm' && map[w.id] > 0) {
          const sender = users.find(u => u.id === w.id)
          return { ...w, unread: map[w.id], lastSender: sender?.name }
        }
        return w
      }))
    }
  }, [users])

  // ─── Fetch DM messages ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages?with=${userId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => ({ ...prev, [userId]: data }))
      setDmUnread(prev => { const n = { ...prev }; delete n[userId]; return n })
      setWindows(prev => prev.map(w => w.id === userId ? { ...w, unread: 0, lastSender: undefined } : w))
    }
  }, [])

  // ─── Fetch group messages ────────────────────────────────────────────────
  const fetchGroupMessages = useCallback(async () => {
    if (!team) return
    const res = await fetch(`/api/group-messages?teamId=${team.id}`)
    if (res.ok) {
      const data: GroupMessage[] = await res.json()
      setGroupMessages(data)
      // Calcular no leídos
      const win = windows.find(w => w.type === 'group')
      if (win?.minimized && data.length > 0) {
        const lastId = lastGroupMsgId
        if (lastId) {
          const idx = data.findIndex(m => m.id === lastId)
          const newMsgs = idx >= 0 ? data.slice(idx + 1).filter(m => m.senderId !== currentUserId) : []
          if (newMsgs.length > 0) {
            setGroupUnread(newMsgs.length)
            setWindows(prev => prev.map(w => w.type === 'group'
              ? { ...w, unread: newMsgs.length, lastSender: newMsgs[newMsgs.length-1].sender?.name }
              : w))
          }
        }
      }
    }
  }, [team, windows, lastGroupMsgId, currentUserId])

  useEffect(() => {
    fetchUnread()
    const i = setInterval(fetchUnread, 5000)
    return () => clearInterval(i)
  }, [fetchUnread])

  useEffect(() => {
    if (!team) return
    fetchGroupMessages()
    const i = setInterval(fetchGroupMessages, 3000)
    return () => clearInterval(i)
  }, [team])

  // Poll DMs abiertos
  useEffect(() => {
    const openDMs = windows.filter(w => w.type === 'dm' && !w.minimized)
    if (openDMs.length === 0) return
    const intervals = openDMs.map(w => setInterval(() => fetchMessages(w.id), 3000))
    return () => intervals.forEach(clearInterval)
  }, [windows.filter(w => w.type === 'dm' && !w.minimized).map(w => w.id).join(',')])

  // Scroll al final
  useEffect(() => {
    Object.keys(messagesEndRefs.current).forEach(id => {
      messagesEndRefs.current[id]?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages, groupMessages])

  // ─── Abrir ventana ───────────────────────────────────────────────────────
  function openDM(user: User) {
    setListOpen(false)
    const exists = windows.find(w => w.id === user.id)
    if (exists) {
      setWindows(prev => prev.map(w => w.id === user.id ? { ...w, minimized: false } : w))
    } else {
      setWindows(prev => [...prev, {
        id: user.id, type: 'dm', label: user.name,
        color: user.color || '#6366F1', minimized: false, unread: 0,
      }])
    }
    fetchMessages(user.id)
  }

  function openGroup() {
    setListOpen(false)
    if (!team) return
    const exists = windows.find(w => w.type === 'group')
    if (exists) {
      setWindows(prev => prev.map(w => w.type === 'group' ? { ...w, minimized: false, unread: 0, lastSender: undefined } : w))
    } else {
      setWindows(prev => [{
        id: team.id, type: 'group', label: team.name,
        color: team.coordinator?.color || '#F59E0B', minimized: false, unread: 0,
      }, ...prev])
    }
    setGroupUnread(0)
    if (groupMessages.length > 0) setLastGroupMsgId(groupMessages[groupMessages.length - 1].id)
  }

  function toggleMinimize(id: string) {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w
      const nowOpen = w.minimized
      if (nowOpen) {
        // Al abrir, marcar como leído
        if (w.type === 'dm') fetchMessages(id)
        if (w.type === 'group') {
          setGroupUnread(0)
          if (groupMessages.length > 0) setLastGroupMsgId(groupMessages[groupMessages.length - 1].id)
        }
        return { ...w, minimized: false, unread: 0, lastSender: undefined }
      }
      return { ...w, minimized: true }
    }))
  }

  function closeWindow(id: string) {
    setWindows(prev => prev.filter(w => w.id !== id))
  }

  // ─── Send DM ─────────────────────────────────────────────────────────────
  async function sendDM(userId: string) {
    const text = inputs[userId]?.trim()
    if (!text || loading[userId]) return
    setLoading(prev => ({ ...prev, [userId]: true }))
    const optimistic: Message = {
      id: Date.now().toString(), content: text, createdAt: new Date().toISOString(),
      read: false, senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' },
    }
    setMessages(prev => ({ ...prev, [userId]: [...(prev[userId] || []), optimistic] }))
    setInputs(prev => ({ ...prev, [userId]: '' }))
    setShowEmojis(prev => ({ ...prev, [userId]: false }))
    await fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, receiverId: userId }),
    })
    fetchMessages(userId)
    setLoading(prev => ({ ...prev, [userId]: false }))
    inputRefs.current[userId]?.focus()
  }

  // ─── Send group message ───────────────────────────────────────────────────
  async function sendGroupMsg() {
    if (!team) return
    const text = inputs[team.id]?.trim()
    if (!text || loading[team.id]) return
    setLoading(prev => ({ ...prev, [team.id]: true }))
    const optimistic: GroupMessage = {
      id: Date.now().toString(), content: text, createdAt: new Date().toISOString(),
      senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' },
    }
    setGroupMessages(prev => [...prev, optimistic])
    setInputs(prev => ({ ...prev, [team.id]: '' }))
    setShowEmojis(prev => ({ ...prev, [team.id]: false }))
    await fetch('/api/group-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, teamId: team.id }),
    })
    fetchGroupMessages()
    setLoading(prev => ({ ...prev, [team.id]: false }))
    inputRefs.current[team.id]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent, winId: string, isGroup: boolean) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isGroup ? sendGroupMsg() : sendDM(winId)
    }
  }

  // ─── Render ventana ───────────────────────────────────────────────────────
  function renderWindow(win: ChatWindow) {
    const isGroup = win.type === 'group'
    const msgs = isGroup ? groupMessages : (messages[win.id] || [])
    const input = inputs[win.id] || ''
    const isEmoji = showEmojis[win.id] || false

    return (
      <div key={win.id} className="flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl border border-b-0 border-gray-100 dark:border-neutral-800"
        style={{ width: 260, height: win.minimized ? 'auto' : 380 }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl cursor-pointer select-none border-b border-gray-100 dark:border-neutral-800"
          style={{ backgroundColor: `${win.color}18` }}
          onClick={() => toggleMinimize(win.id)}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: win.color, fontSize: 9 }}>
            {isGroup ? <Users style={{ width: 12, height: 12 }} /> : getInitials(win.label).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-semibold truncate',
              win.unread > 0 && win.minimized ? 'animate-pulse' : '',
              'text-gray-900 dark:text-white')}>
              {win.label}
            </p>
            {win.minimized && win.unread > 0 && win.lastSender && (
              <p className="text-[10px] text-gray-400 truncate">{win.lastSender}</p>
            )}
          </div>
          {win.unread > 0 && (
            <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center flex-shrink-0">
              {win.unread}
            </span>
          )}
          {win.minimized
            ? <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
          }
          <button onClick={e => { e.stopPropagation(); closeWindow(win.id) }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X style={{ width: 10, height: 10 }} />
          </button>
        </div>

        {/* Contenido (solo si no minimizado) */}
        {!win.minimized && (
          <>
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <MessageCircle className="w-6 h-6 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">
                    {isGroup ? 'Bienvenidos al chat del equipo' : 'Inicia la conversación'}
                  </p>
                </div>
              )}
              {msgs.map((msg, i) => {
                const isMe = msg.senderId === currentUserId
                const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(msgs[i-1].createdAt).toDateString()
                const bubbleColor = isMe ? win.color : undefined
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-1">
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                          {formatDate(msg.createdAt, 'dd MMM')}
                        </span>
                      </div>
                    )}
                    <div className={cn('flex gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
                      {!isMe && isGroup && (
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-1"
                          style={{ backgroundColor: msg.sender?.color || '#6366F1', fontSize: 8 }}>
                          {getInitials(msg.sender?.name || '').charAt(0)}
                        </div>
                      )}
                      <div className="max-w-[80%]">
                        {!isMe && isGroup && (
                          <p className="text-[9px] text-gray-400 mb-0.5 pl-1">{msg.sender?.name}</p>
                        )}
                        <div className={cn('px-2.5 py-1.5 rounded-2xl text-xs',
                          isMe ? 'rounded-br-sm text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-bl-sm')}
                          style={isMe ? { backgroundColor: bubbleColor } : undefined}>
                          <p className="break-words leading-relaxed">{msg.content}</p>
                          <p className={cn('text-[9px] mt-0.5 text-right', isMe ? 'text-white/60' : 'text-gray-400')}>
                            {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            {isMe && !isGroup && <span className="ml-1">{(msg as Message).read ? '✓✓' : '✓'}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={el => { messagesEndRefs.current[win.id] = el }} />
            </div>

            {/* Emojis */}
            {isEmoji && (
              <div className="px-2 py-1.5 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap gap-1">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => {
                    setInputs(prev => ({ ...prev, [win.id]: (prev[win.id] || '') + e }))
                    inputRefs.current[win.id]?.focus()
                  }} className="text-sm hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-2 py-2 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-1.5">
              <button onClick={() => setShowEmojis(prev => ({ ...prev, [win.id]: !prev[win.id] }))}
                className={cn('flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors', isEmoji && 'text-brand-500')}>
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
              <input
                ref={el => { inputRefs.current[win.id] = el }}
                value={input}
                onChange={e => setInputs(prev => ({ ...prev, [win.id]: e.target.value }))}
                onKeyDown={e => handleKeyDown(e, win.id, isGroup)}
                placeholder="Mensaje..."
                className="flex-1 text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 outline-none focus:border-brand-400" />
              <button
                onClick={() => isGroup ? sendGroupMsg() : sendDM(win.id)}
                disabled={!input.trim() || loading[win.id]}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
                style={{ backgroundColor: win.color }}>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">

      {/* Ventanas apiladas — de derecha a izquierda, la más reciente más a la derecha */}
      {[...windows].reverse().map(win => renderWindow(win))}

      {/* Barra de mensajes */}
      <div className="bg-white dark:bg-neutral-900 border border-b-0 border-gray-200 dark:border-neutral-700 rounded-t-2xl shadow-xl" style={{ minWidth: 200 }}>
        <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
          onClick={() => setListOpen(v => !v)}>
          <MessageCircle className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Mensajes</span>
          {totalUnread > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium min-w-[18px] text-center">{totalUnread}</span>
          )}
          <ChevronUp className={cn('w-4 h-4 text-gray-400 ml-auto transition-transform', listOpen && 'rotate-180')} />
        </div>

        {listOpen && (
          <div className="border-t border-gray-100 dark:border-neutral-800" style={{ maxHeight: 320, overflowY: 'auto', width: 220 }}>

            {/* Chat de equipo */}
            {team && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2 pb-1">Mi equipo</p>
                <button onClick={openGroup}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left border-b border-gray-100 dark:border-neutral-800">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: team.coordinator?.color || '#F59E0B' }}>
                      <Users className="w-4 h-4" />
                    </div>
                    {groupUnread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{groupUnread}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{team.name}</p>
                    <p className="text-xs text-gray-400">Chat grupal</p>
                  </div>
                </button>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2 pb-1">General</p>
              </div>
            )}

            {/* DMs */}
            <div className="divide-y divide-gray-50 dark:divide-neutral-800">
              {otherUsers.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-3 text-center">No hay otros usuarios</p>
              )}
              {otherUsers.map(u => (
                <button key={u.id} onClick={() => openDM(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: u.color || '#6366F1' }}>
                      {getInitials(u.name)}
                    </div>
                    {dmUnread[u.id] > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{dmUnread[u.id]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    {dmUnread[u.id] > 0 && <p className="text-xs text-brand-500">{dmUnread[u.id]} nuevo{dmUnread[u.id] > 1 ? 's' : ''}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
