import { Check, X, FileCode, Terminal, ListChecks } from 'lucide-react'
import type { ApprovalRequest } from '../types'

interface Props {
  request: ApprovalRequest
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

const icons = {
  plan: ListChecks,
  file: FileCode,
  command: Terminal,
}

export function ApprovalCard({ request, onApprove, onReject }: Props) {
  const Icon = icons[request.type]
  const payload = request.payload as Record<string, unknown>

  const getDescription = () => {
    if (request.type === 'plan') {
      const p = payload as { title?: string; description?: string; files?: Array<{ path: string; action: string }> }
      return (
        <div className="space-y-2">
          <p className="font-medium text-zinc-100">{p.title}</p>
          <p className="text-xs text-zinc-400">{p.description}</p>
          {p.files && (
            <ul className="space-y-1">
              {p.files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                    f.action === 'create' ? 'bg-emerald-500/20 text-emerald-400' :
                    f.action === 'modify' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {f.action}
                  </span>
                  <code className="font-mono">{f.path}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
    if (request.type === 'file') {
      const p = payload as { path?: string; action?: string }
      return (
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">
            <span className="text-zinc-300">{p.action}</span> file
          </p>
          <code className="text-xs font-mono text-zinc-200 bg-zinc-800 px-2 py-1 rounded block truncate">{p.path}</code>
        </div>
      )
    }
    if (request.type === 'command') {
      const p = payload as { command?: string; description?: string }
      return (
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">{p.description}</p>
          <code className="text-xs font-mono text-amber-300 bg-zinc-800 px-2 py-1 rounded block truncate">{p.command}</code>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-emerald-400" />
        <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
          {request.type} approval
        </span>
      </div>
      {getDescription()}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onApprove(request.requestId)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors"
        >
          <Check size={14} /> Approve
        </button>
        <button
          onClick={() => onReject(request.requestId)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
        >
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  )
}
