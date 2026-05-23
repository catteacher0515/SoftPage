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

type PaginationConfig = {
  availableHeight: number
  segmentGap: number
  comfortableWhitespaceMin: number
  comfortableWhitespaceMax: number
  comfortableWhitespaceTarget: number
}

type CandidateBreak = {
  endIndex: number
  usedHeight: number
}

export function paginateSegments(
  segments: MeasuredSegment[],
  availableHeight: number,
  segmentGap: number,
): PaginatedPage[] {
  if (segments.length === 0) {
    return []
  }

  const config: PaginationConfig = {
    availableHeight,
    segmentGap,
    comfortableWhitespaceMin: availableHeight * 0.08,
    comfortableWhitespaceMax: availableHeight * 0.22,
    comfortableWhitespaceTarget: availableHeight * 0.15,
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
        : usedHeight + config.segmentGap + segment.height

    if (index > startIndex && nextHeight > config.availableHeight) {
      break
    }

    usedHeight = nextHeight
    candidates.push({
      endIndex: index,
      usedHeight,
    })
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
    return 60 - Math.abs(whitespace - config.comfortableWhitespaceTarget) * 0.55
  }

  if (whitespace < config.comfortableWhitespaceMin) {
    const distance = config.comfortableWhitespaceMin - whitespace
    return 38 - distance * 1.15
  }

  const distance = whitespace - config.comfortableWhitespaceMax
  const airyPenalty = isFinalPage ? 0.22 : 0.35
  return 24 - distance * airyPenalty
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
      score -= isFinalPage ? 160 : 120
    }
  }

  if (!isFinalPage && whitespace > config.comfortableWhitespaceMax * 1.45) {
    score -= 45
  }

  if (isFinalPage && whitespace > config.comfortableWhitespaceMax * 2) {
    score -= 70
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

  score -= whitespaceDelta * 0.38

  if (
    nextPlan.firstSegmentCount === 1 &&
    nextPlan.firstWhitespace > config.comfortableWhitespaceMax
  ) {
    score -= 140

    if (currentSegmentCount >= 2) {
      score -= 40
    }
  }

  return score
}
