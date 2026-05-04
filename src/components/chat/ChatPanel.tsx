'use client'
// src/components/chat/ChatPanel.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, MessageCircle, SmilePlus } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const EMOJIS = ['😊','😂','👍','❤️','🔥','✅','⚠️','📋','🏗️','📅','👏','🙌','💪','🤔','👀','✍️','📌','🚀','⏰','💬']

interface User {
  id: string
  name: string
  color?: string
}

interface Message {
  id: string
  content: string
  createdAt: string
  read: boolean
  senderId: string
  sender: { id: string; name: string; color?: string }
}

interface ChatPanelProps {
  currentUserId: string
  users: User[]
  onClose: () => void
}

export default function ChatPanel({ currentUserId, users, onClose }: ChatPanelProps) {
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

  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  useEffect(() => {
    if (!selectedUser) return
    fetchMessages(selectedUser.id)

    pollRef.current = setInterval(() => {
      fetchMessages(selectedUser.id)
    }, 3000)

    return () => clearInterval(pollRef.current)
  }, [selectedUser, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !selectedUser || loading) return
    setLoading(true)
    const optimistic: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      createdAt: new Date().toISOString(),
      read: false,
      senderId: currentUserId,
      sender: { id: currentUserId, name: 'Tú', color: undefined },
    }
    setMessages((prev) => [...prev, optimistic])
    const text = input.trim()
    setInput('')
    setShowEmojis(false)

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, receiverId: selectedUser.id }),
    })

    fetchMessages(selectedUser.id)
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape') setShowEmojis(false)
  }

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-3 items-end">
      {/* Conversation panel */}
      {selectedUser && (
        <div className="w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 flex flex-col" style={{ height: 440 }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-neutral-800 rounded-t-2xl"
            style={{ backgroundColor: selectedUser.color ? `${selectedUser.color}15` : undefined }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: selectedUser.color || '#6366F1' }}>
              {getInitials(selectedUser.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedUser.name}</p>
              <p className="text-xs text-gray-400">En línea</p>
            </div>
            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Inicia la conversación con {selectedUser.name}</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.senderId === currentUserId
              const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i-1].createdAt).toDateString()
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                        {formatDate(msg.createdAt, 'dd MMM')}
                      </span>
                    </div>
                  )}
                  <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] px-3 py-2 rounded-2xl text-sm', isMe
                      ? 'rounded-br-sm text-white'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-bl-sm'
                    )}
                      style={isMe ? { backgroundColor: selectedUser.color || '#6366F1' } : undefined}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className={cn('text-xs mt-1 text-right', isMe ? 'text-white/60' : 'text-gray-400')}>
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

          {/* Emoji picker */}
          {showEmojis && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => { setInput((p) => p + e); inputRef.current?.focus() }}
                  className="text-lg hover:scale-125 transition-transform">
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-2">
            <button onClick={() => setShowEmojis((v) => !v)}
              className={cn('flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors', showEmojis && 'text-brand-500')}>
              <SmilePlus className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: selectedUser.color || '#6366F1' }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* User list panel */}
      <div className="w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 flex flex-col" style={{ maxHeight: 440 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Mensajes</span>
            {totalUnread > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium">{totalUnread}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-gray-50 dark:divide-neutral-800">
          {otherUsers.map((u) => (
            <button key={u.id} onClick={() => setSelectedUser(u)}
              className={cn('w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-left',
                selectedUser?.id === u.id && 'bg-gray-50 dark:bg-neutral-800')}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: u.color || '#6366F1' }}>
                  {getInitials(u.name)}
                </div>
                {unread[u.id] > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unread[u.id]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">Toca para chatear</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
