import { Hono } from "hono"

interface PendingApproval {
  requestId: string
  sessionId: string
  type: "plan" | "file" | "command"
  payload: Record<string, unknown>
  resolved: boolean
  approved: boolean
  createdAt: number
}

const approvals = new Map<string, PendingApproval>()
let counter = 0

const approveRoute = new Hono()

approveRoute.post("/", async (c) => {
  const { sessionId, type, payload } = await c.req.json()
  const requestId = `req_${Date.now()}_${++counter}`

  const approval: PendingApproval = {
    requestId,
    sessionId,
    type,
    payload,
    resolved: false,
    approved: false,
    createdAt: Date.now(),
  }

  approvals.set(requestId, approval)

  // Clean old entries
  for (const [id, a] of approvals) {
    if (Date.now() - a.createdAt > 5 * 60 * 1000) {
      approvals.delete(id)
    }
  }

  return c.json({ requestId })
})

approveRoute.post("/respond", async (c) => {
  const { requestId, approved } = await c.req.json()
  const approval = approvals.get(requestId)

  if (!approval) {
    return c.json({ error: "Request not found" }, 404)
  }

  approval.resolved = true
  approval.approved = approved

  return c.json({ status: "ok" })
})

approveRoute.get("/pending", async (c) => {
  const sessionId = c.req.query("sessionId")

  const pending = []
  for (const [, a] of approvals) {
    if (a.sessionId === sessionId && !a.resolved) {
      pending.push({
        requestId: a.requestId,
        type: a.type,
        payload: a.payload,
      })
    }
  }

  return c.json({ responses: pending })
})

approveRoute.get("/:requestId", async (c) => {
  const approval = approvals.get(c.req.param("requestId"))
  if (!approval) {
    return c.json({ error: "Not found" }, 404)
  }
  return c.json({
    resolved: approval.resolved,
    approved: approval.approved,
    type: approval.type,
  })
})

export { approveRoute }
