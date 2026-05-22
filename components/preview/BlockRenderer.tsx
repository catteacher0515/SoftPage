import type { Block, TypographyConfig } from '../editor/types'

type BlockRendererProps = {
  block: Block
  typography: TypographyConfig
  measure?: boolean
  active?: boolean
  onSelect?: () => void
}

export function BlockRenderer({
  block,
  typography,
  measure = false,
  active = false,
  onSelect,
}: BlockRendererProps) {
  if (block.type === 'image') {
    return (
      <img
        data-measure-block={measure ? '' : undefined}
        data-block-id={measure ? block.id : undefined}
        src={block.src}
        alt={block.alt}
        style={{ display: 'block', maxWidth: '100%', width: '100%', height: 'auto' }}
      />
    )
  }

  const paragraphs = block.value.split('\n')

  return (
    <div
      data-measure-block={measure ? '' : undefined}
      data-block-id={measure ? block.id : undefined}
      onClick={onSelect}
      style={{
        outline: active ? '2px solid #111' : '2px solid transparent',
        outlineOffset: 6,
        cursor: measure ? 'default' : 'text',
      }}
    >
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${block.id}-${index}-${paragraph}`}
          style={{
            margin: 0,
            marginBottom: index === paragraphs.length - 1 ? 0 : typography.paragraphSpacing,
          }}
        >
          {paragraph === '' ? '\u00a0' : paragraph}
        </p>
      ))}
    </div>
  )
}
