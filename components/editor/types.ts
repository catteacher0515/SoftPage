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

export type Block = TextBlock | ImageBlock

export type TypographyConfig = {
  fontSize: number
  lineHeight: number
  fontWeight: number
  paragraphSpacing: number
  pagePadding: number
}

export type TypographyField = keyof TypographyConfig
