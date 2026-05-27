import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { CoverCanvas } from './CoverCanvas'

test('renders fixed cover layout with hero image, title, author and divider', () => {
  const { container } = render(
    <CoverCanvas
      title="封面标题"
      author="花萍雨"
      titleFontSize={40}
      heroImageSrc="data:image/png;base64,abc"
      heroImageAlt="封面主图"
      hasDivider
    />,
  )

  const cover = container.querySelector('article')

  expect(cover).toHaveStyle('grid-template-rows: 8% auto auto auto 16%')
  expect(screen.getByTestId('cover-title')).toHaveTextContent('封面标题')
  expect(screen.getByText('| 作者：花萍雨')).toBeInTheDocument()
  expect(screen.getByAltText('封面主图')).toBeInTheDocument()
  expect(screen.getByTestId('cover-hero')).toHaveStyle('aspect-ratio: 16 / 9')
  expect(screen.getByTestId('cover-hero')).toHaveStyle('width: calc(100% + 56px)')
  expect(screen.getByTestId('cover-hero')).toHaveStyle('margin-inline: -28px')
  expect(screen.getByAltText('封面主图')).toHaveStyle('object-fit: cover')
  expect(screen.getByTestId('cover-divider')).toBeInTheDocument()
})
