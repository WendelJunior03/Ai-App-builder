export interface ApprovalRequest {
  type: "plan" | "file" | "command"
  payload: Record<string, unknown>
}

export interface ApprovalResponse {
  approved: boolean
  sessionId: string
}

interface BridgeConfig {
  serverUrl: string
  pollInterval?: number
}

interface PendingRequest {
  resolve: (approved: boolean) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class ApprovalBridge {
  private serverUrl: string
  private pollInterval: number
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private sessionId: string | null = null
  private polling = false

  constructor(config: BridgeConfig) {
    this.serverUrl = config.serverUrl
    this.pollInterval = config.pollInterval ?? 1000
  }

  async connect(): Promise<void> {
    const res = await fetch(`${this.serverUrl}/api/session/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plugin: "approval-plugin" }),
    })
    const data = await res.json()
    this.sessionId = data.sessionId
    this.startPolling()
  }

  disconnect(): void {
    this.polling = false
    for (const [, entry] of this.pendingRequests) {
      clearTimeout(entry.timer)
      entry.reject(new Error("Bridge disconnected"))
    }
    this.pendingRequests.clear()
  }

  async requestApproval(request: ApprovalRequest): Promise<boolean> {
    if (!this.sessionId) {
      throw new Error("Not connected to server")
    }

    const res = await fetch(`${this.serverUrl}/api/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        sessionId: this.sessionId,
      }),
    })
    const { requestId } = await res.json()

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error("Approval request timed out"))
      }, 5 * 60 * 1000) // 5 min timeout

      this.pendingRequests.set(requestId, { resolve, reject, timer })
    })
  }

  private startPolling(): void {
    this.polling = true
    this.poll()
  }

  private async poll(): Promise<void> {
    if (!this.polling || !this.sessionId) return

    try {
      const res = await fetch(
        `${this.serverUrl}/api/approve/pending?sessionId=${this.sessionId}`
      )
      if (res.ok) {
        const data = await res.json()
        for (const response of data.responses ?? []) {
          const entry = this.pendingRequests.get(response.requestId)
          if (entry) {
            clearTimeout(entry.timer)
            this.pendingRequests.delete(response.requestId)
            entry.resolve(response.approved)
          }
        }
      }
    } catch {
      // Server not ready yet, retry
    }

    if (this.polling) {
      setTimeout(() => this.poll(), this.pollInterval)
    }
  }
}
