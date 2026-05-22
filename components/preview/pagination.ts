import type { Block } from '../editor/types'

export type MeasuredSegment = {
  id: string
  blockId: string
  block: Block
  kind: 'paragraph' | 'image'
  text: string
  height: number
}

export type PaginatedPage = {
  id: string
  segments: MeasuredSegment[]
}

export function paginateSegments(
  segments: MeasuredSegment[],
  availableHeight: number,
  segmentGap: number,
): PaginatedPage[] {
  const pages: PaginatedPage[] = []
  let currentSegments: MeasuredSegment[] = []
  let currentHeight = 0

  segments.forEach((segment) => {
    const nextHeight =
      currentSegments.length === 0
        ? segment.height
        : currentHeight + segmentGap + segment.height

    if (currentSegments.length > 0 && nextHeight > availableHeight) {
      pages.push({
        id: `page-${pages.length + 1}`,
        segments: currentSegments,
      })
      currentSegments = [segment]
      currentHeight = segment.height
      return
    }

    currentSegments.push(segment)
    currentHeight = nextHeight
  })

  if (currentSegments.length > 0) {
    pages.push({
      id: `page-${pages.length + 1}`,
      segments: currentSegments,
    })
  }

  return pages
}
