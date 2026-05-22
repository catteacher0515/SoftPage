import type { Block } from '../editor/types'

export type MeasuredBlock = {
  id: string
  block: Block
  height: number
}

export type PaginatedPage = {
  id: string
  blocks: MeasuredBlock[]
}

export function paginateBlocks(
  blocks: MeasuredBlock[],
  availableHeight: number,
): PaginatedPage[] {
  const pages: PaginatedPage[] = []
  let currentPageBlocks: MeasuredBlock[] = []
  let currentHeight = 0

  blocks.forEach((item) => {
    const nextHeight = currentPageBlocks.length === 0 ? item.height : currentHeight + item.height

    if (currentPageBlocks.length > 0 && nextHeight > availableHeight) {
      pages.push({
        id: `page-${pages.length + 1}`,
        blocks: currentPageBlocks,
      })
      currentPageBlocks = [item]
      currentHeight = item.height
      return
    }

    currentPageBlocks.push(item)
    currentHeight = nextHeight
  })

  if (currentPageBlocks.length > 0) {
    pages.push({
      id: `page-${pages.length + 1}`,
      blocks: currentPageBlocks,
    })
  }

  return pages
}
