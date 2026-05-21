import { proposePlan, proposeFile } from "./tools/propose-plan"
import { guardedCommand } from "./tools/guarded-command"
import { ApprovalBridge } from "./services/approval-bridge"

export type { ApprovalRequest, ApprovalResponse } from "./services/approval-bridge"

const bridge = new ApprovalBridge({
  serverUrl: "http://server:3000",
})

export const approvalPlugin = {
  name: "approval-plugin",
  version: "1.0.0",
  tools: [proposePlan(bridge), proposeFile(bridge), guardedCommand(bridge)],
  async onStart() {
    await bridge.connect()
  },
  async onStop() {
    bridge.disconnect()
  },
}

export default approvalPlugin
