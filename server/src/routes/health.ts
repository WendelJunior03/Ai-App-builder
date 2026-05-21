import { Hono } from "hono"
import { OpencodeClient } from "../services/opencode-client"

const healthRoute = new Hono()
const opencode = new OpencodeClient()

healthRoute.get("/", async (c) => {
  const engineStatus = await opencode.healthCheck()
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    engine: engineStatus,
  })
})

export { healthRoute }
