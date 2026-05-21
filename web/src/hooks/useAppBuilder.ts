import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { apiClient } from '../api/client'

export function useAppBuilder() {
  const store = useAppStore()
  const inputRef = useRef('')

  useEffect(() => {
    const init = async () => {
      try {
        const [sessionId, settings] = await Promise.all([
          apiClient.initSession(),
          apiClient.getSettings(),
        ])
        useAppStore.getState().setSessionId(sessionId)
        useAppStore.getState().setSettings(settings)
        useAppStore.getState().setEngineConnected(true)
        const projects = await apiClient.listProjects()
        useAppStore.getState().setProjects(projects.projects, projects.activeProjectId)
        const files = await apiClient.listFiles()
        useAppStore.getState().setFiles(files)
      } catch {
        useAppStore.getState().setEngineConnected(false)
      }
    }
    init()
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || store.isStreaming) return

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: Date.now(),
    }
    useAppStore.getState().addMessage(userMsg)
    useAppStore.getState().setIsStreaming(true)

    const assistantMsgId = `msg_${Date.now() + 1}`
    useAppStore.getState().addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    })

    try {
      let assistantContent = ''
      await apiClient.sendMessage(
        message,
        (chunk) => {
          assistantContent += chunk
          useAppStore.getState().updateMessage(assistantMsgId, assistantContent)
        },
        () => {
          useAppStore.getState().setIsStreaming(false)
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      useAppStore.getState().updateMessage(assistantMsgId, `Error: ${message}`)
      useAppStore.getState().setIsStreaming(false)
    }
  }, [store.isStreaming])

  const approve = useCallback(async (requestId: string, approved: boolean) => {
    await apiClient.approveRequest(requestId, approved)
  }, [])

  const selectFile = useCallback(async (path: string) => {
    useAppStore.getState().setSelectedFile(path)
    const content = await apiClient.readFile(path)
    useAppStore.getState().setFileContent(content)
  }, [])

  const createProject = useCallback(async (name: string) => {
    const data = await apiClient.createProject(name)
    useAppStore.getState().setProjects(data.projects, data.activeProjectId)
    useAppStore.getState().setFiles(data.files || [])
    useAppStore.getState().setSelectedFile(null)
    useAppStore.getState().setFileContent(null)
    useAppStore.getState().setPreviewUrl(`http://localhost:5173?t=${Date.now()}`)
  }, [])

  const selectProject = useCallback(async (id: string) => {
    const data = await apiClient.selectProject(id)
    useAppStore.getState().setProjects(data.projects, data.activeProjectId)
    useAppStore.getState().setFiles(data.files || [])
    useAppStore.getState().setSelectedFile(null)
    useAppStore.getState().setFileContent(null)
    useAppStore.getState().setPreviewUrl(`http://localhost:5173?t=${Date.now()}`)
  }, [])

  return {
    ...store,
    sendMessage,
    approve,
    selectFile,
    createProject,
    selectProject,
  }
}
