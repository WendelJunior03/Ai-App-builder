import { create } from 'zustand'
import type {
  Message,
  FileEntry,
  ApprovalRequest,
  PanelView,
  AppSettings,
  ModelOption,
  Project,
  TokenUsage,
  TokenUsageSummary,
} from '../types'

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
  tokenUsage: TokenUsageSummary

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
  setTokenUsage: (usage: TokenUsageSummary | null | undefined) => void
  setSettingsOpen: (open: boolean) => void
  setSavingSettings: (saving: boolean) => void
  addTokenUsage: (usage: TokenUsage) => void
  resetTokenUsage: () => void
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
  tokenUsage: {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalReasoningTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    requestCount: 0,
    lastRequest: null,
    recentRequests: [],
  },
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
  setProjects: (projects, activeProjectId) => set({
    projects,
    activeProjectId,
    tokenUsage: projects.find((project) => project.id === activeProjectId)?.tokenUsage || initialState.tokenUsage,
  }),
  setTokenUsage: (usage) => set({ tokenUsage: usage || initialState.tokenUsage }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSavingSettings: (saving) => set({ savingSettings: saving }),
  addTokenUsage: (usage) => set((s) => ({
    tokenUsage: {
      totalInputTokens: s.tokenUsage.totalInputTokens + usage.inputTokens,
      totalOutputTokens: s.tokenUsage.totalOutputTokens + usage.outputTokens,
      totalReasoningTokens: s.tokenUsage.totalReasoningTokens + usage.reasoningTokens,
      totalCacheReadTokens: s.tokenUsage.totalCacheReadTokens + usage.cacheReadTokens,
      totalCacheWriteTokens: s.tokenUsage.totalCacheWriteTokens + usage.cacheWriteTokens,
      totalTokens: s.tokenUsage.totalTokens + usage.totalTokens,
      totalCostUsd: s.tokenUsage.totalCostUsd + (usage.costUsd || 0),
      requestCount: s.tokenUsage.requestCount + 1,
      lastRequest: usage,
      recentRequests: s.tokenUsage.recentRequests,
    },
  })),
  resetTokenUsage: () => set((s) => ({
    tokenUsage: {
      ...initialState.tokenUsage,
      lastRequest: s.tokenUsage.lastRequest,
    },
  })),
  updateMessage: (id, content) => set((s) => ({
    messages: s.messages.map((msg) => msg.id === id ? { ...msg, content, timestamp: Date.now() } : msg),
  })),
  reset: () => set(initialState),
}))
