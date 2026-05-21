import { Hono } from "hono"
import { projectManager } from "../services/projects"

let sessionCounter = 0

const sessionRoute = new Hono()

sessionRoute.post("/init", async (c) => {
  const { plugin } = await c.req.json()
  await projectManager.ensureInitialized()
  const sessionId = `session_${Date.now()}_${++sessionCounter}`
  return c.json({ sessionId, plugin })
})

sessionRoute.post("/reset", async (c) => {
  return c.json({ status: "ok" })
})

export { sessionRoute }
