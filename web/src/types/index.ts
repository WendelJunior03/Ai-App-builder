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
  tokenUsage?: TokenUsageSummary
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
  contextWindow?: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
  contextWindow?: number
  remainingTokens?: number
  costUsd?: number
}

export interface TokenUsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  totalReasoningTokens: number
  totalCacheReadTokens: number
  totalCacheWriteTokens: number
  totalTokens: number
  totalCostUsd: number
  requestCount: number
  lastRequest: TokenUsage | null
  recentRequests: TokenUsageRequest[]
}

export interface TokenUsageRequest extends TokenUsage {
  id: string
  message: string
  model: string
  createdAt: number
}
