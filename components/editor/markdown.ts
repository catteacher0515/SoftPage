import type { Block } from './types'

const MARKDOWN_IMAGE_PATTERN = /^!\[(.*?)\]\((.+?)\)$/
const OBSIDIAN_IMAGE_PATTERN = /^!\[\[(.+?)\]\]$/
const DIVIDER_PATTERN = /^([-*_])\1{2,}$/

type AssetSource = {
  key: string
  fileName: string
  src: string
}

type ParseMarkdownResult = {
  blocks: Block[]
  missingAssetPaths: string[]
}

export function extractLocalImageReferences(markdown: string) {
  const references = new Set<string>()

  markdown.split(/\r?\n/).forEach((rawLine) => {
    const trimmedLine = rawLine.trim()

    const markdownImageMatch = trimmedLine.match(MARKDOWN_IMAGE_PATTERN)

    if (markdownImageMatch) {
      const src = markdownImageMatch[2] ?? ''

      if (!isRemoteSource(src)) {
        references.add(src.trim())
      }

      return
    }

    const obsidianImageMatch = trimmedLine.match(OBSIDIAN_IMAGE_PATTERN)

    if (obsidianImageMatch) {
      references.add(normalizeObsidianPath(obsidianImageMatch[1] ?? ''))
    }
  })

  return Array.from(references)
}

export function parseMarkdownDocument(
  markdown: string,
  assetMap: Record<string, string> = {},
): ParseMarkdownResult {
  const lines = markdown.split(/\r?\n/)
  const blocks: Block[] = []
  const missingAssetPaths = new Set<string>()
  const assets = Object.entries(assetMap).map(([key, src]) => ({
    key,
    src,
    fileName: lastPathPart(key),
  }))

  let textId = 0
  let imageId = 0
  let tableId = 0
  let missingImageId = 0
  let dividerId = 0
  let paragraphBuffer: string[] = []
  let tableBuffer: string[] = []

  const pushParagraph = () => {
    const normalized = normalizeParagraph(paragraphBuffer)

    if (!normalized) {
      paragraphBuffer = []
      return
    }

    textId += 1
    blocks.push({
      id: `text-${textId}`,
      type: 'text',
      value: normalized,
    })
    paragraphBuffer = []
  }

  const pushTable = () => {
    const rows = parseTableRows(tableBuffer)

    if (rows.length === 0) {
      tableBuffer = []
      return
    }

    tableId += 1
    blocks.push({
      id: `table-${tableId}`,
      type: 'table',
      rows,
    })
    tableBuffer = []
  }

  lines.forEach((rawLine) => {
    const trimmedLine = rawLine.trim()

    if (trimmedLine === '') {
      pushTable()
      pushParagraph()
      return
    }

    if (looksLikeTableLine(trimmedLine)) {
      pushParagraph()
      tableBuffer.push(trimmedLine)
      return
    }

    if (tableBuffer.length > 0) {
      pushTable()
    }

    if (DIVIDER_PATTERN.test(trimmedLine.replace(/\s+/g, ''))) {
      pushParagraph()
      dividerId += 1
      blocks.push({
        id: `divider-${dividerId}`,
        type: 'divider',
      })
      return
    }

    const markdownImageMatch = trimmedLine.match(MARKDOWN_IMAGE_PATTERN)

    if (markdownImageMatch) {
      pushParagraph()
      imageId += 1

      const [, altText, src] = markdownImageMatch
      const resolvedSrc = resolveImageSource(src, assets)

      if (resolvedSrc) {
        blocks.push({
          id: `image-${imageId}`,
          type: 'image',
          src: resolvedSrc,
          alt: normalizeAltText(altText || src),
        })
      } else if (isRemoteSource(src)) {
        blocks.push({
          id: `image-${imageId}`,
          type: 'image',
          src,
          alt: normalizeAltText(altText || src),
        })
      } else {
        missingImageId += 1
        missingAssetPaths.add(src)
        blocks.push({
          id: `missing-image-${missingImageId}`,
          type: 'missing-image',
          path: src,
        })
      }
      return
    }

    const obsidianImageMatch = trimmedLine.match(OBSIDIAN_IMAGE_PATTERN)

    if (obsidianImageMatch) {
      pushParagraph()
      const assetPath = normalizeObsidianPath(obsidianImageMatch[1] ?? '')
      const assetSrc = resolveImageSource(assetPath, assets)

      if (assetSrc) {
        imageId += 1
        blocks.push({
          id: `image-${imageId}`,
          type: 'image',
          src: assetSrc,
          alt: normalizeAltText(assetPath),
        })
        return
      }

      missingImageId += 1
      missingAssetPaths.add(assetPath)
      blocks.push({
        id: `missing-image-${missingImageId}`,
        type: 'missing-image',
        path: assetPath,
      })
      return
    }

    paragraphBuffer.push(stripMarkdownDecoration(rawLine))
  })

  pushTable()
  pushParagraph()

  if (blocks.length === 0) {
    blocks.push({
      id: 'text-1',
      type: 'text',
      value: '在这里输入正文。',
    })
  }

  return {
    blocks,
    missingAssetPaths: Array.from(missingAssetPaths),
  }
}

