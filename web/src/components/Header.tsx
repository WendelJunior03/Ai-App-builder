import { Plus, Settings } from 'lucide-react'
import type { FileEntry, PanelView, Project } from '../types'
import { useAppStore } from '../stores/appStore'
import { apiClient } from '../api/client'

const tabs: { id: PanelView; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
  { id: 'files', label: 'Files' },
]

export function Header() {
  const panelView = useAppStore((s) => s.panelView)
  const setPanelView = useAppStore((s) => s.setPanelView)
  const engineConnected = useAppStore((s) => s.engineConnected)
  const sessionId = useAppStore((s) => s.sessionId)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const settings = useAppStore((s) => s.settings)
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const setProjects = useAppStore((s) => s.setProjects)
  const setFiles = useAppStore((s) => s.setFiles)
  const setSelectedFile = useAppStore((s) => s.setSelectedFile)
  const setFileContent = useAppStore((s) => s.setFileContent)
  const setPreviewUrl = useAppStore((s) => s.setPreviewUrl)

  const hasCustomModel = settings.model || settings.apiKey

  const refreshProjectState = (data: { projects: Project[]; activeProjectId: string | null; files?: FileEntry[] }) => {
    setProjects(data.projects, data.activeProjectId)
    setFiles(data.files || [])
    setSelectedFile(null)
    setFileContent(null)
    setPreviewUrl(`http://localhost:5173?t=${Date.now()}`)
  }

  const handleSelectProject = async (id: string) => {
    if (!id || id === activeProjectId) return
    const data = await apiClient.selectProject(id)
    refreshProjectState(data)
  }

  const handleCreateProject = async () => {
    const name = window.prompt('Nome do projeto')
    if (!name?.trim()) return
    const data = await apiClient.createProject(name.trim())
    refreshProjectState(data)
  }

  return (
    <header className="h-10 flex items-center justify-between px-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-100">AI App Builder</span>
        <div className="flex items-center gap-1">
          <select
            value={activeProjectId || ''}
            onChange={(event) => handleSelectProject(event.target.value)}
            className="h-7 max-w-48 rounded bg-zinc-800 px-2 text-xs text-zinc-200 outline-none border border-zinc-700"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateProject}
            className="h-7 w-7 inline-flex items-center justify-center rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
            title="Novo projeto"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPanelView(tab.id)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                panelView === tab.id
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {sessionId && (
          <span className="text-[10px] text-zinc-500 font-mono">session: {sessionId.slice(0, 8)}</span>
        )}
        <button
          onClick={() => setSettingsOpen(true)}
          className={`p-1 rounded transition-colors ${
            hasCustomModel ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Settings"
        >
          <Settings size={15} />
        </button>
        <span className={`inline-block w-2 h-2 rounded-full ${engineConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-xs text-zinc-400">{engineConnected ? 'Engine OK' : 'Disconnected'}</span>
      </div>
    </header>
  )
}
