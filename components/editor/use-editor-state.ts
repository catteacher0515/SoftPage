import { useMemo, useState } from 'react'
import type { Block, TypographyConfig, TypographyField } from './types'

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
  const activeTextBlock = blocks.find((block) => block.type === 'text') ?? null

  const updateTextBlock = (value: string) => {
    if (!activeTextBlock) return
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === activeTextBlock.id ? { ...block, value } : block,
      ),
    )
  }

  const updateTypographyField = (field: TypographyField, value: number) => {
    setTypography((currentTypography) => ({
      ...currentTypography,
      [field]: value,
    }))
  }

  const updateTypographyFieldFromInput = (
    field: TypographyField,
    value: number,
  ) => {
    if (!Number.isFinite(value)) return
    updateTypographyField(field, value)
  }

  return useMemo(
    () => ({
      activeTextBlock,
      blocks,
      setBlocks,
      typography,
      setTypography,
      updateTextBlock,
      updateTypographyField,
      updateTypographyFieldFromInput,
    }),
    [activeTextBlock, blocks, typography],
  )
}
