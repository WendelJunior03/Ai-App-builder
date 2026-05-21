import { useAppStore } from '../stores/appStore'
import type { TokenUsage } from '../types'

const API_BASE = '/api'

export class ApiClient {
  private abortController: AbortController | null = null

  async initSession(): Promise<string> {
    const res = await fetch(`${API_BASE}/session/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin: 'approval-plugin' }),
    })
    const data = await res.json()
    return data.sessionId
  }

  async sendMessage(message: string, onChunk: (text: string) => void, onDone: () => void): Promise<void> {
    this.abortController = new AbortController()
    const store = useAppStore.getState()
    const sessionId = store.sessionId

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
      signal: this.abortController.signal,
    })

    if (!res.ok) throw new Error(`Chat error: ${res.status}`)

    const data = await res.json()
    if (data.error) {
      onChunk(`Error: ${data.error}`)
    } else {
      if (data.response) onChunk(data.response)
      if (data.files) useAppStore.getState().setFiles(data.files)
      if (data.projects) useAppStore.getState().setProjects(data.projects, data.activeProjectId)
      if (!data.projects && data.tokenUsage) useAppStore.getState().addTokenUsage(data.tokenUsage as TokenUsage)
    }
    onDone()
  }

  async approveRequest(requestId: string, approved: boolean): Promise<void> {
    await fetch(`${API_BASE}/approve/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, approved }),
    })
    useAppStore.getState().setPendingApproval(null)
  }

  async listFiles(dir?: string) {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : ''
    const res = await fetch(`${API_BASE}/files${params}`)
    const data = await res.json()
    return data.files
  }

  async listProjects() {
    const res = await fetch(`${API_BASE}/projects`)
    const data = await res.json()
    return data
  }

  async createProject(name: string) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(`Create project error: ${res.status}`)
    return res.json()
  }

  async selectProject(id: string) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(id)}/select`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error(`Select project error: ${res.status}`)
    return res.json()
  }

  async readFile(path: string) {
    const res = await fetch(`${API_BASE}/files/file?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    return data.content
  }

  cancelStream(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`)
      const data = await res.json()
      return data.engine?.status === 'connected' || data.engine?.status === 'available'
    } catch {
      return false
    }
  }

  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`)
    const data = await res.json()
    return data.settings
  }

  async saveSettings(settings: { model?: string; provider?: string; apiKey?: string }) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    return res.json()
  }

  async getAvailableModels() {
    const res = await fetch(`${API_BASE}/settings/models`)
    const data = await res.json()
    return data.models
  }

  async getCodexStatus() {
    const res = await fetch(`${API_BASE}/settings/codex/status`)
    return res.json()
  }

  async startCodexLogin() {
    const res = await fetch(`${API_BASE}/settings/codex/login`, {
      method: 'POST',
    })
    return res.json()
  }

  async logoutCodex() {
    const res = await fetch(`${API_BASE}/settings/codex/logout`, {
      method: 'POST',
    })
    return res.json()
  }
}

export const apiClient = new ApiClient()
