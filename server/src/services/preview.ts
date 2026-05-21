const PREVIEW_URL = process.env.PREVIEW_URL || "http://localhost:5173"

class PreviewService {
  private url: string

  constructor() {
    this.url = PREVIEW_URL
  }

  async getStatus(): Promise<{ running: boolean; url: string }> {
    try {
      const res = await fetch(this.url)
      return {
        running: res.ok,
        url: this.url,
      }
    } catch {
      return {
        running: false,
        url: this.url,
      }
    }
  }

  getUrl(): string {
    return this.url
  }
}

export const previewService = new PreviewService()
