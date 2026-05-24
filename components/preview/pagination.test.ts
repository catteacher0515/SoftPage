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

function createParagraphLineSegment(
  paragraphId: string,
  lineIndex: number,
  lineCount: number,
  height: number,
): MeasuredSegment {
  return {
    id: `${paragraphId}-line-${lineIndex}`,
    blockId: paragraphId,
    kind: 'paragraph',
    text: `line-${lineIndex + 1}`,
    height,
    paragraphId,
    lineIndex,
    lineCount,
    block: {
      id: paragraphId,
      type: 'text',
      value: `paragraph-${paragraphId}`,
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

test('cuts earlier to avoid leaving a single sparse segment on the last page', () => {
  const pages = paginateSegments(
    [
      createParagraphSegment('a', 120),
      createParagraphSegment('b', 120),
      createParagraphSegment('c', 80),
      createParagraphSegment('d', 120),
      createParagraphSegment('e', 120),
    ],
    320,
    15,
  )

  expect(pages).toHaveLength(3)
  expect(pages[0]?.segments.map((segment) => segment.id)).toEqual(['a', 'b'])
  expect(pages[1]?.segments.map((segment) => segment.id)).toEqual(['c'])
  expect(pages[2]?.segments.map((segment) => segment.id)).toEqual(['d', 'e'])
})

test('keeps a two-page layout when the trailing page is already within a comfortable density range', () => {
  const pages = paginateSegments(
    [
      createParagraphSegment('a', 100),
      createParagraphSegment('b', 100),
      createParagraphSegment('c', 90),
      createParagraphSegment('d', 100),
      createParagraphSegment('e', 100),
    ],
    320,
    15,
  )

  expect(pages).toHaveLength(2)
  expect(pages[0]?.segments.map((segment) => segment.id)).toEqual([
    'a',
    'b',
    'c',
  ])
  expect(pages[1]?.segments.map((segment) => segment.id)).toEqual(['d', 'e'])
})

test('avoids creating an overly airy non-final page when the next page can absorb more content', () => {
  const pages = paginateSegments(
    [
      createParagraphSegment('a', 85),
      createParagraphSegment('b', 85),
      createParagraphSegment('c', 85),
      createParagraphSegment('d', 85),
      createParagraphSegment('e', 85),
      createParagraphSegment('f', 85),
      createParagraphSegment('g', 85),
    ],
    580,
    15,
  )

  expect(pages).toHaveLength(2)
  expect(pages[0]?.segments.length).toBeGreaterThanOrEqual(4)
  expect(pages[1]?.segments.length).toBeLessThanOrEqual(3)
})

test('prefers a denser non-final page distribution for tall longform canvases', () => {
  const pages = paginateSegments(
    [
      createParagraphSegment('a', 130),
      createParagraphSegment('b', 120),
      createParagraphSegment('c', 118),
      createParagraphSegment('d', 116),
      createParagraphSegment('e', 114),
      createParagraphSegment('f', 112),
    ],
    780,
    15,
  )

  expect(pages).toHaveLength(2)
  expect(pages[0]?.segments.length).toBeGreaterThanOrEqual(4)
  expect(pages[1]?.segments.length).toBeLessThanOrEqual(2)
})

test('allows splitting a paragraph across pages while keeping at least two lines on both sides', () => {
  const pages = paginateSegments(
    [
      createParagraphLineSegment('p-1', 0, 5, 20),
      createParagraphLineSegment('p-1', 1, 5, 20),
      createParagraphLineSegment('p-1', 2, 5, 20),
      createParagraphLineSegment('p-1', 3, 5, 20),
      createParagraphLineSegment('p-1', 4, 5, 20),
    ],
    70,
    15,
  )

  expect(pages).toHaveLength(2)
  expect(pages[0]?.segments.map((segment) => segment.id)).toEqual([
    'p-1-line-0',
    'p-1-line-1',
    'p-1-line-2',
  ])
  expect(pages[1]?.segments.map((segment) => segment.id)).toEqual([
    'p-1-line-3',
    'p-1-line-4',
  ])
})

test('does not apply paragraph spacing between lines from the same paragraph', () => {
  const pages = paginateSegments(
    [
      createParagraphLineSegment('p-2', 0, 4, 20),
      createParagraphLineSegment('p-2', 1, 4, 20),
      createParagraphLineSegment('p-2', 2, 4, 20),
      createParagraphLineSegment('p-2', 3, 4, 20),
    ],
    80,
    15,
  )

  expect(pages).toHaveLength(1)
  expect(pages[0]?.segments).toHaveLength(4)
})
