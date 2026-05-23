import { expect, test } from 'vitest'
import { paginateSegments, type MeasuredSegment } from './pagination'

function createParagraphSegment(id: string, height: number): MeasuredSegment {
  return {
    id,
    blockId: id,
    kind: 'paragraph',
    text: id,
    height,
    block: {
      id,
      type: 'text',
      value: id,
    },
  }
}

test('rebalances adjacent pages when the last page is too sparse', () => {
  const pages = paginateSegments(
    [
      createParagraphSegment('a', 160),
      createParagraphSegment('b', 150),
      createParagraphSegment('c', 120),
    ],
    320,
    15,
  )

  expect(pages).toHaveLength(2)
  expect(pages[0]?.segments.map((segment) => segment.id)).toEqual(['a'])
  expect(pages[1]?.segments.map((segment) => segment.id)).toEqual(['b', 'c'])
})
