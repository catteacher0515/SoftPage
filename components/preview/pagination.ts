import type { Block } from '../editor/types'

export type MeasuredSegment = {
  id: string
  blockId: string
  block: Block
  kind: 'paragraph' | 'image' | 'table' | 'missing-image' | 'divider'
  text: string
  height: number
  paragraphId?: string
  lineIndex?: number
  lineCount?: number
}

export type PaginatedPage = {
  id: string
  segments: MeasuredSegment[]
}

type PaginationConfig = {
  availableHeight: number
  segmentGap: number
  isLongformCanvas: boolean
  comfortableWhitespaceMin: number
  comfortableWhitespaceMax: number
  comfortableWhitespaceTarget: number
}

type CandidateBreak = {
  endIndex: number
  usedHeight: number
}

const MIN_PARAGRAPH_LINES_PER_PAGE = 2

export function paginateSegments(
  segments: MeasuredSegment[],
  availableHeight: number,
  segmentGap: number,
): PaginatedPage[] {
  if (segments.length === 0) {
    return []
  }

  const isLongformCanvas = availableHeight >= 600
  const config: PaginationConfig = {
    availableHeight,
    segmentGap,
    isLongformCanvas,
    comfortableWhitespaceMin: availableHeight * (isLongformCanvas ? 0.04 : 0.05),
    comfortableWhitespaceMax: availableHeight * (isLongformCanvas ? 0.12 : 0.16),
    comfortableWhitespaceTarget: availableHeight * (isLongformCanvas ? 0.07 : 0.1),
  }

  const pages: PaginatedPage[] = []
  let startIndex = 0

  while (startIndex < segments.length) {
    const pageEndIndex = choosePageBreak(segments, startIndex, config)

    pages.push({
      id: `page-${pages.length + 1}`,
      segments: segments.slice(startIndex, pageEndIndex + 1),
    })

    startIndex = pageEndIndex + 1
  }

  return pages
}

function choosePageBreak(
  segments: MeasuredSegment[],
  startIndex: number,
  config: PaginationConfig,
) {
  return findBestPagination(segments, config).get(startIndex)?.endIndex ?? startIndex
}

function collectCandidateBreaks(
  segments: MeasuredSegment[],
  startIndex: number,
  config: PaginationConfig,
) {
  const candidates: CandidateBreak[] = []
  let usedHeight = 0

  for (let index = startIndex; index < segments.length; index += 1) {
    const segment = segments[index]

    if (!segment) {
      continue
    }

    const nextHeight =
      index === startIndex
        ? segment.height
        : usedHeight + getSegmentGap(segments[index - 1], segment, config.segmentGap) + segment.height

    if (index > startIndex && nextHeight > config.availableHeight) {
      break
    }

    usedHeight = nextHeight
    if (isValidParagraphBreak(segments, startIndex, index)) {
      candidates.push({
        endIndex: index,
        usedHeight,
      })
    }
  }

  if (candidates.length === 0) {
    const firstSegment = segments[startIndex]

    if (firstSegment) {
      candidates.push({
        endIndex: startIndex,
        usedHeight: firstSegment.height,
      })
    }
  }

  return candidates
}

