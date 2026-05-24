import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { CoverCanvas } from './CoverCanvas'

test('renders fixed cover layout with hero image, title, author and divider', () => {
  render(
    <CoverCanvas
      title="封面标题"
      author="花萍雨"
      heroImageSrc="data:image/png;base64,abc"
      heroImageAlt="封面主图"
      hasDivider
    />,
  )

  expect(screen.getByText('封面标题')).toBeInTheDocument()
  expect(screen.getByText('| 作者：花萍雨')).toBeInTheDocument()
  expect(screen.getByAltText('封面主图')).toBeInTheDocument()
  expect(screen.getByTestId('cover-divider')).toBeInTheDocument()
})
