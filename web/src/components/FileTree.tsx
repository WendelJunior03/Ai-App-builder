import { useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import type { FileEntry } from '../types'

interface Props {
  expanded?: boolean
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children: TreeNode[]
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      let existing = current.find((n) => n.name === part)

      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isLast ? file.type : 'dir',
          children: [],
        }
        current.push(existing)
      }

      current = existing.children
    }
  }

  return root
}

export function FileTree({ expanded: forceExpanded }: Props) {
  const files = useAppStore((s) => s.files)
  const selectedFile = useAppStore((s) => s.selectedFile)
  const selectFile = useAppStore((s) => s.setSelectedFile)
  const readFile = useAppStore((s) => s.setFileContent)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['']))

  const tree = buildTree(files)

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleFileClick = async (path: string) => {
    selectFile(path)
    try {
      const res = await fetch(`/api/files/file?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      readFile(data.content)
    } catch {}
  }

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = forceExpanded || expandedDirs.has(node.path)
    const isSelected = selectedFile === node.path

    if (node.type === 'dir') {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleDir(node.path)}
            className="flex items-center gap-1 w-full px-2 py-1 text-xs hover:bg-zinc-800 rounded transition-colors text-left"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isExpanded ? <FolderOpen size={14} className="text-amber-400" /> : <Folder size={14} className="text-amber-400" />}
            <span className="text-zinc-300">{node.name}</span>
          </button>
          {(isExpanded || forceExpanded) && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        key={node.path}
        onClick={() => handleFileClick(node.path)}
        className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors text-left ${
          isSelected ? 'bg-zinc-700 text-zinc-100' : 'hover:bg-zinc-800 text-zinc-400'
        }`}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
      >
        <File size={14} />
        <span>{node.name}</span>
      </button>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-900 p-2">
      {tree.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-8">No files yet</div>
      ) : (
        tree.map((node) => renderNode(node, 0))
      )}
    </div>
  )
}
