'use client'
// src/components/chat/ChatPanel.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageCircle, SmilePlus, ChevronDown, ChevronUp, Users, X, MoreHorizontal, Edit2, Check, Paperclip } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useSounds } from '@/hooks/useSounds'
import { useUploadThing } from '@/lib/uploadthing'

const EMOJIS = ['😊','😂','👍','❤️','🔥','✅','⚠️','📋','🏗️','📅','👏','🙌','💪','🤔','👀','✍️','📌','🚀','⏰','💬']
const WIN_WIDTH = 320
const IMAGE_PREFIX = '__img__:'

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
  team?: Team | null
  userRole?: string
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      <img src={url} alt="Imagen" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
    </div>
  )
}

function ChatWindow({
  win, currentUserId, isGroup, team, msgs,
  inputs, setInputs, showEmojis, setShowEmojis, showGroupInfo, setShowGroupInfo,
  loading, editingName, newGroupName, setNewGroupName, setEditingName,
  messagesEndRefs, inputRefs, fileInputRefs, scrollContainerRefs, handleScroll,
  currentUserColor,
  handleToggleMinimize, sendDM, sendGroupMsg, saveGroupName,
  handleKeyDown, closeChatWindow, setLightboxUrl, isCoordinador,
}: any) {
  const { startUpload, isUploading } = useUploadThing('chatImageUploader')

  const input = inputs[win.id] || ''
  const isEmoji = showEmojis[win.id] || false
  const showInfo = showGroupInfo[win.id] || false

  const groupMembers = team ? [
    { id: team.coordinator.id, name: team.coordinator.name, color: team.coordinator.color, isCoord: true },
    ...(team.members || []).map((m: any) => ({ ...m.user, isCoord: false })),
  ] : []

  // ─── Upload helper compartido ─────────────────────────────────────────────
  async function uploadAndSend(file: File) {
    if (file.size > 4 * 1024 * 1024) { alert('La imagen no puede pesar más de 4MB'); return }
    try {
      const res = await startUpload([file])
      const imageUrl = res?.[0]?.url
      if (!imageUrl) throw new Error('No URL')
      const content = `${IMAGE_PREFIX}${imageUrl}`
      if (isGroup && team) {
        await fetch('/api/group-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, teamId: team.id }) })
      } else {
        await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, receiverId: win.id }) })
      }
    } catch (err) {
      console.error('Error uploading:', err)
      alert('Error al subir la imagen, intenta de nuevo')
    }
  }

  // ─── Archivo desde botón 📎 ───────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadAndSend(file)
    e.target.value = ''
  }

  // ─── Paste Ctrl+V ─────────────────────────────────────────────────────────
  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) await uploadAndSend(file)
        return
      }
    }
    // Si no hay imagen, dejar que el paste normal funcione (texto)
  }

  return (
    <div className="flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl border border-b-0 border-gray-100 dark:border-neutral-800"
      style={{ width: WIN_WIDTH, height: win.minimized ? 'auto' : 420 }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl border-b border-gray-100 dark:border-neutral-800"
        style={{ backgroundColor: `${win.color}18` }}>
        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => handleToggleMinimize(win)}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: win.color, fontSize: 9 }}>
            {isGroup ? <Users style={{ width: 12, height: 12 }} /> : getInitials(win.label).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            {isGroup && editingName && !win.minimized ? (
              <div className="flex items-center gap-1" onClick={(e: any) => e.stopPropagation()}>
                <input autoFocus className="text-xs font-semibold bg-white/80 dark:bg-neutral-800/80 border border-brand-300 rounded px-1.5 py-0.5 outline-none w-full"
                  value={newGroupName} onChange={(e: any) => setNewGroupName(e.target.value)}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') saveGroupName(); if (e.key === 'Escape') setEditingName(false) }} />
                <button onClick={saveGroupName} className="flex-shrink-0 text-brand-600 hover:text-brand-700"><Check style={{ width: 12, height: 12 }} /></button>
              </div>
            ) : (
              <p className={cn('text-xs font-semibold truncate text-gray-900 dark:text-white', win.unread > 0 && win.minimized ? 'animate-pulse' : '')}>
                {isGroup ? (team?.name || win.label) : win.label}
              </p>
            )}
            {win.minimized && win.unread > 0 && win.lastSender && <p className="text-[10px] text-gray-400 truncate">{win.lastSender}</p>}
          </div>
        </div>

        {win.unread > 0 && <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center flex-shrink-0">{win.unread}</span>}

        {isGroup && !win.minimized && (
          <button onClick={(e: any) => { e.stopPropagation(); setShowGroupInfo((prev: any) => ({ ...prev, [win.id]: !prev[win.id] })) }}
            className={cn('w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 flex-shrink-0 transition-colors', showInfo ? 'text-brand-600' : 'text-gray-400')}>
            <MoreHorizontal style={{ width: 12, height: 12 }} />
          </button>
        )}

        {win.minimized
          ? <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0 cursor-pointer" onClick={() => handleToggleMinimize(win)} />
          : <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0 cursor-pointer" onClick={() => handleToggleMinimize(win)} />
        }
        <button onClick={(e: any) => { e.stopPropagation(); closeChatWindow(win.id) }}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X style={{ width: 10, height: 10 }} />
        </button>
      </div>

      {!win.minimized && (
        <>
          {isGroup && showInfo && (
            <div className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/20 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Miembros ({groupMembers.length})</p>
                {isCoordinador && (
                  <button onClick={() => { setNewGroupName(team?.name || ''); setEditingName(true); setShowGroupInfo((prev: any) => ({ ...prev, [win.id]: false })) }}
                    className="flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-700">
                    <Edit2 style={{ width: 10, height: 10 }} /> Editar nombre
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {groupMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: m.color || '#6366F1', fontSize: 8 }}>
                      {getInitials(m.name).charAt(0)}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{m.name}</span>
                    {m.isCoord && <span className="text-[9px] text-amber-500 font-medium">Coordinador</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            ref={(el: any) => { if (scrollContainerRefs) scrollContainerRefs.current[win.id] = el }}
            onScroll={() => handleScroll && handleScroll(win.id)}
            className="flex-1 overflow-y-auto p-3 space-y-2">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <MessageCircle className="w-6 h-6 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">{isGroup ? 'Bienvenidos al chat del equipo' : 'Inicia la conversación'}</p>
              </div>
            )}
            {msgs.map((msg: any, i: number) => {
              const isMe = msg.senderId === currentUserId
              const isImage = msg.content.startsWith(IMAGE_PREFIX)
              const imageUrl = isImage ? msg.content.slice(IMAGE_PREFIX.length) : null
              const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(msgs[i-1].createdAt).toDateString()
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-1">
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{formatDate(msg.createdAt, 'dd MMM')}</span>
                    </div>
                  )}
                  <div className={cn('flex gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
                    {!isMe && isGroup && (
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-1" style={{ backgroundColor: msg.sender?.color || '#6366F1', fontSize: 8 }}>
                        {getInitials(msg.sender?.name || '').charAt(0)}
                      </div>
                    )}
                    <div className="max-w-[80%]">
                      {!isMe && isGroup && <p className="text-[9px] text-gray-400 mb-0.5 pl-1">{msg.sender?.name}</p>}
                      {isImage && imageUrl ? (
                        <div>
                          <img src={imageUrl} alt="Imagen" loading="lazy"
                            className="rounded-xl max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                            onClick={() => setLightboxUrl(imageUrl)} />
                          <p className="text-[9px] mt-0.5 text-right text-gray-400">
                            {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1.5 rounded-2xl text-xs"
                          style={isMe
                            ? { backgroundColor: `${currentUserColor}22`, borderBottomRightRadius: 4 }
                            : { backgroundColor: `${msg.sender?.color || '#6366F1'}18`, borderBottomLeftRadius: 4 }
                          }>
                          <p className="break-words leading-relaxed text-gray-900 dark:text-gray-100">{msg.content}</p>
                          <p className="text-[9px] mt-0.5 text-right text-gray-400 dark:text-gray-500">
                            {new Date(msg.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            {isMe && !isGroup && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {isUploading && (
              <div className="flex justify-end">
                <div className="bg-gray-100 dark:bg-neutral-800 rounded-2xl px-3 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-400">Subiendo imagen...</span>
                </div>
              </div>
            )}

            <div ref={(el: any) => { messagesEndRefs.current[win.id] = el }} />
          </div>

          {isEmoji && (
            <div className="px-2 py-1.5 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { setInputs((prev: any) => ({ ...prev, [win.id]: (prev[win.id] || '') + e })); inputRefs.current[win.id]?.focus() }}
                  className="text-sm hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          )}

          <div className="px-2 py-2 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-1.5">
            <button onClick={() => setShowEmojis((prev: any) => ({ ...prev, [win.id]: !prev[win.id] }))}
              className={cn('flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors', isEmoji && 'text-brand-500')}>
              <SmilePlus className="w-3.5 h-3.5" />
            </button>

            <button onClick={() => fileInputRefs.current[win.id]?.click()} disabled={isUploading}
              className="flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-40"
              title="Enviar imagen (máx 4MB) — también puedes pegar con Ctrl+V">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <input ref={(el: any) => { fileInputRefs.current[win.id] = el }} type="file" accept="image/*" className="hidden"
              onChange={handleFileChange} />

            <input ref={(el: any) => { inputRefs.current[win.id] = el }}
              value={input}
              onChange={(e: any) => setInputs((prev: any) => ({ ...prev, [win.id]: e.target.value }))}
              onKeyDown={(e: any) => handleKeyDown(e, win.id, isGroup)}
              onPaste={handlePaste}
              placeholder="Mensaje... (Ctrl+V para pegar imagen)"
              className="flex-1 text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 outline-none focus:border-brand-400" />
            <button onClick={() => isGroup ? sendGroupMsg() : sendDM(win.id)}
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

export default function ChatPanel({ currentUserId, users, team: initialTeam, userRole }: ChatPanelProps) {
  const currentUserColor = users.find(u => u.id === currentUserId)?.color || '#6366F1'
  const {
    chatWindows, openChatWindow, openMinimized, closeChatWindow,
    minimizeChatWindow, maximizeChatWindow,
    setChatWindowUnread, clearChatWindowUnread, onlineUsers,
  } = useAppStore()

  const { playChatSound } = useSounds()

  const [team, setTeam] = useState(initialTeam)
  const [listOpen, setListOpen] = useState(false)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [showEmojis, setShowEmojis] = useState<Record<string, boolean>>({})
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({})
  const [groupUnread, setGroupUnread] = useState(0)
  const [lastGroupMsgId, setLastGroupMsgId] = useState<string | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [showGroupInfo, setShowGroupInfo] = useState<Record<string, boolean>>({})
  const [editingName, setEditingName] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const userScrolledUp = useRef<Record<string, boolean>>({})

  // Detectar si el usuario scrolleó hacia arriba
  function handleScroll(winId: string) {
    const container = scrollContainerRefs.current[winId]
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    // Si está a más de 80px del fondo, consideramos que scrolleó arriba
    userScrolledUp.current[winId] = scrollHeight - scrollTop - clientHeight > 80
  }

  const otherUsers = users.filter(u => u.id !== currentUserId)
  const totalUnread = Object.values(dmUnread).reduce((a, b) => a + b, 0) + groupUnread
  const isCoordinador = team && team.coordinator.id === currentUserId

  useEffect(() => {
    chatWindows.forEach(win => {
      if (win.minimized) return
      // Solo scroll automático si el usuario NO scrolleó hacia arriba
      if (userScrolledUp.current[win.id]) return
      const el = messagesEndRefs.current[win.id]
      if (!el) return
      el.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
    })
  }, [messages, groupMessages, chatWindows.filter(w => !w.minimized).map(w => w.id).join(',')])

  useEffect(() => {
    chatWindows.filter(w => !w.minimized).forEach(w => {
      setTimeout(() => inputRefs.current[w.id]?.focus(), 80)
    })
  }, [chatWindows.filter(w => !w.minimized).map(w => w.id).join(',')])

  const fetchUnread = useCallback(async () => {
    const res = await fetch('/api/messages/unread')
    if (res.ok) {
      const data = await res.json()
      const map: Record<string, number> = {}
      data.forEach((d: any) => { map[d.senderId] = d._count.id })
      setDmUnread(map)
      data.forEach((d: any) => {
        const sender = users.find(u => u.id === d.senderId)
        if (!sender) return
        const exists = useAppStore.getState().chatWindows.find(w => w.id === d.senderId)
        if (!exists) openMinimized({ id: sender.id, type: 'dm', label: sender.name, color: sender.color || '#6366F1' })
        setChatWindowUnread(d.senderId, d._count.id, sender?.name)
      })
    }
  }, [users, openMinimized, setChatWindowUnread])

  const fetchMessages = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages?with=${userId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => {
        const prevMsgs = prev[userId] || []
        const newMsgs = data.filter((m: Message) => !prevMsgs.find((p: Message) => p.id === m.id) && m.senderId !== currentUserId)
        if (newMsgs.length > 0) playChatSound()
        return { ...prev, [userId]: data }
      })
      setDmUnread(prev => { const n = { ...prev }; delete n[userId]; return n })
      clearChatWindowUnread(userId)
    }
  }, [clearChatWindowUnread, currentUserId, playChatSound])

  const fetchGroupMessages = useCallback(async () => {
    if (!team) return
    const res = await fetch(`/api/group-messages?teamId=${team.id}`)
    if (res.ok) {
      const data: GroupMessage[] = await res.json()
      setGroupMessages(prev => {
        const newMsgs = data.filter(m => !prev.find(p => p.id === m.id) && m.senderId !== currentUserId)
        if (newMsgs.length > 0) playChatSound()
        return data
      })
      const groupWin = useAppStore.getState().chatWindows.find(w => w.type === 'group')
      if (data.length > 0) {
        setLastGroupMsgId(prev => {
          if (!prev) return data[data.length - 1].id
          const idx = data.findIndex(m => m.id === prev)
          const newMsgs = idx >= 0 ? data.slice(idx + 1).filter(m => m.senderId !== currentUserId) : []
          if (newMsgs.length > 0) {
            setGroupUnread(n => n + newMsgs.length)
            if (!groupWin) openMinimized({ id: team.id, type: 'group', label: team.name, color: team.coordinator?.color || '#F59E0B' })
            setChatWindowUnread(team.id, newMsgs.length, newMsgs[newMsgs.length - 1].sender?.name)
          }
          return prev
        })
      }
    }
  }, [team, currentUserId, openMinimized, setChatWindowUnread, playChatSound])

  useEffect(() => { fetchUnread(); const i = setInterval(fetchUnread, 5000); return () => clearInterval(i) }, [fetchUnread])
  useEffect(() => { if (!team) return; fetchGroupMessages(); const i = setInterval(fetchGroupMessages, 3000); return () => clearInterval(i) }, [team])
  useEffect(() => {
    const openDMs = chatWindows.filter(w => w.type === 'dm' && !w.minimized)
    if (openDMs.length === 0) return
    const intervals = openDMs.map(w => setInterval(() => fetchMessages(w.id), 3000))
    return () => intervals.forEach(clearInterval)
  }, [chatWindows.filter(w => w.type === 'dm' && !w.minimized).map(w => w.id).join(',')])

  function openDM(user: User) {
    setListOpen(false)
    openChatWindow({ id: user.id, type: 'dm', label: user.name, color: user.color || '#6366F1' })
    fetchMessages(user.id)
  }

  function openGroup() {
    setListOpen(false)
    if (!team) return
    openChatWindow({ id: team.id, type: 'group', label: team.name, color: team.coordinator?.color || '#F59E0B' })
    setGroupUnread(0)
    if (groupMessages.length > 0) setLastGroupMsgId(groupMessages[groupMessages.length - 1].id)
  }

  function handleToggleMinimize(win: typeof chatWindows[0]) {
    if (win.minimized) {
      maximizeChatWindow(win.id)
      if (win.type === 'dm') fetchMessages(win.id)
      if (win.type === 'group') { setGroupUnread(0); if (groupMessages.length > 0) setLastGroupMsgId(groupMessages[groupMessages.length - 1].id) }
    } else {
      minimizeChatWindow(win.id)
    }
  }

  async function sendDM(userId: string) {
    const text = inputs[userId]?.trim()
    if (!text || loading[userId]) return
    setLoading(prev => ({ ...prev, [userId]: true }))
    const optimistic: Message = { id: Date.now().toString(), content: text, createdAt: new Date().toISOString(), read: false, senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' } }
    setMessages(prev => ({ ...prev, [userId]: [...(prev[userId] || []), optimistic] }))
    setInputs(prev => ({ ...prev, [userId]: '' }))
    setShowEmojis(prev => ({ ...prev, [userId]: false }))
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, receiverId: userId }) })
    fetchMessages(userId)
    setLoading(prev => ({ ...prev, [userId]: false }))
    inputRefs.current[userId]?.focus()
  }

  async function sendGroupMsg() {
    if (!team) return
    const text = inputs[team.id]?.trim()
    if (!text || loading[team.id]) return
    setLoading(prev => ({ ...prev, [team.id]: true }))
    const optimistic: GroupMessage = { id: Date.now().toString(), content: text, createdAt: new Date().toISOString(), senderId: currentUserId, sender: { id: currentUserId, name: 'Tú' } }
    setGroupMessages(prev => [...prev, optimistic])
    setInputs(prev => ({ ...prev, [team.id]: '' }))
    setShowEmojis(prev => ({ ...prev, [team.id]: false }))
    await fetch('/api/group-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, teamId: team.id }) })
    fetchGroupMessages()
    setLoading(prev => ({ ...prev, [team.id]: false }))
    inputRefs.current[team.id]?.focus()
  }

  async function saveGroupName() {
    if (!team || !newGroupName.trim()) return
    const res = await fetch(`/api/teams/${team.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newGroupName.trim() }) })
    if (res.ok) {
      const updated = await res.json()
      setTeam(prev => prev ? { ...prev, name: updated.name } : prev)
      openChatWindow({ id: team.id, type: 'group', label: updated.name, color: team.coordinator?.color || '#F59E0B' })
      setEditingName(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, winId: string, isGroup: boolean) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); isGroup ? sendGroupMsg() : sendDM(winId) }
  }

  return (
    <>
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">
        {[...chatWindows].reverse().map(win => (
          <ChatWindow
            key={win.id}
            win={win}
            currentUserId={currentUserId}
            isGroup={win.type === 'group'}
            team={team}
            msgs={win.type === 'group' ? groupMessages : (messages[win.id] || [])}
            inputs={inputs} setInputs={setInputs}
            showEmojis={showEmojis} setShowEmojis={setShowEmojis}
            showGroupInfo={showGroupInfo} setShowGroupInfo={setShowGroupInfo}
            loading={loading}
            editingName={editingName} newGroupName={newGroupName}
            setNewGroupName={setNewGroupName} setEditingName={setEditingName}
            messagesEndRefs={messagesEndRefs}
            inputRefs={inputRefs}
            fileInputRefs={fileInputRefs}
            scrollContainerRefs={scrollContainerRefs}
            handleScroll={handleScroll}
            currentUserColor={currentUserColor}
            handleToggleMinimize={handleToggleMinimize}
            sendDM={sendDM} sendGroupMsg={sendGroupMsg} saveGroupName={saveGroupName}
            handleKeyDown={handleKeyDown}
            closeChatWindow={closeChatWindow}
            setLightboxUrl={setLightboxUrl}
            isCoordinador={isCoordinador}
          />
        ))}

        <div className="bg-white dark:bg-neutral-900 border border-b-0 border-gray-200 dark:border-neutral-700 rounded-t-2xl shadow-xl" style={{ minWidth: 200 }}>
          <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none" onClick={() => setListOpen(v => !v)}>
            <MessageCircle className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">Mensajes</span>
            {totalUnread > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium min-w-[18px] text-center">{totalUnread}</span>}
            <ChevronUp className={cn('w-4 h-4 text-gray-400 ml-auto transition-transform', listOpen && 'rotate-180')} />
          </div>
          {listOpen && (
            <div className="border-t border-gray-100 dark:border-neutral-800" style={{ maxHeight: 320, overflowY: 'auto', width: 220 }}>
              {team && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2 pb-1">Mi equipo</p>
                  <button onClick={openGroup} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left border-b border-gray-100 dark:border-neutral-800">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: team.coordinator?.color || '#F59E0B' }}><Users className="w-4 h-4" /></div>
                      {groupUnread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{groupUnread}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{team.name}</p>
                      <p className="text-xs text-gray-400">Chat grupal</p>
                    </div>
                  </button>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2 pb-1">General</p>
                </div>
              )}
              <div className="divide-y divide-gray-50 dark:divide-neutral-800">
                {otherUsers.length === 0 && <p className="text-xs text-gray-400 px-4 py-3 text-center">No hay otros usuarios</p>}
                {otherUsers.map(u => (
                  <button key={u.id} onClick={() => openDM(u)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-left">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: u.color || '#6366F1' }}>{getInitials(u.name)}</div>
                      {onlineUsers.includes(u.id) && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-neutral-900 rounded-full" />
                      )}
                      {dmUnread[u.id] > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{dmUnread[u.id]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                      {onlineUsers.includes(u.id)
                        ? <p className="text-xs text-emerald-500">En línea</p>
                        : dmUnread[u.id] > 0 && <p className="text-xs text-brand-500">{dmUnread[u.id]} nuevo{dmUnread[u.id] > 1 ? 's' : ''}</p>
                      }
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
