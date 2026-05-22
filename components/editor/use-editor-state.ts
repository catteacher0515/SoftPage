import { useMemo, useState } from 'react'
import type { Block, TypographyConfig } from './types'

const defaultTypography: TypographyConfig = {
  fontSize: 22,
  lineHeight: 1.7,
  fontWeight: 400,
  paragraphSpacing: 16,
  pagePadding: 40,
}

const initialBlocks: Block[] = [
  { id: 'text-1', type: 'text', value: '在这里输入正文。' },
]

export function useEditorState() {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [typography, setTypography] = useState(defaultTypography)

  return useMemo(
    () => ({ blocks, setBlocks, typography, setTypography }),
    [blocks, typography],
  )
}
