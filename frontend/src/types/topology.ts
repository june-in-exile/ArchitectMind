export type ComponentType =
  | 'client'
  | 'load_balancer'
  | 'api_gateway'
  | 'service'
  | 'database'
  | 'cache'
  | 'message_queue'
  | 'cdn'
  | 'dns'
  | 'storage'
  | 'reverse_proxy'
  | 'firewall'
  | 'monitor'
  | 'external_system'
  | 'worker'
  | 'search_engine'

export type ConnectionType = 'sync' | 'async' | 'replication' | 'cdn_origin' | 'unspecified'

export type EdgeDirection = 'uni' | 'bi' | 'none'

export type EdgeProtocol = 
  | ''
  | 'http' 
  | 'https' 
  | 'grpc' 
  | 'websocket' 
  | 'ssh' 
  | 'tcp' 
  | 'udp' 
  | 'amqp' 
  | 'mqtt' 
  | 'database' 
  | 'resp'
  | 'binary'
  | 'uds'
  | 'dns'

export interface DatabaseProperties {
  dbType: 'sql' | 'nosql' | 'graph' | 'timeseries'
  product?: string
  acidRequired: boolean
  readWriteRatio: number
  scalingStrategy: 'vertical' | 'horizontal' | 'none'
  replicas?: number
  consistencyLevel?: 'strong' | 'eventual'
}

export interface LoadBalancerProperties {
  algorithm: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted'
  healthCheck: boolean
  layer: 'l4' | 'l7'
  replicas?: number
}

export interface CacheProperties {
  cacheType: 'in_memory' | 'distributed'
  product?: string
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'tiny_lfu'
  ttlSeconds?: number
  replicas?: number
}

export type MQCategory = 'broker' | 'log_streaming' | 'in_memory' | 'managed'

export interface MessageQueueProperties {
  category: MQCategory
  product?: string
  queueType: 'point_to_point' | 'pub_sub'
  deliveryGuarantee: 'at_most_once' | 'at_least_once' | 'exactly_once'
  ordered: boolean
  hasDLQ: boolean
}

export interface StorageProperties {
  accessLevel: 'public' | 'private'
  storageClass: 'standard' | 'infrequent_access' | 'glacier'
  versioning: boolean
}

export interface ServiceProperties {
  replicas: number
  stateless: boolean
  language?: 'go' | 'java' | 'python' | 'node' | 'rust' | 'dotnet' | 'custom'
  framework?: string
  computeType?: 'container' | 'serverless' | 'vm' | 'bare_metal'
  autoScaling?: boolean
  healthCheck?: boolean
}

export interface ReverseProxyProperties {
  product?: string
  sslTermination: boolean
  caching: boolean
  compression: boolean
  rateLimiting: boolean
  replicas?: number
}

export interface FirewallProperties {
  product?: 'cloudflare' | 'aws_waf' | 'azure_waf' | 'modsecurity' | 'custom'
  mode: 'inline' | 'monitor'
  layer: 'l3' | 'l7'
  replicas?: number
}

export interface WorkerProperties {
  workerType: 'cron' | 'event_driven' | 'stream' | 'polling' | 'edge' | 'internal' | 'janitor'
  schedule?: string
  concurrency?: number
}

export interface SearchEngineProperties {
  product?: string
  clusterSize?: number
  indexType?: 'document' | 'vector' | 'keyword'
}

export interface ExternalSystemProperties {
  systemType: 'api' | 'webhook' | 'oauth' | 'payment' | 'email' | 'custom'
  provider?: string
}


export interface MonitorProperties {
  product?: 'elk' | 'prometheus' | 'grafana' | 'datadog' | 'splunk' | 'cloudwatch' | 'jaeger' | 'custom'
  logType: 'metrics' | 'logs' | 'traces' | 'all'
  alerting: boolean
  replicas?: number
}

export interface ClientProperties {
  clientType: 'web' | 'mobile' | 'desktop' | 'iot' | 'api_consumer'
  platform?: 'browser' | 'ios' | 'android' | 'cross_platform' | 'custom'
  authMethod?: 'none' | 'jwt' | 'oauth2' | 'api_key' | 'session'
}

export interface DNSProperties {
  provider?: 'route53' | 'cloudflare' | 'google_dns' | 'azure_dns' | 'custom'
  routingPolicy: 'simple' | 'weighted' | 'latency' | 'geo' | 'failover'
  healthCheck: boolean
}

export interface CDNProperties {
  provider?: 'cloudflare' | 'aws_cloudfront' | 'akamai' | 'fastly' | 'gcp_cdn' | 'azure_cdn' | 'custom'
  contentType: 'static' | 'media' | 'api' | 'full_site'
  cacheTTL: 'short' | 'medium' | 'long' | 'custom'
}

export interface APIGatewayProperties {
  product?: 'kong' | 'aws_apigw' | 'apigee' | 'nginx' | 'envoy' | 'traefik' | 'custom'
  authentication?: 'none' | 'api_key' | 'jwt' | 'oauth2'
  rateLimiting: boolean
}

export type ComponentProperties =
  | DatabaseProperties
  | LoadBalancerProperties
  | CacheProperties
  | MessageQueueProperties
  | StorageProperties
  | ServiceProperties
  | ReverseProxyProperties
  | FirewallProperties
  | MonitorProperties
  | WorkerProperties
  | ExternalSystemProperties
  | SearchEngineProperties
  | ClientProperties
  | DNSProperties
  | CDNProperties
  | APIGatewayProperties
  | Record<string, unknown>

export interface SystemNode {
  id: string
  componentType: ComponentType
  label: string
  position: { x: number; y: number }
  properties: ComponentProperties
  roles?: ComponentType[]
}

export interface SystemEdge {
  id: string
  source: string
  target: string
  connectionType: ConnectionType
  protocol: EdgeProtocol
  label?: string
}

export interface SystemParams {
  dau?: number
  peakQPS?: number
  avgQPS?: number
  storageGB?: number
  dailyGrowthGB?: number
  readWriteRatio?: number
  latencyTarget?: string
  availability?: string
}

export interface SystemTopology {
  id: string
  name: string
  version: number
  nodes: SystemNode[]
  edges: SystemEdge[]
  params?: SystemParams
}

export interface Warning {
  rule: string
  message: string
  solution: string
  nodeIds: string[]
}

export interface AnalyzeResponse {
  success: boolean
  nodeCount: number
  edgeCount: number
  totalRules: number
  rulesPassed: number
  warnings?: Warning[]
}
