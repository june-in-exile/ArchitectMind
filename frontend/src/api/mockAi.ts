import type { Node, Edge } from '@xyflow/react'

export interface AiFeedbackResponse {
  message: string
  score: number
}

export async function mockSubmitDesign(
  _nodes: Node[],
  _edges: Edge[],
  _questionId: string
): Promise<AiFeedbackResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return {
    message: "Good job! The architecture covers the basic requirements. You've included the core components. To improve, consider adding caching layers or rate limiting if not already present.",
    score: 85
  }
}
