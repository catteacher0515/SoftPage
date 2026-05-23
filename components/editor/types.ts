export type TextBlock = {
  id: string
  type: 'text'
  value: string
}

export type ImageBlock = {
  id: string
  type: 'image'
  src: string
  alt: string
}

export type MissingImageBlock = {
  id: string
  type: 'missing-image'
  path: string
}

export type TableBlock = {
  id: string
  type: 'table'
  rows: string[][]
}

export type DividerBlock = {
  id: string
  type: 'divider'
}

export type Block =
  | TextBlock
  | ImageBlock
  | MissingImageBlock
  | TableBlock
  | DividerBlock

export type UploadedImage = {
  src: string
  alt: string
}

export type UploadError = string | null
export type SourceError = string | null

export type TypographyConfig = {
  fontSize: number
  lineHeight: number
  fontWeight: number
  paragraphSpacing: number
  pagePadding: number
}

export type TypographyField = keyof TypographyConfig
