import { Hono } from "hono"
import { projectManager } from "../services/projects"
import { workspaceManager } from "../services/workspace"

const projectsRoute = new Hono()

projectsRoute.get("/", async (c) => {
  const config = await projectManager.listProjects()
  return c.json(config)
})

projectsRoute.post("/", async (c) => {
  const { name } = await c.req.json()
  if (!name || typeof name !== "string") {
    return c.json({ error: "name is required" }, 400)
  }

  const config = await projectManager.createProject(name)
  const files = await workspaceManager.listFiles()
  return c.json({ ...config, files })
})

projectsRoute.post("/:id/select", async (c) => {
  try {
    const config = await projectManager.selectProject(c.req.param("id"))
    const files = await workspaceManager.listFiles()
    return c.json({ ...config, files })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 404)
  }
})

export { projectsRoute }
