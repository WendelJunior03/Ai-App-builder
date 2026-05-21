import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Chat } from './Chat'
import { Preview } from './Preview'
import { CodeEditor } from './CodeEditor'
import { FileTree } from './FileTree'
import { Header } from './Header'
import { SettingsPanel } from './SettingsPanel'
import { useAppStore } from '../stores/appStore'

export function Layout() {
  const panelView = useAppStore((s) => s.panelView)

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      <Header />
      <SettingsPanel />
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={35} minSize={25} maxSize={50}>
            <Chat />
          </Panel>
          <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-col-resize" />
          <Panel defaultSize={65} minSize={50}>
            {panelView === 'preview' && <Preview />}
            {panelView === 'code' && (
              <PanelGroup direction="vertical">
                <Panel defaultSize={70}>
                  <CodeEditor />
                </Panel>
                <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-zinc-600 transition-colors cursor-row-resize" />
                <Panel defaultSize={30}>
                  <FileTree />
                </Panel>
              </PanelGroup>
            )}
            {panelView === 'files' && <FileTree expanded />}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
