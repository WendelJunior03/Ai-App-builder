import { create } from 'zustand'
import type { Message, FileEntry, ApprovalRequest, PanelView, AppSettings, ModelOption, Project } from '../types'

interface AppState {
  messages: Message[]
  files: FileEntry[]
  selectedFile: string | null
  fileContent: string | null
  panelView: PanelView
  pendingApproval: ApprovalRequest | null
  previewUrl: string
  engineConnected: boolean
  sessionId: string | null
  isStreaming: boolean
  settings: AppSettings
  availableModels: ModelOption[]
  projects: Project[]
  activeProjectId: string | null
  settingsOpen: boolean
  savingSettings: boolean

  addMessage: (msg: Message) => void
  setFiles: (files: FileEntry[]) => void
  setSelectedFile: (path: string | null) => void
  setFileContent: (content: string | null) => void
  setPanelView: (view: PanelView) => void
  setPendingApproval: (req: ApprovalRequest | null) => void
  setPreviewUrl: (url: string) => void
  setEngineConnected: (connected: boolean) => void
  setSessionId: (id: string | null) => void
  setIsStreaming: (streaming: boolean) => void
  setSettings: (s: AppSettings) => void
  setAvailableModels: (m: ModelOption[]) => void
  setProjects: (projects: Project[], activeProjectId: string | null) => void
  setSettingsOpen: (open: boolean) => void
  setSavingSettings: (saving: boolean) => void
  updateMessage: (id: string, content: string) => void
  reset: () => void
}

const initialState = {
  messages: [],
  files: [],
  selectedFile: null,
  fileContent: null,
  panelView: 'preview' as PanelView,
  pendingApproval: null,
  previewUrl: 'http://localhost:5173',
  engineConnected: false,
  sessionId: null,
  isStreaming: false,
  settings: { model: '', provider: '', apiKey: '' },
  availableModels: [],
  projects: [],
  activeProjectId: null,
  settingsOpen: false,
  savingSettings: false,
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setFiles: (files) => set({ files }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  setFileContent: (content) => set({ fileContent: content }),
  setPanelView: (view) => set({ panelView: view }),
  setPendingApproval: (req) => set({ pendingApproval: req }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setEngineConnected: (connected) => set({ engineConnected: connected }),
  setSessionId: (id) => set({ sessionId: id }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setSettings: (s) => set({ settings: s }),
  setAvailableModels: (m) => set({ availableModels: m }),
  setProjects: (projects, activeProjectId) => set({ projects, activeProjectId }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSavingSettings: (saving) => set({ savingSettings: saving }),
  updateMessage: (id, content) => set((s) => ({
    messages: s.messages.map((msg) => msg.id === id ? { ...msg, content, timestamp: Date.now() } : msg),
  })),
  reset: () => set(initialState),
}))
