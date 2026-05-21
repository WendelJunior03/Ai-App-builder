import { Hono } from "hono"
import { cors } from "hono/cors"
import { chatRoute } from "./routes/chat"
import { approveRoute } from "./routes/approve"
import { filesRoute } from "./routes/files"
import { sessionRoute } from "./routes/session"
import { healthRoute } from "./routes/health"
import { settingsRoute } from "./routes/settings"
import { projectsRoute } from "./routes/projects"
import { staticFiles } from "./lib/static"

const app = new Hono()

app.use("/api/*", cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  credentials: true,
}))

app.route("/api/chat", chatRoute)
app.route("/api/approve", approveRoute)
app.route("/api/files", filesRoute)
app.route("/api/session", sessionRoute)
app.route("/api/health", healthRoute)
app.route("/api/settings", settingsRoute)
app.route("/api/projects", projectsRoute)

const staticDir = process.env.STATIC_DIR || "../web/dist"
app.use("/*", staticFiles({ root: staticDir }))

const port = parseInt(process.env.PORT || "3000")

if (typeof Bun !== "undefined") {
  console.log(`Server running on http://0.0.0.0:${port} (Bun)`)
} else {
  const { serve } = await import("@hono/node-server")
  serve({ fetch: app.fetch, port })
  console.log(`Server running on http://0.0.0.0:${port} (Node)`)
}
