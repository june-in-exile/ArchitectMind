export interface AnalysisWarningFixture {
  readonly rule: string
  readonly message: string
  readonly solution: string
  readonly nodeIds: readonly string[]
}

export interface AnalysisFixture {
  readonly success: boolean
  readonly nodeCount: number
  readonly edgeCount: number
  readonly totalRules: number
  readonly rulesPassed: number
  readonly warnings: readonly AnalysisWarningFixture[]
}

export const cleanAnalysis: AnalysisFixture = {
  success: true,
  nodeCount: 14,
  edgeCount: 13,
  totalRules: 45,
  rulesPassed: 45,
  warnings: [],
}

export const warningAnalysis: AnalysisFixture = {
  success: true,
  nodeCount: 14,
  edgeCount: 13,
  totalRules: 45,
  rulesPassed: 44,
  warnings: [
    {
      rule: 'no_healthcheck_behind_lb',
      message: 'Services behind the load balancer have no health check.',
      solution: 'Enable health checks on every service behind the load balancer.',
      nodeIds: ['demo-service'],
    },
  ],
}
