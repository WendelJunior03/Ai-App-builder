import { ApprovalBridge } from "../services/approval-bridge"

const BLOCKED_PREFIXES = ["rm -rf", "sudo", "chmod 777", "> /dev/sda"]

export function guardedCommand(bridge: ApprovalBridge) {
  return {
    name: "guarded_command",
    description: "Execute a shell command with user approval for dangerous operations",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        description: { type: "string", description: "Why this command is needed" },
      },
      required: ["command", "description"],
    },
    async execute(args: { command: string; description: string }) {
      const isDangerous = BLOCKED_PREFIXES.some((p) =>
        args.command.trim().startsWith(p)
      )
      if (isDangerous) {
        return { status: "blocked", message: `Command blocked for security: ${args.command}` }
      }

      const needsApproval =
        args.command.includes("rm") ||
        args.command.includes("install") ||
        args.command.includes("delete") ||
        args.command.includes("drop")

      if (needsApproval) {
        const approved = await bridge.requestApproval({
          type: "command",
          payload: args,
        })
        if (!approved) {
          return { status: "rejected", message: "Command rejected by user" }
        }
      }

      return { status: "approved", command: args.command }
    },
  }
}
