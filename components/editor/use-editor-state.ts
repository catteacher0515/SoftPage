import { useMemo, useState } from 'react'
import type {
  Block,
  CoverDraft,
  EditorMode,
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

const defaultCoverDraft: CoverDraft = {
  title: '',
  author: '花萍雨',
  heroImageSrc: null,
  heroImageAlt: '',
  titleFontSize: 40,
  hasDivider: true,
  titleTouched: false,
}

export function useEditorState() {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [typography, setTypography] = useState(defaultTypography)
  const [uploadError, setUploadError] = useState<UploadError>(null)
  const [sourceError, setSourceError] = useState<SourceError>(null)
  const [sourceName, setSourceName] = useState<string>('未导入 Markdown')
  const [mode, setMode] = useState<EditorMode>('body')
  const [coverDraft, setCoverDraft] = useState<CoverDraft>(defaultCoverDraft)

  const replaceBlocks = (
    nextBlocks: Block[],
    nextSourceName: string,
    nextCoverTitle = '',
  ) => {
    setBlocks(nextBlocks)
    setSourceName(nextSourceName)
    setCoverDraft((currentDraft) =>
      currentDraft.titleTouched
        ? currentDraft
        : {
            ...currentDraft,
            title: nextCoverTitle,
          },
    )
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

  const updateCoverTitle = (value: string) => {
    setCoverDraft((currentDraft) => ({
      ...currentDraft,
      title: value,
      titleTouched: true,
    }))
  }

  const updateCoverTitleFontSize = (value: number) => {
    setCoverDraft((currentDraft) => ({
      ...currentDraft,
      titleFontSize: value,
    }))
  }

  const setCoverHeroImage = (src: string | null, alt: string) => {
    setCoverDraft((currentDraft) => ({
      ...currentDraft,
      heroImageSrc: src,
      heroImageAlt: alt,
    }))
  }

  return useMemo(
    () => ({
      blocks,
      clearUploadError,
      clearSourceError,
      coverDraft,
      mode,
      replaceBlocks,
      setCoverHeroImage,
      setMode,
      sourceError,
      sourceName,
      setSourceStatusError,
      setUploadStatusError,
      uploadError,
      typography,
      updateCoverTitle,
      updateCoverTitleFontSize,
      updateTypographyFieldFromInput,
    }),
    [blocks, coverDraft, mode, sourceError, sourceName, typography, uploadError],
  )
}