function findBestPagination(
  segments: MeasuredSegment[],
  config: PaginationConfig,
) {
  const memo = new Map<
    number,
    {
      endIndex: number
      score: number
      firstWhitespace: number
      firstSegmentCount: number
    }
  >()

  const solveFrom = (
    startIndex: number,
  ): {
    endIndex: number
    score: number
    firstWhitespace: number
    firstSegmentCount: number
  } => {
    const cached = memo.get(startIndex)

    if (cached) {
      return cached
    }

    const candidates = collectCandidateBreaks(segments, startIndex, config)

    if (candidates.length === 0) {
      const result = {
        endIndex: startIndex,
        score: Number.NEGATIVE_INFINITY,
        firstWhitespace: config.availableHeight,
        firstSegmentCount: 0,
      }
      memo.set(startIndex, result)
      return result
    }

    let best = {
      endIndex: candidates[0]?.endIndex ?? startIndex,
      score: Number.NEGATIVE_INFINITY,
      firstWhitespace: config.availableHeight,
      firstSegmentCount: 0,
    }

    candidates.forEach((candidate) => {
      const nextStartIndex = candidate.endIndex + 1
      const currentSegments = segments.slice(startIndex, candidate.endIndex + 1)
      const currentWhitespace = config.availableHeight - candidate.usedHeight
      const pageScore = scorePage(
        currentSegments,
        currentWhitespace,
        config,
        nextStartIndex >= segments.length,
      )
      const nextPlan =
        nextStartIndex >= segments.length ? undefined : solveFrom(nextStartIndex)
      const nextScore = nextPlan?.score ?? 0
      const transitionScore = scorePageTransition(
        currentWhitespace,
        currentSegments.length,
        nextPlan,
        config,
      )
      const totalScore = pageScore + nextScore + transitionScore

      if (totalScore > best.score) {
        best = {
          endIndex: candidate.endIndex,
          score: totalScore,
          firstWhitespace: currentWhitespace,
          firstSegmentCount: currentSegments.length,
        }
      }
    })

    memo.set(startIndex, best)
    return best
  }

  solveFrom(0)
  return memo
}

function scorePage(
  pageSegments: MeasuredSegment[],
  whitespace: number,
  config: PaginationConfig,
  isFinalPage: boolean,
) {
  let score = 0

  score += scoreWhitespace(whitespace, config, isFinalPage)
  score += scorePageComposition(pageSegments, whitespace, config, isFinalPage)

  return score
}

function scoreWhitespace(
  whitespace: number,
  config: PaginationConfig,
  isFinalPage: boolean,
) {
  if (whitespace < 0) {
    return -10000
  }

  if (
    whitespace >= config.comfortableWhitespaceMin &&
    whitespace <= config.comfortableWhitespaceMax
  ) {
    const scoreBase = config.isLongformCanvas ? 84 : 72
    const slope = config.isLongformCanvas ? 0.85 : 0.7
    return scoreBase - Math.abs(whitespace - config.comfortableWhitespaceTarget) * slope
  }

  if (whitespace < config.comfortableWhitespaceMin) {
    const distance = config.comfortableWhitespaceMin - whitespace
    const scoreBase = config.isLongformCanvas ? 56 : 48
    const slope = config.isLongformCanvas ? 0.9 : 0.95
    return scoreBase - distance * slope
  }

  const distance = whitespace - config.comfortableWhitespaceMax
  const airyPenalty = config.isLongformCanvas
    ? isFinalPage
      ? 0.18
      : 0.95
    : isFinalPage
      ? 0.32
      : 0.68
  const scoreBase = config.isLongformCanvas ? 4 : 12
  return scoreBase - distance * airyPenalty
}

function scorePageComposition(
  pageSegments: MeasuredSegment[],
  whitespace: number,
  config: PaginationConfig,
  isFinalPage: boolean,
) {
  if (pageSegments.length === 0) {
    return -10000
  }

  let score = 0
  const lastSegment = pageSegments[pageSegments.length - 1]

  if (
    lastSegment &&
    (lastSegment.kind === 'divider' || lastSegment.kind === 'image')
  ) {
    score -= 80
  }

  if (pageSegments.length === 1) {
    const onlySegment = pageSegments[0]

    if (
      onlySegment &&
      whitespace > config.comfortableWhitespaceMax
    ) {
      score -= config.isLongformCanvas
        ? isFinalPage
          ? 190
          : 180
        : isFinalPage
          ? 180
          : 150
    }
  }

  if (
    config.isLongformCanvas &&
    !isFinalPage &&
    pageSegments.length <= 2 &&
    whitespace > config.comfortableWhitespaceMax
  ) {
    score -= 320
  }

  if (
    config.isLongformCanvas &&
    !isFinalPage &&
    pageSegments.length === 3 &&
    whitespace > config.comfortableWhitespaceTarget * 1.8
  ) {
    score -= 180
  }

  if (!isFinalPage && whitespace > config.comfortableWhitespaceMax * (config.isLongformCanvas ? 1.1 : 1.2)) {
    score -= config.isLongformCanvas ? 180 : 150
  }

  if (!isFinalPage && whitespace > config.comfortableWhitespaceMax * (config.isLongformCanvas ? 1.35 : 1.55)) {
    score -= config.isLongformCanvas ? 280 : 250
  }

  if (isFinalPage && whitespace > config.comfortableWhitespaceMax * (config.isLongformCanvas ? 2.1 : 1.85)) {
    score -= config.isLongformCanvas ? 55 : 90
  }

  return score
}

