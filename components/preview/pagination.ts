import type { Block } from '../editor/types'

export type MeasuredSegment = {
  id: string
  blockId: string
  block: Block
  kind: 'paragraph' | 'image' | 'table' | 'missing-image' | 'divider'
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

  return rebalancePages(pages, availableHeight, segmentGap)
}

function rebalancePages(
  pages: PaginatedPage[],
  availableHeight: number,
  segmentGap: number,
) {
  if (pages.length < 2) {
    return pages
  }

  const rebalancedPages = pages.map((page) => ({
    ...page,
    segments: [...page.segments],
  }))

  for (let index = 0; index < rebalancedPages.length - 1; index += 1) {
    const currentPage = rebalancedPages[index]
    const nextPage = rebalancedPages[index + 1]

    if (!currentPage || !nextPage || nextPage.segments.length < 2) {
      continue
    }

    const currentHeight = calculatePageHeight(currentPage.segments, segmentGap)
    const nextHeight = calculatePageHeight(nextPage.segments, segmentGap)

    if (
      currentHeight > availableHeight * 0.9 &&
      nextHeight < availableHeight * 0.68
    ) {
      const movedSegment = nextPage.segments.shift()

      if (movedSegment) {
        currentPage.segments.push(movedSegment)
      }
    }
  }

  return rebalancedPages
}

function calculatePageHeight(
  segments: MeasuredSegment[],
  segmentGap: number,
) {
  return segments.reduce((totalHeight, segment, index) => {
    return totalHeight + segment.height + (index === 0 ? 0 : segmentGap)
  }, 0)
}