function normalizeParagraph(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function stripMarkdownDecoration(line: string) {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
}

function normalizeObsidianPath(path: string) {
  return path.split('|')[0]?.trim() ?? path.trim()
}

function normalizeAltText(value: string) {
  const source = lastPathPart(value)

  return source.replace(/\.[a-z0-9]+$/i, '')
}

function looksLikeTableLine(line: string) {
  return line.includes('|') && line.split('|').length >= 3
}

function parseTableRows(lines: string[]) {
  return lines
    .filter((line) => !/^[:|\-\s]+$/.test(line.replace(/\|/g, '')))
    .map((line) =>
      line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell, index, array) => !(cell === '' && (index === 0 || index === array.length - 1))),
    )
    .filter((row) => row.length > 0)
}

function resolveImageSource(requestedPath: string, assets: AssetSource[]) {
  const normalizedRequestedPath = normalizeAssetLookupKey(requestedPath)
  const normalizedRequestedFileName = normalizeAssetLookupKey(lastPathPart(requestedPath))

  const exactMatch = assets.find(
    (asset) => normalizeAssetLookupKey(asset.key) === normalizedRequestedPath,
  )

  if (exactMatch) {
    return exactMatch.src
  }

  const exactSuffixMatch = assets.find((asset) =>
    normalizeAssetLookupKey(asset.key).endsWith(`/${normalizedRequestedPath}`),
  )

  if (exactSuffixMatch) {
    return exactSuffixMatch.src
  }

  const fileNameMatch = assets.find(
    (asset) => normalizeAssetLookupKey(asset.fileName) === normalizedRequestedFileName,
  )

  if (fileNameMatch) {
    return fileNameMatch.src
  }

  const looseFileNameMatch = assets.find((asset) =>
    normalizeAssetLookupKey(asset.fileName).includes(normalizedRequestedFileName),
  )

  if (looseFileNameMatch) {
    return looseFileNameMatch.src
  }

  return null
}

export function doesAssetPathMatchReference(assetPath: string, requestedPath: string) {
  const normalizedAssetPath = normalizeAssetLookupKey(assetPath)
  const normalizedRequestedPath = normalizeAssetLookupKey(requestedPath)
  const normalizedAssetFileName = normalizeAssetLookupKey(lastPathPart(assetPath))
  const normalizedRequestedFileName = normalizeAssetLookupKey(lastPathPart(requestedPath))

  return (
    normalizedAssetPath === normalizedRequestedPath ||
    normalizedAssetPath.endsWith(`/${normalizedRequestedPath}`) ||
    normalizedAssetFileName === normalizedRequestedFileName ||
    normalizedAssetFileName.includes(normalizedRequestedFileName)
  )
}

function normalizeAssetLookupKey(path: string) {
  return decodeURIComponent(path)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\|.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function lastPathPart(path: string) {
  return path.split('/').pop() ?? path
}

function isRemoteSource(src: string) {
  return /^https?:\/\//i.test(src) || src.startsWith('data:')
}
