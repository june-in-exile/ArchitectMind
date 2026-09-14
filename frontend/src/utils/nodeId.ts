const NODE_ID_PATTERN = /^node-(\d+)$/

let nodeIdCounter = 0

export function generateNodeId(): string {
  nodeIdCounter += 1
  return `node-${nodeIdCounter}`
}

export function seedNodeIdCounter(ids: readonly string[]): void {
  const highest = ids.reduce((max, id) => {
    const match = NODE_ID_PATTERN.exec(id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  nodeIdCounter = Math.max(nodeIdCounter, highest)
}
