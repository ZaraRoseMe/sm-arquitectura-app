'use client'
// src/components/chat/EmojiPickerWrapper.tsx
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface Props {
  onSelect: (emoji: string) => void
  darkMode: boolean
}

export default function EmojiPickerWrapper({ onSelect, darkMode }: Props) {
  return (
    <Picker
      data={data}
      onEmojiSelect={(e: any) => onSelect(e.native)}
      theme={darkMode ? 'dark' : 'light'}
      locale="es"
      previewPosition="none"
      skinTonePosition="none"
      navPosition="bottom"
      perLine={8}
      maxFrequentRows={2}
    />
  )
}
