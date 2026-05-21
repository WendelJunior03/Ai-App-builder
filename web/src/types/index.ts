export interface FileEntry {
  path: string
  type: 'file' | 'dir'
  size: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface ApprovalRequest {
  requestId: string
  type: 'plan' | 'file' | 'command'
  payload: Record<string, unknown>
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type PanelView = 'preview' | 'code' | 'files'

export interface AppSettings {
  model: string
  provider: string
  apiKey: string
}

export interface ModelOption {
  id: string
  name: string
  free: boolean
}