function scorePageTransition(
  currentWhitespace: number,
  currentSegmentCount: number,
  nextPlan:
    | {
        endIndex: number
        score: number
        firstWhitespace: number
        firstSegmentCount: number
      }
    | undefined,
  config: PaginationConfig,
) {
  if (!nextPlan) {
    return 0
  }

  let score = 0
  const whitespaceDelta = Math.abs(currentWhitespace - nextPlan.firstWhitespace)

  score -= whitespaceDelta * (config.isLongformCanvas ? 0.58 : 0.48)

  if (
    nextPlan.firstSegmentCount === 1 &&
    nextPlan.firstWhitespace > config.comfortableWhitespaceMax
  ) {
    score -= config.isLongformCanvas ? 170 : 170

    if (currentSegmentCount >= 2) {
      score -= config.isLongformCanvas ? 55 : 55
    }
  }

  if (
    currentWhitespace > config.comfortableWhitespaceMax * (config.isLongformCanvas ? 1.1 : 1.2) &&
    nextPlan.firstWhitespace < currentWhitespace
  ) {
    score -= config.isLongformCanvas ? 190 : 150
  }

  if (
    config.isLongformCanvas &&
    currentWhitespace > config.comfortableWhitespaceMax * 1.2 &&
    nextPlan.firstSegmentCount <= 2
  ) {
    score -= 320
  }

  if (
    config.isLongformCanvas &&
    currentWhitespace > config.comfortableWhitespaceTarget * 1.6 &&
    nextPlan.firstSegmentCount <= 3
  ) {
    score -= 240
  }

  if (
    config.isLongformCanvas &&
    currentWhitespace > config.comfortableWhitespaceTarget * 1.3 &&
    currentSegmentCount <= 3 &&
    nextPlan.firstSegmentCount <= 3
  ) {
    score -= 260
  }

  return score
}

function getSegmentGap(
  previousSegment: MeasuredSegment | undefined,
  nextSegment: MeasuredSegment,
  defaultGap: number,
) {
  if (!previousSegment) {
    return 0
  }

  if (
    previousSegment.kind === 'paragraph' &&
    nextSegment.kind === 'paragraph' &&
    previousSegment.paragraphId &&
    nextSegment.paragraphId &&
    previousSegment.paragraphId === nextSegment.paragraphId
  ) {
    return 0
  }

  return defaultGap
}

function isValidParagraphBreak(
  segments: MeasuredSegment[],
  startIndex: number,
  endIndex: number,
) {
  const lastSegment = segments[endIndex]

  if (!lastSegment || lastSegment.kind !== 'paragraph' || !lastSegment.paragraphId) {
    return true
  }

  const paragraphId = lastSegment.paragraphId
  const pageParagraphSegments = segments
    .slice(startIndex, endIndex + 1)
    .filter(
      (segment) => segment.kind === 'paragraph' && segment.paragraphId === paragraphId,
    )

  const paragraphLineCount = lastSegment.lineCount ?? pageParagraphSegments.length

  const endsParagraph =
    typeof lastSegment.lineIndex === 'number'
      ? lastSegment.lineIndex === paragraphLineCount - 1
      : pageParagraphSegments.length === paragraphLineCount

  if (pageParagraphSegments.length === paragraphLineCount) {
    return true
  }

  if (pageParagraphSegments.length < MIN_PARAGRAPH_LINES_PER_PAGE) {
    return false
  }

  if (endsParagraph) {
    return true
  }

  const remainingParagraphLines = segments
    .slice(endIndex + 1)
    .filter(
      (segment) => segment.kind === 'paragraph' && segment.paragraphId === paragraphId,
    )

  return remainingParagraphLines.length >= MIN_PARAGRAPH_LINES_PER_PAGE
}
