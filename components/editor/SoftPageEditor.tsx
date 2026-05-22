'use client'

import { useEditorState } from './use-editor-state'

export function SoftPageEditor() {
  const { blocks } = useEditorState()

  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: '280px minmax(0, 1fr)',
        minHeight: '100vh',
      }}
    >
      <aside>编辑区</aside>
      <section>预览区</section>
      <div>{blocks.length}</div>
    </main>
  )
}
