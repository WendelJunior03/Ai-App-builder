import { useState } from 'react'
import { useAppStore } from '../stores/appStore'

export function Preview() {
  const previewUrl = useAppStore((s) => s.previewUrl)
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="h-full bg-white relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
          Loading preview...
        </div>
      )}
      <iframe
        src={previewUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        title="App Preview"
      />
    </div>
  )
}
