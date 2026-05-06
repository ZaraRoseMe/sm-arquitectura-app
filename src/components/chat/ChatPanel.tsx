'use client'
// src/components/chat/ChatPanel.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, MessageCircle, SmilePlus, ChevronDown, ChevronUp, Users } from 'lucide-react'
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
interface ChatPanelProps {
  currentUserId: string
  users: User[]
  team?: Team | null // equipo del usuario si es coordinador o miembro
  userRole?: string
}

type ChatView = 'list' | 'dm' | 'group'

export default function ChatPanel({ currentUserId, users, team, userRole }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ChatView>('list')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [groupUnread, setGroupUnread] = useState(0)
  const [lastGroupMsgId, setLastGroupMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout>()

  const hasTeam = !!team
  const otherUsers = users.filter(u => u.id !== currentUserId)
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0) + groupUnread

  // ─── Fetch unread DMs ────────────────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    const res = await fetch('/api/messages/unread')
    if (res.ok) {
      const data = await res.json()
      const map: Record<string, number> = {}
      data.forEach((d: any) => { map[d.senderId] = d._count.id })
      setUnread(map)
    }
  }, [])

  // ─── Fetch DM messages ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages?with=${userId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data)
      setUnread(prev => { const n = { ...prev }; delete n[userId]; return n })
    }
  }, [])

  // ─── Fetch group messages ────────────────────────────────────────────────
  const fetchGroupMessages = useCallback(async () => {
    if (!team) return
    const res = await fetch(`/api/group-messages?teamId=${team.id}`)
    if (res.ok) {
      const data: GroupMessage[] = await res.json()
      setGroupMessages(data)
      // Calcular no leídos del grupo (mensajes nuevos desde el último que vimos)
      if (view !== 'group' && data.length > 0) {
        const lastId = lastGroupMsgId
        if (lastId) {
          const idx = data.findIndex(m => m.id === lastId)
          const newMsgs = idx >= 0 ? data.slice(idx + 1).filter(m => m.senderId !== currentUserId) : []
          setGroupUnread(newMsgs.length)
        }
      }
    }
  }, [team, view, lastGroupMsgId, currentUserId])

  useEffect(() => {
    fetchUnread()
    const i = setInterval(fetchUnread, 10000)
    return () => clearInterval(i)
  }, [fetchUnread])

  useEffect(() => {
    if (!team) return
    fetchGroupMessages()
    const i = setInterval(fetchGroupMessages, 3000)
    return () => clearInterval(i)
  }, [fetchGroupMessages, team])

  useEffect(() => {
    if (!selectedUser) return
    fetchMessages(selectedUser.id)
    pollRef.current = setInterval(() => fetchMessages(selectedUser.id), 3000)
    return () => clearInterval(pollRef.current)
  }, [selectedUser, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, groupMessages])

  // Cuando abro el grupo, marcar como leído
  useEffect(() => {
    if (view === 'group' && groupMessages.length > 0) {
      setGroupUnread(0)
      setLastGroupMsgId(groupMessages[groupMessages.length - 1].id)
    }
  }, [view, groupMessages])

  // ─── Send DM ─────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || !selectedUser || loading) return
    setLoading(true)
    const optimistic: Message = {
      id: Date.now().toString(), content: input.trim(), createdAt: new Date().toISOString(),
      read: false, senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' },
    }
    setMessages(prev => [...prev, optimistic])
    const text = input.trim()
    setInput(''); setShowEmojis(false)
    await fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, receiverId: selectedUser.id }),
    })
    fetchMessages(selectedUser.id)
    setLoading(false)
    inputRef.current?.focus()
  }

  // ─── Send group message ───────────────────────────────────────────────────
  async function sendGroupMessage() {
    if (!input.trim() || !team || loading) return
    setLoading(true)
    const optimistic: GroupMessage = {
      id: Date.now().toString(), content: input.trim(), createdAt: new Date().toISOString(),
      senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' },
    }
    setGroupMessages(prev => [...prev, optimistic])
    const text = input.trim()
    setInput(''); setShowEmojis(false)
    await fetch('/api/group-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, teamId: team.id }),
    })
    fetchGroupMessages()
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      view === 'group' ? sendGroupMessage() : sendMessage()
    }
    if (e.key === 'Escape') setShowEmojis(false)
  }

  function openChat(user: User) { setSelectedUser(user); setView('dm'); setIsOpen(true) }
  function openGroup() { setView('group'); setIsOpen(true) }
  function goBack() { setView('list'); setSelectedUser(null) }

  // ─── Render mensaje (DM o grupo) ──────────────────────────────────────────
  function renderMessages(msgs: (Message | GroupMessage)[], isGroup = false) {
    return msgs.map((msg, i) => {
      const isMe = msg.senderId === currentUserId
      const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(msgs[i-1].createdAt).toDateString()
      const color = isMe ? (selectedUser?.color || team?.coordinator?.color || '#6366F1') : (msg.sender?.color || '#6366F1')

      return (
        <div key={msg.id}>
          {showDate && (
            <div className="flex justify-center my-1">
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                {formatDate(msg.createdAt, 'dd MMM')}
              </span>
            </div>
          )}
          <div className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
            {!isMe && isGroup && (
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-1"
                style={{ backgroundColor: msg.sender?.color || '#6366F1', fontSize: 9 }}>
                {getInitials(msg.sender?.name || '').charAt(0)}
              </div>
            )}
            <div className="max-w-[78%]">
              {!isMe && isGroup && (
                <p className="text-[10px] text-gray-400 mb-0.5 pl-1">{msg.sender?.name}</p>
              )}
              <div className={cn('px-3 py-1.5 rounded-2xl text-xs',
                isMe ? 'rounded-br-sm text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-bl-sm')}
                style={isMe ? { backgroundColor: color } : undefined}>
                <p className="break-words">{msg.content}</p>
                <p className={cn('text-[10px] mt-0.5 text-right', isMe ? 'text-white/60' : 'text-gray-400')}>
                  {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  {isMe && !isGroup && <span className="ml-1">{(msg as Message).read ? '✓✓' : '✓'}</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    })
  }

  const activeColor = view === 'group' ? (team?.coordinator?.color || '#F59E0B') : (selectedUser?.color || '#6366F1')

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">

      {/* Ventana de conversación */}
      {isOpen && (view === 'dm' || view === 'group') && (
        <div className="w-72 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl border border-b-0 border-gray-100 dark:border-neutral-800 flex flex-col" style={{ height: 400 }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-neutral-800 rounded-t-2xl"
            style={{ backgroundColor: `${activeColor}18` }}>
            <button onClick={goBack} className="text-gray-400 hover:text-gray-600 text-xs">←</button>
            {view === 'group' ? (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: activeColor }}>
                <Users style={{ width: 12, height: 12 }} />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: activeColor }}>
                {getInitials(selectedUser?.name || '')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {view === 'group' ? team?.name : selectedUser?.name}
              </p>
              {view === 'group' && (
                <p className="text-[10px] text-gray-400">{(team?.members?.length || 0) + 1} miembros</p>
              )}
            </div>
            <button onClick={() => setIsOpen(false)}>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(view === 'group' ? groupMessages : messages).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-7 h-7 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">
                  {view === 'group' ? 'Bienvenidos al chat del equipo' : 'Inicia la conversación'}
                </p>
              </div>
            )}
            {view === 'group'
              ? renderMessages(groupMessages, true)
              : renderMessages(messages, false)
            }
            <div ref={messagesEndRef} />
          </div>

          {/* Emojis */}
          {showEmojis && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { setInput(p => p + e); inputRef.current?.focus() }}
                  className="text-base hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-2">
            <button onClick={() => setShowEmojis(v => !v)}
              className={cn('flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors', showEmojis && 'text-brand-500')}>
              <SmilePlus className="w-4 h-4" />
            </button>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Mensaje..." className="flex-1 text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 outline-none focus:border-brand-400" />
            <button onClick={view === 'group' ? sendGroupMessage : sendMessage}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
              style={{ backgroundColor: activeColor }}>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior */}
      <div className="bg-white dark:bg-neutral-900 border border-b-0 border-gray-200 dark:border-neutral-700 rounded-t-2xl shadow-xl" style={{ minWidth: 220 }}>
        {/* Header siempre visible */}
        <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
          onClick={() => { setIsOpen(!isOpen); if (isOpen) setView('list') }}>
          <MessageCircle className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Mensajes</span>
          {totalUnread > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium min-w-[18px] text-center">{totalUnread}</span>
          )}
          <ChevronUp className={cn('w-4 h-4 text-gray-400 ml-auto transition-transform', isOpen && 'rotate-180')} />
        </div>

        {/* Lista expandida */}
        {isOpen && view === 'list' && (
          <div className="border-t border-gray-100 dark:border-neutral-800" style={{ maxHeight: 320, overflowY: 'auto' }}>

            {/* Chat de equipo — primero y destacado */}
            {hasTeam && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2 pb-1">Mi equipo</p>
                <button onClick={openGroup}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left border-b border-gray-100 dark:border-neutral-800">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: team?.coordinator?.color || '#F59E0B' }}>
                      <Users className="w-4 h-4" />
                    </div>
                    {groupUnread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{groupUnread}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{team?.name}</p>
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
                <button key={u.id} onClick={() => openChat(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: u.color || '#6366F1' }}>
                      {getInitials(u.name)}
                    </div>
                    {unread[u.id] > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread[u.id]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    {unread[u.id] > 0 && <p className="text-xs text-brand-500">{unread[u.id]} nuevo{unread[u.id] > 1 ? 's' : ''}</p>}
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
