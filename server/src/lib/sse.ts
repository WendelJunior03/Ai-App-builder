export function formatSSE(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`
}

export function parseSSE(chunk: string): Array<{ event: string; data: string }> {
  const messages: Array<{ event: string; data: string }> = []
  let currentEvent = "message"
  let currentData = ""

  for (const line of chunk.split("\n")) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7)
    } else if (line.startsWith("data: ")) {
      currentData = line.slice(6)
    } else if (line === "" && currentData) {
      messages.push({ event: currentEvent, data: currentData })
      currentEvent = "message"
      currentData = ""
    }
  }

  if (currentData) {
    messages.push({ event: currentEvent, data: currentData })
  }

  return messages
}
