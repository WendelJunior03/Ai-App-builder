import Editor from '@monaco-editor/react'
import { useAppStore } from '../stores/appStore'

export function CodeEditor() {
  const selectedFile = useAppStore((s) => s.selectedFile)
  const fileContent = useAppStore((s) => s.fileContent)

  const getLanguage = (path: string | null): string => {
    if (!path) return 'plaintext'
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript'
    if (path.endsWith('.css')) return 'css'
    if (path.endsWith('.html')) return 'html'
    if (path.endsWith('.json')) return 'json'
    return 'plaintext'
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="h-8 flex items-center px-3 bg-zinc-800/50 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">{selectedFile || 'No file selected'}</span>
      </div>
      <div className="flex-1">
        {selectedFile ? (
          <Editor
            language={getLanguage(selectedFile)}
            value={fileContent || ''}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              padding: { top: 8 },
              wordWrap: 'on',
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            Select a file from the Files tab
          </div>
        )}
      </div>
    </div>
  )
}
