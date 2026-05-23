import { useMemo, useState } from 'react'
import type {
  Block,
  TextBlock,
  TypographyConfig,
  TypographyField,
  UploadedImage,
  UploadError,
} from './types'

const defaultTypography: TypographyConfig = {
  fontSize: 15,
  lineHeight: 1.5,
  fontWeight: 500,
  paragraphSpacing: 0,
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
  const [uploadError, setUploadError] = useState<UploadError>(null)
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

  const clearUploadError = () => {
    setUploadError(null)
  }

  const setImageUploadError = (message: string) => {
    setUploadError(message)
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
      clearUploadError,
      uploadError,
      typography,
      setImageUploadError,
      updateTextBlock,
      updateTypographyFieldFromInput,
    }),
    [activeTextBlock, activeTextBlockId, blocks, typography, uploadError],
  )
}
