import { ApprovalBridge } from "../services/approval-bridge"

export function proposePlan(bridge: ApprovalBridge) {
  return {
    name: "propose_plan",
    description: "Propose a plan of files to create/modify for user approval before execution",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title of the plan" },
        description: { type: "string", description: "Detailed description of what will be done" },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              action: { type: "string", enum: ["create", "modify", "delete"] },
              description: { type: "string" },
            },
            required: ["path", "action", "description"],
          },
        },
        commands: {
          type: "array",
          items: { type: "string" },
          description: "Commands to run after applying changes",
        },
      },
      required: ["title", "description", "files"],
    },
    async execute(args: {
      title: string
      description: string
      files: Array<{ path: string; action: string; description: string }>
      commands?: string[]
    }) {
      const approved = await bridge.requestApproval({
        type: "plan",
        payload: args,
      })
      if (!approved) {
        return { status: "rejected", message: "Plan rejected by user" }
      }
      return { status: "approved", message: "Plan approved, proceeding..." }
    },
  }
}
