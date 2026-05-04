'use client'
// src/components/chat/ChatPanel.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, MessageCircle, SmilePlus, ChevronDown, ChevronUp } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const EMOJIS = ['😊','😂','👍','❤️','🔥','✅','⚠️','📋','🏗️','📅','👏','🙌','💪','🤔','👀','✍️','📌','🚀','⏰','💬']

interface User { id: string; name: string; color?: string }
interface Message {
  id: string; content: string; createdAt: string; read: boolean
  senderId: string; sender: { id: string; name: string; color?: string }
}
interface ChatPanelProps {
  currentUserId: string
  users: User[]
}

export default function ChatPanel({ currentUserId, users }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout>()

  const otherUsers = users.filter((u) => u.id !== currentUserId)
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  const fetchUnread = useCallback(async () => {
    const res = await fetch('/api/messages/unread')
    if (res.ok) {
      const data = await res.json()
      const map: Record<string, number> = {}
      data.forEach((d: any) => { map[d.senderId] = d._count.id })
      setUnread(map)
    }
  }, [])

  const fetchMessages = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages?with=${userId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data)
      setUnread((prev) => { const n = { ...prev }; delete n[userId]; return n })
    }
  }, [])

  useEffect(() => { fetchUnread(); const i = setInterval(fetchUnread, 10000); return () => clearInterval(i) }, [fetchUnread])

  useEffect(() => {
    if (!selectedUser) return
    fetchMessages(selectedUser.id)
    pollRef.current = setInterval(() => fetchMessages(selectedUser.id), 3000)
    return () => clearInterval(pollRef.current)
  }, [selectedUser, fetchMessages])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!input.trim() || !selectedUser || loading) return
    setLoading(true)
    const optimistic: Message = {
      id: Date.now().toString(), content: input.trim(), createdAt: new Date().toISOString(),
      read: false, senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' },
    }
    setMessages((prev) => [...prev, optimistic])
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape') setShowEmojis(false)
  }

  function openChat(user: User) {
    setSelectedUser(user)
    setIsOpen(true)
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">

      {/* Open conversation window */}
      {selectedUser && isOpen && (
        <div className="w-72 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl border border-b-0 border-gray-100 dark:border-neutral-800 flex flex-col" style={{ height: 400 }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-neutral-800 rounded-t-2xl cursor-pointer"
            style={{ backgroundColor: selectedUser.color ? `${selectedUser.color}18` : undefined }}
            onClick={() => setIsOpen(false)}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: selectedUser.color || '#6366F1' }}>
              {getInitials(selectedUser.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedUser.name}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-7 h-7 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Inicia la conversación</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.senderId === currentUserId
              const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i-1].createdAt).toDateString()
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-1">
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{formatDate(msg.createdAt, 'dd MMM')}</span>
                    </div>
                  )}
                  <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[78%] px-3 py-1.5 rounded-2xl text-sm', isMe ? 'rounded-br-sm text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-bl-sm')}
                      style={isMe ? { backgroundColor: selectedUser.color || '#6366F1' } : undefined}>
                      <p className="break-words text-xs">{msg.content}</p>
                      <p className={cn('text-[10px] mt-0.5 text-right', isMe ? 'text-white/60' : 'text-gray-400')}>
                        {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        {isMe && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {showEmojis && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => { setInput((p) => p + e); inputRef.current?.focus() }} className="text-base hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          )}

          <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-2">
            <button onClick={() => setShowEmojis((v) => !v)} className={cn('flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors', showEmojis && 'text-brand-500')}>
              <SmilePlus className="w-4 h-4" />
            </button>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Mensaje..." className="flex-1 text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 outline-none focus:border-brand-400" />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
              style={{ backgroundColor: selectedUser.color || '#6366F1' }}>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="bg-white dark:bg-neutral-900 border border-b-0 border-gray-200 dark:border-neutral-700 rounded-t-2xl shadow-xl">
        {/* Header bar — always visible */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
          onClick={() => { setIsOpen(!isOpen); setSelectedUser(null) }}
        >
          <MessageCircle className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Mensajes</span>
          {totalUnread > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium min-w-[18px] text-center">{totalUnread}</span>
          )}
          <ChevronUp className={cn('w-4 h-4 text-gray-400 ml-2 transition-transform', isOpen && 'rotate-180')} />
        </div>

        {/* User list — expands upward */}
        {isOpen && !selectedUser && (
          <div className="border-t border-gray-100 dark:border-neutral-800 divide-y divide-gray-50 dark:divide-neutral-800" style={{ maxHeight: 280, overflowY: 'auto', width: 220 }}>
            {otherUsers.length === 0 && (
              <p className="text-xs text-gray-400 px-4 py-3 text-center">No hay otros usuarios</p>
            )}
            {otherUsers.map((u) => (
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
        )}
      </div>
    </div>
  )
}
