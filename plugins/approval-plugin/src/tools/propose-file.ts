import { ApprovalBridge } from "../services/approval-bridge"

export function proposeFile(bridge: ApprovalBridge) {
  return {
    name: "propose_file",
    description: "Propose file content for user approval before writing",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to workspace" },
        content: { type: "string", description: "Full file content" },
        action: { type: "string", enum: ["create", "modify"], description: "Action to perform" },
      },
      required: ["path", "content", "action"],
    },
    async execute(args: { path: string; content: string; action: string }) {
      const approved = await bridge.requestApproval({
        type: "file",
        payload: args,
      })
      if (!approved) {
        return { status: "rejected", message: "File write rejected by user" }
      }
      return { status: "approved", message: "File write approved, writing..." }
    },
  }
}
