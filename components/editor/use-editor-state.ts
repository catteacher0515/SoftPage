import { useMemo, useState } from 'react'
import type {
  Block,
  SourceError,
  TypographyConfig,
  TypographyField,
  UploadError,
} from './types'

const defaultTypography: TypographyConfig = {
  fontSize: 15,
  lineHeight: 1.62,
  fontWeight: 400,
  paragraphSpacing: 15,
  pagePadding: 30,
}

const initialBlocks: Block[] = [
  { id: 'text-1', type: 'text', value: '在这里输入正文。' },
]

export function useEditorState() {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [typography, setTypography] = useState(defaultTypography)
  const [uploadError, setUploadError] = useState<UploadError>(null)
  const [sourceError, setSourceError] = useState<SourceError>(null)
  const [sourceName, setSourceName] = useState<string>('未导入 Markdown')

  const replaceBlocks = (nextBlocks: Block[], nextSourceName: string) => {
    setBlocks(nextBlocks)
    setSourceName(nextSourceName)
  }

  const clearUploadError = () => {
    setUploadError(null)
  }

  const clearSourceError = () => {
    setSourceError(null)
  }

  const setUploadStatusError = (message: string) => {
    setUploadError(message)
  }

  const setSourceStatusError = (message: string) => {
    setSourceError(message)
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
      blocks,
      clearUploadError,
      clearSourceError,
      replaceBlocks,
      sourceError,
      sourceName,
      setSourceStatusError,
      setUploadStatusError,
      uploadError,
      typography,
      updateTypographyFieldFromInput,
    }),
    [blocks, sourceError, sourceName, typography, uploadError],
  )
}
