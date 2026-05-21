import { useState, useEffect } from 'react'
import { X, Sparkles, Key, Cpu } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { apiClient } from '../api/client'
import type { ModelOption } from '../types'

export function SettingsPanel() {
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const availableModels = useAppStore((s) => s.availableModels)
  const setAvailableModels = useAppStore((s) => s.setAvailableModels)
  const open = useAppStore((s) => s.settingsOpen)
  const setOpen = useAppStore((s) => s.setSettingsOpen)
  const saving = useAppStore((s) => s.savingSettings)
  const setSaving = useAppStore((s) => s.setSavingSettings)

  const [model, setModel] = useState(settings.model)
  const [provider, setProvider] = useState(settings.provider)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [activeTab, setActiveTab] = useState<'model' | 'apikey'>('model')

  useEffect(() => {
    if (open) {
      setModel(settings.model)
      setProvider(settings.provider)
      setApiKey(settings.apiKey)
      apiClient.getAvailableModels().then(setAvailableModels).catch(() => {})
    }
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await apiClient.saveSettings({ model, provider, apiKey })
      setSettings(result.settings)
      setOpen(false)
    } catch {}
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-zinc-800 rounded transition-colors">
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('model')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'model' ? 'text-zinc-100 border-b-2 border-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Cpu size={14} /> Model
          </button>
          <button
            onClick={() => setActiveTab('apikey')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'apikey' ? 'text-zinc-100 border-b-2 border-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Key size={14} /> API Key
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activeTab === 'model' && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">AI Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:ring-1 focus:ring-zinc-500 outline-none"
                >
                  <option value="">Use Opencode default</option>
                  {availableModels.map((m: ModelOption) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.free ? '(Free)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  <Sparkles size={12} className="inline mr-1 text-emerald-400" />
                  Free models available — no API key needed.
                </p>
                <p className="text-xs text-zinc-500">
                  If you add an API key below, you can use any model supported by that provider.
                </p>
              </div>
            </>
          )}

          {activeTab === 'apikey' && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:ring-1 focus:ring-zinc-500 outline-none"
                >
                  <option value="">Select provider</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:ring-1 focus:ring-zinc-500 outline-none placeholder-zinc-500"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Your key is stored locally and never shared.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-100 disabled:opacity-40 transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
