import { useMemo, useState } from 'react'
import type {
  Block,
  TextBlock,
  TypographyConfig,
  TypographyField,
  UploadedImage,
} from './types'

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
  const [activeTextBlockId, setActiveTextBlockId] = useState<TextBlock['id']>(
    initialBlocks[0]?.id ?? '',
  )
  const [typography, setTypography] = useState(defaultTypography)
  const activeTextBlock =
    blocks.find(
      (block): block is TextBlock =>
        block.type === 'text' && block.id === activeTextBlockId,
    ) ??
    blocks.find((block): block is TextBlock => block.type === 'text') ??
    null

  const updateTextBlock = (value: string) => {
    if (!activeTextBlock) return
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === activeTextBlock.id ? { ...block, value } : block,
      ),
    )
  }

  const selectTextBlock = (blockId: TextBlock['id']) => {
    setActiveTextBlockId(blockId)
  }

  const insertImageBlockAfterActiveTextBlock = ({ src, alt }: UploadedImage) => {
    if (!activeTextBlock) return

    setBlocks((currentBlocks) => {
      const activeIndex = currentBlocks.findIndex(
        (block) => block.id === activeTextBlock.id,
      )

      if (activeIndex === -1) {
        return currentBlocks
      }

      const imageBlock: Block = {
        id: `image-${Date.now()}`,
        type: 'image',
        src,
        alt,
      }

      return [
        ...currentBlocks.slice(0, activeIndex + 1),
        imageBlock,
        ...currentBlocks.slice(activeIndex + 1),
      ]
    })
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
      activeTextBlockId,
      blocks,
      insertImageBlockAfterActiveTextBlock,
      selectTextBlock,
      typography,
      updateTextBlock,
      updateTypographyFieldFromInput,
    }),
    [activeTextBlock, activeTextBlockId, blocks, typography],
  )
}
