import type { Node } from '@xyflow/react'
import type { ComponentType } from '../types/topology'

interface PropertyPanelProps {
  selectedNode: Node | null
  selectedEdgeId: string | null
  onNodeDataChange: (nodeId: string, newData: Record<string, unknown>) => void
}

const SQL_PRODUCTS = [
  { value: 'postgresql', label: 'PostgreSQL', description: 'Open-source relational database with strong ACID compliance' },
  { value: 'mysql', label: 'MySQL', description: 'Popular open-source relational database, widely used in web applications' },
  { value: 'mariadb', label: 'MariaDB', description: 'MySQL fork with enhanced performance and features' },
  { value: 'sql_server', label: 'SQL Server', description: 'Microsoft relational database with enterprise features' },
  { value: 'oracle', label: 'Oracle', description: 'Enterprise-grade relational database with advanced features' },
]

const NOSQL_GROUPS = [
  {
    label: 'Document',
    products: [
      { value: 'mongodb', label: 'MongoDB', description: 'Flexible document-oriented database with JSON-like storage' },
      { value: 'couchdb', label: 'CouchDB (AP)', description: 'Eventual consistency document database' },
    ],
  },
  {
    label: 'Key-Value / Wide Column',
    products: [
      { value: 'redis', label: 'Redis', description: 'In-memory data structure store, used as cache and message broker' },
      { value: 'dynamodb', label: 'DynamoDB (AP)', description: 'AWS fully managed NoSQL database with high scalability' },
      { value: 'cassandra', label: 'Cassandra (AP)', description: 'Distributed wide-column store optimized for writes' },
      { value: 'riak', label: 'Riak (AP)', description: 'Distributed key-value store focusing on availability' },
    ],
  },
  {
    label: 'Graph',
    products: [
      { value: 'neo4j', label: 'Neo4j', description: 'Native graph database optimized for relationship queries' },
      { value: 'arangodb', label: 'ArangoDB', description: 'Multi-model database supporting graphs, documents, and key-value' },
    ],
  },
  {
    label: 'Time Series',
    products: [
      { value: 'influxdb', label: 'InfluxDB', description: 'Time-series database optimized for monitoring and IoT data' },
      { value: 'prometheus', label: 'Prometheus', description: 'Monitoring system with built-in time-series database' },
    ],
  },
]

const CACHE_PRODUCTS = [
  { value: 'redis', label: 'Redis', description: 'In-memory data structure store with optional persistence' },
  { value: 'memcached', label: 'Memcached', description: 'Simple distributed memory object caching system' },
  { value: 'etcd', label: 'etcd', description: 'Distributed key-value store for shared configuration' },
  { value: 'hazelcast', label: 'Hazelcast', description: 'Distributed in-memory computing platform' },
  { value: 'tarantool', label: 'Tarantool', description: 'In-memory database with Lua application server' },
]

const EVICTION_POLICIES = [
  { value: '', label: '(Unspecified)', description: 'No specific eviction policy configured' },
  { value: 'lru', label: 'LRU (Least Recently Used)', description: 'Evicts least recently accessed items first' },
  { value: 'lfu', label: 'LFU (Least Frequently Used)', description: 'Evicts least frequently accessed items first' },
  { value: 'fifo', label: 'FIFO (First In First Out)', description: 'Evicts oldest items first, regardless of access pattern' },
  { value: 'tiny_lfu', label: 'TinyLFU', description: 'Frequency-based eviction with approximate LFU using tiny sketch' },
]

const CACHE_TYPES = [
  { value: 'in_memory', label: 'In-Memory', description: 'Data stored in RAM only, fastest but limited by memory' },
  { value: 'distributed', label: 'Distributed', description: 'Data partitioned across multiple nodes, scales horizontally' },
]

const DB_CATEGORIES = [
  { value: 'sql', label: 'SQL (Relational)', description: 'Structured tables with fixed schema, supports JOINs and ACID' },
  { value: 'nosql', label: 'NoSQL (Non-Relational)', description: 'Flexible schema, optimized for scale and specific use cases' },
]

const CONSISTENCY_LEVELS = [
  { value: 'eventual', label: 'Eventual Consistency', description: 'Data will be consistent eventually, prioritizes availability (AP)' },
  { value: 'strong', label: 'Strong Consistency', description: 'Guarantees immediate consistency, may impact availability during partitions (CP)' },
]

const STORAGE_ACCESS_LEVELS = [
  { value: 'public', label: 'Public', description: 'Publicly accessible, suitable for static websites and CDN origins' },
  { value: 'private', label: 'Private', description: 'Private access only, suitable for internal data and backups' },
]

const STORAGE_CLASSES = [
  { value: 'standard', label: 'Standard', description: 'Frequently accessed data with low latency requirements' },
  { value: 'infrequent_access', label: 'Infrequent Access', description: 'Long-lived, less frequently accessed data at lower cost' },
  { value: 'glacier', label: 'Glacier (Archive)', description: 'Cold storage for archival data with retrieval delays' },
]

const MQ_CATEGORIES = [
  { value: 'broker', label: 'Broker-based', description: 'Central broker handles message routing, storage, and delivery' },
  { value: 'log_streaming', label: 'Log Streaming', description: 'Append-only distributed log with consumer-managed offsets' },
  { value: 'in_memory', label: 'In-Memory', description: 'Lightweight, ultra-fast messaging using memory-based stores' },
  { value: 'managed', label: 'Cloud Managed', description: 'Fully managed cloud services with auto-scaling' },
]

const MQ_PRODUCT_GROUPS: Record<string, Array<{ value: string; label: string; description: string }>> = {
  broker: [
    { value: 'rabbitmq', label: 'RabbitMQ', description: 'Feature-rich AMQP broker with complex routing (Exchange/Binding)' },
    { value: 'activemq', label: 'ActiveMQ', description: 'Java-based broker supporting JMS, STOMP, and multiple protocols' },
  ],
  log_streaming: [
    { value: 'kafka', label: 'Apache Kafka', description: 'High-throughput distributed log with replay and stream processing' },
    { value: 'pulsar', label: 'Apache Pulsar', description: 'Cloud-native streaming with separated storage and compute' },
  ],
  in_memory: [
    { value: 'redis_mq', label: 'Redis (Pub/Sub / Streams)', description: 'Ultra-fast in-memory messaging, simple deployment' },
  ],
  managed: [
    { value: 'aws_sqs', label: 'AWS SQS', description: 'Fully managed queue service deeply integrated with AWS ecosystem' },
    { value: 'aws_sns', label: 'AWS SNS', description: 'Managed pub/sub notification service for fan-out messaging' },
    { value: 'google_pubsub', label: 'Google Pub/Sub', description: 'Fully managed real-time messaging with auto-scaling' },
    { value: 'azure_service_bus', label: 'Azure Service Bus', description: 'Enterprise messaging for .NET ecosystem with advanced features' },
  ],
}

const MQ_QUEUE_TYPES = [
  { value: 'point_to_point', label: 'Point-to-Point', description: 'Each message consumed by exactly one consumer' },
  { value: 'pub_sub', label: 'Pub/Sub', description: 'Messages broadcast to all subscribed consumers' },
]

const MQ_DELIVERY_GUARANTEES = [
  { value: 'at_most_once', label: 'At Most Once', description: 'Fire-and-forget, fastest but may lose messages' },
  { value: 'at_least_once', label: 'At Least Once', description: 'Guaranteed delivery, consumers must handle duplicates' },
  { value: 'exactly_once', label: 'Exactly Once', description: 'Strongest guarantee, higher latency and complexity' },
]

const REVERSE_PROXY_PRODUCTS = [
  { value: 'nginx', label: 'Nginx', description: 'High-performance HTTP server and reverse proxy' },
  { value: 'haproxy', label: 'HAProxy', description: 'Reliable, high-performance TCP/HTTP load balancer and proxy' },
  { value: 'envoy', label: 'Envoy', description: 'Cloud-native edge and service proxy with advanced observability' },
  { value: 'traefik', label: 'Traefik', description: 'Cloud-native application proxy with automatic service discovery' },
  { value: 'caddy', label: 'Caddy', description: 'Automatic HTTPS web server with zero-config TLS' },
]

const ALGORITHMS = [
  { value: 'round_robin', label: 'Round Robin', description: 'Distributes requests evenly across all servers in sequence' },
  { value: 'least_connections', label: 'Least Connections', description: 'Routes to server with fewest active connections' },
  { value: 'ip_hash', label: 'IP Hash', description: 'Uses client IP to consistently route to same server' },
  { value: 'weighted', label: 'Weighted', description: 'Distributes based on server capacity weights' },
]

const LB_LAYERS = [
  { 
    value: 'l4', 
    label: 'L4 (Transport)', 
    description: 'Routes traffic based on IP address and TCP/UDP port. Cannot inspect HTTP content. Lower latency. (e.g., AWS NLB, HAProxy TCP mode)' 
  },
  { 
    value: 'l7', 
    label: 'L7 (Application)', 
    description: 'Routes traffic based on HTTP headers, URL path, cookies, and content. Supports path-based routing, SSL termination, and sticky sessions. (e.g., AWS ALB, Nginx, Envoy)' 
  },
]

const FIREWALL_PRODUCTS = [
  { value: '', label: '(Unspecified)', description: 'No specific WAF product selected' },
  { value: 'cloudflare', label: 'Cloudflare WAF', description: 'Cloud WAF + CDN integration, ideal for SaaS and public APIs' },
  { value: 'aws_waf', label: 'AWS WAF', description: 'AWS native, deep integration with ALB/CloudFront/API Gateway' },
  { value: 'azure_waf', label: 'Azure WAF', description: 'Azure native, integrates with Azure Front Door/Application Gateway' },
  { value: 'modsecurity', label: 'ModSecurity', description: 'Open-source WAF engine, embeddable in Nginx/Apache for self-hosted infra' },
  { value: 'custom', label: 'Custom', description: 'Custom-built or other WAF product not listed' },
]

const FIREWALL_MODES = [
  { value: 'inline', label: 'Inline (Block)', description: 'Blocks malicious traffic on detection, prevents it from reaching backends' },
  { value: 'monitor', label: 'Monitor (Log Only)', description: 'Logs malicious traffic without blocking, useful for pre-deployment testing' },
]

const FIREWALL_LAYERS = [
  { value: 'l3', label: 'L3/L4 (Network)', description: 'Network-layer firewall: filters by IP, port, protocol. Cannot inspect HTTP content.' },
  { value: 'l7', label: 'L7 (Application)', description: 'Application-layer WAF: inspects HTTP content, detects SQLi, XSS, CSRF attacks.' },
]

const MONITOR_PRODUCTS = [
  { value: '', label: '(Unspecified)', description: 'No specific observability product selected' },
  { value: 'elk', label: 'ELK Stack', description: 'Elasticsearch + Logstash + Kibana, open-source log analysis platform' },
  { value: 'prometheus', label: 'Prometheus', description: 'Open-source metrics monitoring with pull-based collection and alerting' },
  { value: 'grafana', label: 'Grafana', description: 'Visualization dashboards, typically paired with Prometheus or other data sources' },
  { value: 'datadog', label: 'Datadog', description: 'Fully managed SaaS observability: metrics + logs + traces in one platform' },
  { value: 'splunk', label: 'Splunk', description: 'Enterprise log analysis with powerful search and security analytics (SIEM)' },
  { value: 'cloudwatch', label: 'CloudWatch', description: 'AWS native monitoring, deep integration with AWS services' },
  { value: 'jaeger', label: 'Jaeger', description: 'Open-source distributed tracing system, focused on traces' },
  { value: 'custom', label: 'Custom', description: 'Custom-built or other monitoring product not listed' },
]

const MONITOR_LOG_TYPES = [
  { value: 'metrics', label: 'Metrics', description: 'Numeric indicators (CPU usage, p99 latency, error rate, QPS) for dashboards and alerting' },
  { value: 'logs', label: 'Logs', description: 'Structured/unstructured text records (error log, access log, audit log) for post-mortem debugging' },
  { value: 'traces', label: 'Traces', description: 'Distributed tracing (request path across services with timing) for microservice debugging' },
  { value: 'all', label: 'All (Full Observability)', description: 'Collects metrics + logs + traces for complete observability' },
]

const WORKER_TYPES = [
  { value: 'cron', label: 'Cron (Scheduled)', description: 'Runs automatically at scheduled times (e.g. daily backup, nightly settlement).' },
  { value: 'event_driven', label: 'Event Driven / Queue-based', description: 'Triggered by events or queue messages (e.g. async email, video transcoding).' },
  { value: 'stream', label: 'Stream / Batch', description: 'Processes massive data streams or large batches (e.g. clickstream analysis, reconciliation).' },
  { value: 'polling', label: 'Polling / Long-running', description: 'Runs continuously in the background, polling for updates (e.g. web crawlers).' },
  { value: 'edge', label: 'Edge / Serverless', description: 'Runs lightweight tasks close to users (e.g. Cloudflare Workers).' },
  { value: 'internal', label: 'Concurrency / Internal', description: 'Spawns internal threads/processes to share heavy loads (e.g. Node Worker Threads).' },
  { value: 'janitor', label: 'Janitor / Maintenance', description: 'Background cleanup tasks (e.g. cache eviction, DB vacuum).' },
]

const SEARCH_ENGINE_INDEX_TYPES = [
  { value: 'document', label: 'Document (Full-text)', description: 'Inverted index for full-text search (e.g. Elasticsearch).' },
  { value: 'vector', label: 'Vector (Similarity)', description: 'Embedding vectors for AI/semantic search (e.g. Milvus, Pinecone).' },
  { value: 'keyword', label: 'Keyword (Exact Match)', description: 'Exact keyword matching, filtering, tagging.' },
]

const EXTERNAL_SYSTEM_TYPES = [
  { value: 'api', label: 'REST/GraphQL API', description: 'Synchronous API calls to third-party providers.' },
  { value: 'webhook', label: 'Webhook Receiver', description: 'Listens for async callbacks from third-party services.' },
  { value: 'oauth', label: 'OAuth/Identity', description: 'Authentication provider (e.g. Auth0, Cognito, Google Sign-in).' },
  { value: 'payment', label: 'Payment Gateway', description: 'Payment processing (e.g. Stripe, PayPal).' },
  { value: 'email', label: 'Email/SMS Provider', description: 'Transactional messaging service (e.g. SendGrid, Twilio).' },
  { value: 'custom', label: 'Custom', description: 'Other external dependencies.' },
]

const SERVICE_LANGUAGES = [
  { value: '', label: '(Unspecified)', description: 'No specific language selected' },
  { value: 'go', label: 'Go', description: 'High concurrency, low latency, suitable for infrastructure and microservices' },
  { value: 'java', label: 'Java', description: 'Enterprise-grade ecosystem, Spring Boot is the mainstream framework' },
  { value: 'python', label: 'Python', description: 'Rapid development, suitable for ML/AI services and script-intensive tasks' },
  { value: 'node', label: 'Node.js', description: 'Event-driven non-blocking I/O, suitable for I/O-intensive and BFF layer' },
  { value: 'rust', label: 'Rust', description: 'Extreme performance + memory safety, suitable for performance-critical paths' },
  { value: 'dotnet', label: '.NET', description: 'Microsoft ecosystem, suitable for enterprise applications and Azure integration' },
  { value: 'custom', label: 'Custom', description: 'Other language not listed' },
]

const COMPUTE_TYPES = [
  { value: '', label: '(Unspecified)', description: 'No specific compute type selected' },
  { value: 'container', label: 'Container (K8s/Docker)', description: 'Containerized deployment, orchestrated by Kubernetes or Docker Swarm. Most popular microservices deployment method.' },
  { value: 'serverless', label: 'Serverless (Lambda)', description: 'Serverless, pay-per-invocation. Suitable for low traffic or burst loads. Cold start is the main drawback.' },
  { value: 'vm', label: 'Virtual Machine', description: 'Traditional VM deployment (EC2, GCE). Heavier but better isolation.' },
  { value: 'bare_metal', label: 'Bare Metal', description: 'Runs directly on physical hardware. Maximum performance but less flexible.' },
]

const FRAMEWORK_HINTS: Record<string, string[]> = {
  go: ['gin', 'fiber', 'echo', 'chi'],
  java: ['spring-boot', 'quarkus', 'micronaut'],
  python: ['fastapi', 'django', 'flask'],
  node: ['express', 'nestjs', 'fastify', 'hono'],
  rust: ['actix-web', 'axum', 'rocket'],
  dotnet: ['asp.net', 'minimal-api'],
}

const CLIENT_TYPES = [
  { value: 'web', label: 'Web Browser', description: 'Browser-based application (React, Vue, Angular SPA)' },
  { value: 'mobile', label: 'Mobile App', description: 'iOS/Android native or cross-platform app (React Native, Flutter)' },
  { value: 'desktop', label: 'Desktop App', description: 'Desktop application (Electron, native)' },
  { value: 'iot', label: 'IoT Device', description: 'Resource-constrained device, typically using MQTT or lightweight HTTP' },
  { value: 'api_consumer', label: 'API Consumer', description: 'Third-party system calling API (B2B integration, webhook)' },
]

const CLIENT_PLATFORMS = [
  { value: '', label: '(Unspecified)', description: 'No specific platform selected' },
  { value: 'browser', label: 'Browser', description: 'Chrome, Safari, Firefox browser environment' },
  { value: 'ios', label: 'iOS', description: 'Apple iOS platform' },
  { value: 'android', label: 'Android', description: 'Google Android platform' },
  { value: 'cross_platform', label: 'Cross-Platform', description: 'Cross-platform frameworks (React Native, Flutter, Electron)' },
  { value: 'custom', label: 'Custom', description: 'Other platform not listed' },
]

const CLIENT_AUTH_METHODS = [
  { value: '', label: '(Unspecified)', description: 'No authentication configured' },
  { value: 'none', label: 'None', description: 'No authentication (public API)' },
  { value: 'jwt', label: 'JWT Token', description: 'JSON Web Token, stateless validation suitable for microservices' },
  { value: 'oauth2', label: 'OAuth 2.0', description: 'Third-party authorization (Google, GitHub login)' },
  { value: 'api_key', label: 'API Key', description: 'Simple key-based authentication, suitable for server-to-server' },
  { value: 'session', label: 'Session Cookie', description: 'Traditional session-based authentication, requires server-side state' },
]

const DNS_PROVIDERS = [
  { value: '', label: '(Unspecified)', description: 'No specific DNS provider selected' },
  { value: 'route53', label: 'AWS Route 53', description: 'AWS managed DNS with deep AWS integration, health checks and traffic routing' },
  { value: 'cloudflare', label: 'Cloudflare DNS', description: 'One of the fastest global DNS with built-in DDoS protection and CDN integration' },
  { value: 'google_dns', label: 'Google Cloud DNS', description: 'GCP managed DNS with 100% SLA and global anycast network' },
  { value: 'azure_dns', label: 'Azure DNS', description: 'Azure managed DNS with Azure services integration' },
  { value: 'custom', label: 'Custom / Self-hosted', description: 'Self-hosted DNS (BIND, CoreDNS) or other provider' },
]

const DNS_ROUTING_POLICIES = [
  { value: 'simple', label: 'Simple', description: 'Single record, returns fixed IP directly (most basic)' },
  { value: 'weighted', label: 'Weighted', description: 'Weighted routing, distributes traffic proportionally across endpoints (blue-green, canary)' },
  { value: 'latency', label: 'Latency-based', description: 'Selects the nearest endpoint based on user latency' },
  { value: 'geo', label: 'Geolocation', description: 'Routes based on user geographic location (compliance, localization)' },
  { value: 'failover', label: 'Failover', description: 'Primary/secondary switch, automatically fails over to backup when primary is unhealthy' },
]

const CDN_PROVIDERS = [
  { value: '', label: '(Unspecified)', description: 'No specific CDN provider selected' },
  { value: 'cloudflare', label: 'Cloudflare', description: 'One of the largest global CDNs with built-in WAF, DDoS protection, and Workers edge computing' },
  { value: 'aws_cloudfront', label: 'AWS CloudFront', description: 'AWS native CDN with deep integration to S3, ALB, Lambda@Edge' },
  { value: 'akamai', label: 'Akamai', description: 'Enterprise-grade CDN with one of the largest edge networks globally' },
  { value: 'fastly', label: 'Fastly', description: 'Developer-friendly CDN with instant cache purge, Varnish-based' },
  { value: 'gcp_cdn', label: 'Google Cloud CDN', description: 'GCP native CDN integrated with Cloud Storage and Load Balancer' },
  { value: 'azure_cdn', label: 'Azure CDN', description: 'Azure native CDN' },
  { value: 'custom', label: 'Custom', description: 'Self-hosted CDN or other provider' },
]

const CDN_CONTENT_TYPES = [
  { value: 'static', label: 'Static Assets', description: 'Caches static resources (JS, CSS, images, fonts)' },
  { value: 'media', label: 'Media / Streaming', description: 'Video and audio streaming (HLS, DASH segments)' },
  { value: 'api', label: 'API Responses', description: 'Caches API responses (requires careful cache key and TTL configuration)' },
  { value: 'full_site', label: 'Full Site', description: 'Full site acceleration (static + dynamic content)' },
]

const CDN_CACHE_TTLS = [
  { value: 'short', label: 'Short (1-5 min)', description: 'Suitable for frequently updated content (API, dynamic pages)' },
  { value: 'medium', label: 'Medium (1-24 hr)', description: 'Suitable for typical static resources (images, CSS)' },
  { value: 'long', label: 'Long (7-30 days)', description: 'Suitable for infrequently changed resources (fonts, vendor JS)' },
  { value: 'custom', label: 'Custom', description: 'Custom TTL' },
]

const API_GATEWAY_PRODUCTS = [
  { value: '', label: '(Unspecified)', description: 'No specific API Gateway product selected' },
  { value: 'kong', label: 'Kong', description: 'Open-source API Gateway with rich plugin ecosystem, supports rate limiting, auth, logging' },
  { value: 'aws_apigw', label: 'AWS API Gateway', description: 'AWS managed, supports REST, HTTP, WebSocket APIs, deep Lambda integration' },
  { value: 'apigee', label: 'Apigee (Google)', description: 'Enterprise-grade API management platform, strong in API lifecycle and analytics' },
  { value: 'nginx', label: 'Nginx', description: 'High-performance reverse proxy and API Gateway, common for self-hosted infrastructure' },
  { value: 'envoy', label: 'Envoy', description: 'Cloud-native L7 proxy, data plane for Service Mesh (Istio)' },
  { value: 'traefik', label: 'Traefik', description: 'Cloud-native proxy with automatic service discovery, great K8s integration' },
  { value: 'custom', label: 'Custom', description: 'Custom-built or other product not listed' },
]

const API_GATEWAY_AUTH_METHODS = [
  { value: '', label: '(Unspecified)', description: 'No authentication configured' },
  { value: 'none', label: 'None', description: 'No authentication, public API' },
  { value: 'api_key', label: 'API Key', description: 'Simple key-based authentication' },
  { value: 'jwt', label: 'JWT Validation', description: 'Validates JWT tokens at Gateway level, no need for each Service to validate' },
  { value: 'oauth2', label: 'OAuth 2.0', description: 'Handles OAuth flow at Gateway level' },
]

const getTooltip = (label: string, description?: string) => {
  const lowerLabel = label.toLowerCase()
  if (!description || lowerLabel.includes('unspecified') || lowerLabel.includes('default') || lowerLabel.includes('auto-detect')) {
    return undefined
  }
  return description
}

export default function PropertyPanel({
  selectedNode,
  selectedEdgeId,
  onNodeDataChange,
}: PropertyPanelProps) {
  if (!selectedNode) {
    if (selectedEdgeId) {
      return null
    }
    return (
      <aside
        style={{
          width: '100%',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: 14,
          fontStyle: 'italic',
          textAlign: 'center',
          flex: 1,
        }}
      >
        Select a component to view properties
      </aside>
    )
  }

  const data = selectedNode.data as Record<string, unknown>
  const properties = (data.properties as Record<string, unknown>) ?? {}
  const componentType = data.componentType as ComponentType
  const roles = Array.from(new Set((data.roles as ComponentType[]) || [componentType]))

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNodeDataChange(selectedNode.id, { ...data, label: e.target.value })
  }

  const handlePropertyChange = (key: string, value: unknown) => {
    onNodeDataChange(selectedNode.id, {
      ...data,
      properties: { ...properties, [key]: value },
    })
  }

  const handleMQCategoryChange = (newCategory: string) => {
    const products = MQ_PRODUCT_GROUPS[newCategory] ?? []
    const firstProduct = products.length > 0 ? products[0].value : ''

    onNodeDataChange(selectedNode.id, {
      ...data,
      properties: { ...properties, category: newCategory, product: firstProduct },
    })
  }

  const handleDBTypeChange = (newType: string) => {
    const firstProduct = newType === 'sql' 
      ? SQL_PRODUCTS[0].value 
      : NOSQL_GROUPS[0].products[0].value

    onNodeDataChange(selectedNode.id, {
      ...data,
      properties: { ...properties, dbType: newType, product: firstProduct },
    })
  }

  const renderClientSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The type of client consuming the system"
        >
          Client Type
        </label>
        <select
          value={(properties.clientType as string) || 'web'}
          onChange={(e) => handlePropertyChange('clientType', e.target.value)}
          title={getTooltip(
            CLIENT_TYPES.find(opt => opt.value === ((properties.clientType as string) || 'web'))?.label || '',
            CLIENT_TYPES.find(opt => opt.value === ((properties.clientType as string) || 'web'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CLIENT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      {['mobile', 'desktop'].includes(properties.clientType as string) && (
        <div style={{ marginBottom: 16 }}>
          <label
            style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
            title="The platform this client runs on"
          >
            Platform
          </label>
          <select
            value={(properties.platform as string) || ''}
            onChange={(e) => handlePropertyChange('platform', e.target.value)}
            title={getTooltip(
              CLIENT_PLATFORMS.find(opt => opt.value === ((properties.platform as string) || ''))?.label || '',
              CLIENT_PLATFORMS.find(opt => opt.value === ((properties.platform as string) || ''))?.description
            )}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            {CLIENT_PLATFORMS.map((opt) => (
              <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="How the client authenticates with backend services"
        >
          Authentication Method
        </label>
        <select
          value={(properties.authMethod as string) || ''}
          onChange={(e) => handlePropertyChange('authMethod', e.target.value)}
          title={getTooltip(
            CLIENT_AUTH_METHODS.find(opt => opt.value === ((properties.authMethod as string) || ''))?.label || '',
            CLIENT_AUTH_METHODS.find(opt => opt.value === ((properties.authMethod as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CLIENT_AUTH_METHODS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  )

  const renderDNSSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The DNS hosting provider or service"
        >
          Provider
        </label>
        <select
          value={(properties.provider as string) || ''}
          onChange={(e) => handlePropertyChange('provider', e.target.value || undefined)}
          title={getTooltip(
            DNS_PROVIDERS.find(opt => opt.value === ((properties.provider as string) || ''))?.label || '',
            DNS_PROVIDERS.find(opt => opt.value === ((properties.provider as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {DNS_PROVIDERS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="How DNS resolves requests to different endpoints"
        >
          Routing Policy
        </label>
        <select
          value={(properties.routingPolicy as string) || 'simple'}
          onChange={(e) => handlePropertyChange('routingPolicy', e.target.value)}
          title={getTooltip(
            DNS_ROUTING_POLICIES.find(opt => opt.value === ((properties.routingPolicy as string) || 'simple'))?.label || '',
            DNS_ROUTING_POLICIES.find(opt => opt.value === ((properties.routingPolicy as string) || 'simple'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {DNS_ROUTING_POLICIES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Enable DNS-level health checks to automatically remove unhealthy endpoints from rotation"
        >
          <input
            type="checkbox"
            checked={(properties.healthCheck as boolean) ?? false}
            onChange={(e) => handlePropertyChange('healthCheck', e.target.checked)}
          />
          Health Check
        </label>
      </div>
    </>
  )

  const renderCDNSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The CDN provider for content delivery"
        >
          Provider
        </label>
        <select
          value={(properties.provider as string) || ''}
          onChange={(e) => handlePropertyChange('provider', e.target.value || undefined)}
          title={getTooltip(
            CDN_PROVIDERS.find(opt => opt.value === ((properties.provider as string) || ''))?.label || '',
            CDN_PROVIDERS.find(opt => opt.value === ((properties.provider as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CDN_PROVIDERS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The type of content cached and served by the CDN"
        >
          Content Type
        </label>
        <select
          value={(properties.contentType as string) || 'static'}
          onChange={(e) => handlePropertyChange('contentType', e.target.value)}
          title={getTooltip(
            CDN_CONTENT_TYPES.find(opt => opt.value === ((properties.contentType as string) || 'static'))?.label || '',
            CDN_CONTENT_TYPES.find(opt => opt.value === ((properties.contentType as string) || 'static'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CDN_CONTENT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="How long content is cached at edge nodes before revalidation"
        >
          Cache TTL
        </label>
        <select
          value={(properties.cacheTTL as string) || 'medium'}
          onChange={(e) => handlePropertyChange('cacheTTL', e.target.value)}
          title={getTooltip(
            CDN_CACHE_TTLS.find(opt => opt.value === ((properties.cacheTTL as string) || 'medium'))?.label || '',
            CDN_CACHE_TTLS.find(opt => opt.value === ((properties.cacheTTL as string) || 'medium'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CDN_CACHE_TTLS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  )

  const renderAPIGatewaySection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The API Gateway product or managed service"
        >
          Product
        </label>
        <select
          value={(properties.product as string) || ''}
          onChange={(e) => handlePropertyChange('product', e.target.value || undefined)}
          title={getTooltip(
            API_GATEWAY_PRODUCTS.find(opt => opt.value === ((properties.product as string) || ''))?.label || '',
            API_GATEWAY_PRODUCTS.find(opt => opt.value === ((properties.product as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {API_GATEWAY_PRODUCTS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Authentication method enforced at the gateway level"
        >
          Authentication
        </label>
        <select
          value={(properties.authentication as string) || ''}
          onChange={(e) => handlePropertyChange('authentication', e.target.value || undefined)}
          title={getTooltip(
            API_GATEWAY_AUTH_METHODS.find(opt => opt.value === ((properties.authentication as string) || ''))?.label || '',
            API_GATEWAY_AUTH_METHODS.find(opt => opt.value === ((properties.authentication as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {API_GATEWAY_AUTH_METHODS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Limit request rate per client/API key to protect backend services from overload"
        >
          <input
            type="checkbox"
            checked={(properties.rateLimiting as boolean) ?? false}
            onChange={(e) => handlePropertyChange('rateLimiting', e.target.checked)}
          />
          Rate Limiting
        </label>
      </div>
    </>
  )

  const renderDatabaseSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Choose between relational (SQL) or non-relational (NoSQL) database types."
        >
          Database Category
        </label>
        <select
          value={(properties.dbType as string) || 'sql'}
          onChange={(e) => handleDBTypeChange(e.target.value)}
          title={getTooltip(
            DB_CATEGORIES.find(opt => opt.value === ((properties.dbType as string) || 'sql'))?.label || '',
            DB_CATEGORIES.find(opt => opt.value === ((properties.dbType as string) || 'sql'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {DB_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The specific database product or engine to use."
        >
          Product
        </label>
        <select
          value={(properties.product as string) || ''}
          onChange={(e) => handlePropertyChange('product', e.target.value)}
          title={properties.dbType === 'sql' 
            ? getTooltip(
                SQL_PRODUCTS.find(p => p.value === (properties.product as string))?.label || '',
                SQL_PRODUCTS.find(p => p.value === (properties.product as string))?.description
              )
            : getTooltip(
                NOSQL_GROUPS.flatMap(g => g.products).find(p => p.value === (properties.product as string))?.label || '',
                NOSQL_GROUPS.flatMap(g => g.products).find(p => p.value === (properties.product as string))?.description
              )
          }
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {properties.dbType === 'sql' ? (
            SQL_PRODUCTS.map((p) => (
              <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
            ))
          ) : (
            NOSQL_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.products.map((p) => (
                  <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
                ))}
              </optgroup>
            ))
          )}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Desired data consistency model (CAP theorem trade-offs)."
        >
          Consistency Requirement
        </label>
        <select
          value={(properties.consistencyLevel as string) || ''}
          onChange={(e) => handlePropertyChange('consistencyLevel', e.target.value)}
          title={getTooltip(
            CONSISTENCY_LEVELS.find(opt => opt.value === (properties.consistencyLevel as string))?.label || 'Default',
            CONSISTENCY_LEVELS.find(opt => opt.value === (properties.consistencyLevel as string))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <option value="">(unspecified)</option>
          {CONSISTENCY_LEVELS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The estimated balance between read and write operations. High read ratios favor caching and replicas."
        >
          Read/Write Ratio ({(properties.readWriteRatio as number) || 0})
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={(properties.readWriteRatio as number) || 0}
          onChange={(e) => handlePropertyChange('readWriteRatio', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </>
  )

  const renderLoadBalancerSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The policy used to distribute incoming traffic across healthy backend instances."
        >
          Algorithm
        </label>
        <select
          value={(properties.algorithm as string) || 'round_robin'}
          onChange={(e) => handlePropertyChange('algorithm', e.target.value)}
          title={getTooltip(
            ALGORITHMS.find(opt => opt.value === ((properties.algorithm as string) || 'round_robin'))?.label || '',
            ALGORITHMS.find(opt => opt.value === ((properties.algorithm as string) || 'round_robin'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {ALGORITHMS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="L4 routes by IP/port with lower latency; L7 routes by HTTP content with richer features"
        >
          Layer
        </label>
        <select
          value={(properties.layer as string) || 'l7'}
          onChange={(e) => handlePropertyChange('layer', e.target.value)}
          title={getTooltip(
            LB_LAYERS.find(opt => opt.value === ((properties.layer as string) || 'l7'))?.label || '',
            LB_LAYERS.find(opt => opt.value === ((properties.layer as string) || 'l7'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {LB_LAYERS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Enable health checks to detect unhealthy backend instances and stop routing traffic to them."
        >
          <input
            type="checkbox"
            checked={(properties.healthCheck as boolean) ?? true}
            onChange={(e) => handlePropertyChange('healthCheck', e.target.checked)}
          />
          Health Check
        </label>
      </div>
    </>
  )

  const renderReverseProxySection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The reverse proxy software or engine."
        >
          Product
        </label>
        <select
          value={(properties.product as string) || 'nginx'}
          onChange={(e) => handlePropertyChange('product', e.target.value)}
          title={getTooltip(
            REVERSE_PROXY_PRODUCTS.find(p => p.value === ((properties.product as string) || 'nginx'))?.label || '',
            REVERSE_PROXY_PRODUCTS.find(p => p.value === ((properties.product as string) || 'nginx'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {REVERSE_PROXY_PRODUCTS.map((p) => (
            <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Terminate TLS/SSL at the proxy, forwarding plain HTTP to backends."
        >
          <input
            type="checkbox"
            checked={(properties.sslTermination as boolean) ?? true}
            onChange={(e) => handlePropertyChange('sslTermination', e.target.checked)}
          />
          SSL Termination
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Cache responses at the proxy layer to reduce backend load."
        >
          <input
            type="checkbox"
            checked={(properties.caching as boolean) || false}
            onChange={(e) => handlePropertyChange('caching', e.target.checked)}
          />
          Response Caching
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Compress responses (gzip/brotli) before sending to clients."
        >
          <input
            type="checkbox"
            checked={(properties.compression as boolean) || false}
            onChange={(e) => handlePropertyChange('compression', e.target.checked)}
          />
          Compression
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Limit request rate per client to protect backends from overload."
        >
          <input
            type="checkbox"
            checked={(properties.rateLimiting as boolean) || false}
            onChange={(e) => handlePropertyChange('rateLimiting', e.target.checked)}
          />
          Rate Limiting
        </label>
      </div>
    </>
  )

  const renderStorageSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Visibility and permission level for the stored objects."
        >
          Access Level
        </label>
        <select
          value={(properties.accessLevel as string) || 'private'}
          onChange={(e) => handlePropertyChange('accessLevel', e.target.value)}
          title={getTooltip(
            STORAGE_ACCESS_LEVELS.find(opt => opt.value === ((properties.accessLevel as string) || 'private'))?.label || '',
            STORAGE_ACCESS_LEVELS.find(opt => opt.value === ((properties.accessLevel as string) || 'private'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {STORAGE_ACCESS_LEVELS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Data storage tier, balancing access frequency, latency, and cost."
        >
          Storage Class
        </label>
        <select
          value={(properties.storageClass as string) || 'standard'}
          onChange={(e) => handlePropertyChange('storageClass', e.target.value)}
          title={getTooltip(
            STORAGE_CLASSES.find(opt => opt.value === ((properties.storageClass as string) || 'standard'))?.label || '',
            STORAGE_CLASSES.find(opt => opt.value === ((properties.storageClass as string) || 'standard'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {STORAGE_CLASSES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Preserve multiple versions of an object to protect against accidental deletions or overwrites."
        >
          <input
            type="checkbox"
            checked={(properties.versioning as boolean) || false}
            onChange={(e) => handlePropertyChange('versioning', e.target.checked)}
          />
          Enable Versioning
        </label>
      </div>
    </>
  )

  const renderMessageQueueSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The architectural pattern of the messaging system."
        >
          Category
        </label>
        <select
          value={(properties.category as string) || 'broker'}
          onChange={(e) => handleMQCategoryChange(e.target.value)}
          title={getTooltip(
            MQ_CATEGORIES.find(opt => opt.value === ((properties.category as string) || 'broker'))?.label || '',
            MQ_CATEGORIES.find(opt => opt.value === ((properties.category as string) || 'broker'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {MQ_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The specific messaging product or managed service."
        >
          Product
        </label>
        <select
          value={(properties.product as string) || ''}
          onChange={(e) => handlePropertyChange('product', e.target.value)}
          title={getTooltip(
            (MQ_PRODUCT_GROUPS[(properties.category as string) || 'broker'] ?? []).find(p => p.value === (properties.product as string))?.label || '',
            (MQ_PRODUCT_GROUPS[(properties.category as string) || 'broker'] ?? []).find(p => p.value === (properties.product as string))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {(MQ_PRODUCT_GROUPS[(properties.category as string) || 'broker'] ?? []).map((p) => (
            <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Defines how messages are distributed to consumers (one-to-one vs one-to-many)."
        >
          Queue Type
        </label>
        <select
          value={(properties.queueType as string) || 'pub_sub'}
          onChange={(e) => handlePropertyChange('queueType', e.target.value)}
          title={getTooltip(
            MQ_QUEUE_TYPES.find(opt => opt.value === ((properties.queueType as string) || 'pub_sub'))?.label || '',
            MQ_QUEUE_TYPES.find(opt => opt.value === ((properties.queueType as string) || 'pub_sub'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {MQ_QUEUE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The reliability guarantee for message handoff between producer and consumer."
        >
          Delivery Guarantee
        </label>
        <select
          value={(properties.deliveryGuarantee as string) || 'at_least_once'}
          onChange={(e) => handlePropertyChange('deliveryGuarantee', e.target.value)}
          title={getTooltip(
            MQ_DELIVERY_GUARANTEES.find(opt => opt.value === ((properties.deliveryGuarantee as string) || 'at_least_once'))?.label || '',
            MQ_DELIVERY_GUARANTEES.find(opt => opt.value === ((properties.deliveryGuarantee as string) || 'at_least_once'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {MQ_DELIVERY_GUARANTEES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Ensures that messages are processed in the exact order they were sent."
        >
          <input
            type="checkbox"
            checked={(properties.ordered as boolean) || false}
            onChange={(e) => handlePropertyChange('ordered', e.target.checked)}
          />
          Ordered Delivery
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="A secondary queue for messages that cannot be processed, allowing for offline inspection and manual retry."
        >
          <input
            type="checkbox"
            checked={(properties.hasDLQ as boolean) || false}
            onChange={(e) => handlePropertyChange('hasDLQ', e.target.checked)}
          />
          Enable Dead Letter Queue (DLQ)
        </label>
      </div>
    </>
  )

  const renderCacheSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Defines whether the cache is local to an instance or shared across a cluster."
        >
          Cache Type
        </label>
        <select
          value={(properties.cacheType as string) || 'distributed'}
          onChange={(e) => handlePropertyChange('cacheType', e.target.value)}
          title={getTooltip(
            CACHE_TYPES.find(opt => opt.value === ((properties.cacheType as string) || 'distributed'))?.label || '',
            CACHE_TYPES.find(opt => opt.value === ((properties.cacheType as string) || 'distributed'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CACHE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The specific caching engine or product."
        >
          Product
        </label>
        <select
          value={(properties.product as string) || 'redis'}
          onChange={(e) => handlePropertyChange('product', e.target.value)}
          title={getTooltip(
            CACHE_PRODUCTS.find(p => p.value === ((properties.product as string) || 'redis'))?.label || '',
            CACHE_PRODUCTS.find(p => p.value === ((properties.product as string) || 'redis'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {CACHE_PRODUCTS.map((p) => (
            <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The logic used to decide which items to remove when the cache is full."
        >
          Eviction Policy
        </label>
        <select
          value={(properties.evictionPolicy as string) || ''}
          onChange={(e) => handlePropertyChange('evictionPolicy', e.target.value)}
          title={getTooltip(
            EVICTION_POLICIES.find(opt => opt.value === ((properties.evictionPolicy as string) || ''))?.label || '',
            EVICTION_POLICIES.find(opt => opt.value === ((properties.evictionPolicy as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {EVICTION_POLICIES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Time-To-Live: Duration after which a cache entry is automatically invalidated."
        >
          TTL (Seconds)
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0 (No Expiration)"
          value={properties.ttlSeconds != null ? String(properties.ttlSeconds) : ''}
          onChange={(e) => {
            const val = e.target.value
            if (val === '') {
              const newProps = { ...properties }
              delete newProps.ttlSeconds
              onNodeDataChange(selectedNode.id, { ...data, properties: newProps })
            } else {
              handlePropertyChange('ttlSeconds', parseInt(val, 10))
            }
          }}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>
    </>
  )

  const renderFirewallSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Select the WAF product used for traffic filtering"
        >
          Product
        </label>
        <select
          value={(properties.product as string) || ''}
          onChange={(e) => handlePropertyChange('product', e.target.value || undefined)}
          title={getTooltip(
            FIREWALL_PRODUCTS.find(p => p.value === ((properties.product as string) || ''))?.label || '',
            FIREWALL_PRODUCTS.find(p => p.value === ((properties.product as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {FIREWALL_PRODUCTS.map((p) => (
            <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Inline blocks malicious traffic; Monitor only logs without blocking"
        >
          Mode
        </label>
        <select
          value={(properties.mode as string) || 'inline'}
          onChange={(e) => handlePropertyChange('mode', e.target.value)}
          title={getTooltip(
            FIREWALL_MODES.find(opt => opt.value === ((properties.mode as string) || 'inline'))?.label || '',
            FIREWALL_MODES.find(opt => opt.value === ((properties.mode as string) || 'inline'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {FIREWALL_MODES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="L3/L4 filters by IP/port; L7 inspects HTTP content for attacks like SQLi/XSS"
        >
          Layer
        </label>
        <select
          value={(properties.layer as string) || 'l7'}
          onChange={(e) => handlePropertyChange('layer', e.target.value)}
          title={getTooltip(
            FIREWALL_LAYERS.find(opt => opt.value === ((properties.layer as string) || 'l7'))?.label || '',
            FIREWALL_LAYERS.find(opt => opt.value === ((properties.layer as string) || 'l7'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {FIREWALL_LAYERS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  )

  const renderMonitorSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Select the observability product for log collection and monitoring"
        >
          Product
        </label>
        <select
          value={(properties.product as string) || ''}
          onChange={(e) => handlePropertyChange('product', e.target.value || undefined)}
          title={getTooltip(
            MONITOR_PRODUCTS.find(p => p.value === ((properties.product as string) || ''))?.label || '',
            MONITOR_PRODUCTS.find(p => p.value === ((properties.product as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {MONITOR_PRODUCTS.map((p) => (
            <option key={p.value} value={p.value} title={p.description}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Metrics: numeric indicators; Logs: text records; Traces: distributed request tracking; All: full observability"
        >
          Log Type
        </label>
        <select
          value={(properties.logType as string) || 'all'}
          onChange={(e) => handlePropertyChange('logType', e.target.value)}
          title={getTooltip(
            MONITOR_LOG_TYPES.find(opt => opt.value === ((properties.logType as string) || 'all'))?.label || '',
            MONITOR_LOG_TYPES.find(opt => opt.value === ((properties.logType as string) || 'all'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {MONITOR_LOG_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Enable alerting to receive notifications when anomalies are detected"
        >
          <input
            type="checkbox"
            checked={(properties.alerting as boolean) || false}
            onChange={(e) => handlePropertyChange('alerting', e.target.checked)}
          />
          Enable Alerting
        </label>
      </div>
    </>
  )

  const renderServiceSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="How this service is deployed and executed"
        >
          Compute Type
        </label>
        <select
          value={(properties.computeType as string) || ''}
          onChange={(e) => handlePropertyChange('computeType', e.target.value || undefined)}
          title={getTooltip(
            COMPUTE_TYPES.find(opt => opt.value === ((properties.computeType as string) || ''))?.label || '',
            COMPUTE_TYPES.find(opt => opt.value === ((properties.computeType as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {COMPUTE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Automatically scale replicas based on CPU, memory, or request metrics"
        >
          <input
            type="checkbox"
            checked={(properties.autoScaling as boolean) || false}
            onChange={(e) => handlePropertyChange('autoScaling', e.target.checked)}
          />
          Auto Scaling
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          title="Expose a health endpoint (e.g., /health) for load balancers and orchestrators"
        >
          <input
            type="checkbox"
            checked={(properties.healthCheck as boolean) || false}
            onChange={(e) => handlePropertyChange('healthCheck', e.target.checked)}
          />
          Health Check
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="Primary programming language of this service"
        >
          Language
        </label>
        <select
          value={(properties.language as string) || ''}
          onChange={(e) => handlePropertyChange('language', e.target.value || undefined)}
          title={getTooltip(
            SERVICE_LANGUAGES.find(opt => opt.value === ((properties.language as string) || ''))?.label || '',
            SERVICE_LANGUAGES.find(opt => opt.value === ((properties.language as string) || ''))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {SERVICE_LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title={`e.g., ${FRAMEWORK_HINTS[(properties.language as string)]?.join(', ') || 'spring-boot, fastapi, gin, express'}`}
        >
          Framework
        </label>
        <input
          type="text"
          placeholder={FRAMEWORK_HINTS[(properties.language as string)]?.[0] || 'e.g., spring-boot, fastapi, gin, express'}
          value={(properties.framework as string) || ''}
          onChange={(e) => handlePropertyChange('framework', e.target.value || undefined)}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>
    </>
  )

  const renderWorkerSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Worker Type
        </label>
        <select
          value={(properties.workerType as string) || 'cron'}
          onChange={(e) => handlePropertyChange('workerType', e.target.value)}
          title={getTooltip(
            WORKER_TYPES.find(opt => opt.value === ((properties.workerType as string) || 'cron'))?.label || '',
            WORKER_TYPES.find(opt => opt.value === ((properties.workerType as string) || 'cron'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {WORKER_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Schedule (Cron Expression)
        </label>
        <input
          type="text"
          placeholder="e.g. 0 0 * * *"
          value={(properties.schedule as string) || ''}
          onChange={(e) => handlePropertyChange('schedule', e.target.value || undefined)}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Concurrency
        </label>
        <input
          type="number"
          min="1"
          placeholder="1"
          value={(properties.concurrency as number) || ''}
          onChange={(e) => handlePropertyChange('concurrency', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>
    </>
  )

  const renderSearchEngineSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Product
        </label>
        <input
          type="text"
          placeholder="e.g. Elasticsearch, Solr"
          value={(properties.product as string) || ''}
          onChange={(e) => handlePropertyChange('product', e.target.value || undefined)}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Index Type
        </label>
        <select
          value={(properties.indexType as string) || 'document'}
          onChange={(e) => handlePropertyChange('indexType', e.target.value)}
          title={getTooltip(
            SEARCH_ENGINE_INDEX_TYPES.find(opt => opt.value === ((properties.indexType as string) || 'document'))?.label || '',
            SEARCH_ENGINE_INDEX_TYPES.find(opt => opt.value === ((properties.indexType as string) || 'document'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {SEARCH_ENGINE_INDEX_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  )

  const renderExternalSystemSection = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          System Type
        </label>
        <select
          value={(properties.systemType as string) || 'api'}
          onChange={(e) => handlePropertyChange('systemType', e.target.value)}
          title={getTooltip(
            EXTERNAL_SYSTEM_TYPES.find(opt => opt.value === ((properties.systemType as string) || 'api'))?.label || '',
            EXTERNAL_SYSTEM_TYPES.find(opt => opt.value === ((properties.systemType as string) || 'api'))?.description
          )}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          {EXTERNAL_SYSTEM_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Provider
        </label>
        <input
          type="text"
          placeholder="e.g. Stripe, SendGrid"
          value={(properties.provider as string) || ''}
          onChange={(e) => handlePropertyChange('provider', e.target.value || undefined)}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>
    </>
  )

  const renderRoleProperties = (role: ComponentType) => {
    switch (role) {
      case 'client': return renderClientSection()
      case 'dns': return renderDNSSection()
      case 'cdn': return renderCDNSection()
      case 'api_gateway': return renderAPIGatewaySection()
      case 'database': return renderDatabaseSection()
      case 'load_balancer': return renderLoadBalancerSection()
      case 'reverse_proxy': return renderReverseProxySection()
      case 'storage': return renderStorageSection()
      case 'message_queue': return renderMessageQueueSection()
      case 'cache': return renderCacheSection()
      case 'firewall': return renderFirewallSection()
      case 'monitor': return renderMonitorSection()
      case 'worker': return renderWorkerSection()
      case 'search_engine': return renderSearchEngineSection()
      case 'external_system': return renderExternalSystemSection()
      case 'service': return renderServiceSection()
      default: return null
    }
  }

  const supportsReplicas = roles.some(role => 
    ['service', 'database', 'load_balancer', 'cache', 'reverse_proxy', 'firewall', 'monitor', 'worker', 'search_engine'].includes(role)
  )

  return (
    <aside
      style={{
        width: '100%',
        padding: 16,
        overflowY: 'auto',
        flex: 1,
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
        Component Properties
      </h3>

      {/* Label - Common for all nodes */}
      <div style={{ marginBottom: 16 }}>
        <label 
          style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
          title="The display name of this component on the canvas."
        >
          Label
        </label>
        <input
          type="text"
          value={(data.label as string) || ''}
          onChange={handleLabelChange}
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Replicas - Shared if any role supports it */}
      {supportsReplicas && (
        <div style={{ marginBottom: 16 }}>
          <label 
            style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
            title="Number of running instances for high availability and load distribution."
          >
            Replicas
          </label>
          <input
            type="number"
            min="1"
            value={(properties.replicas as number) || 1}
            onChange={(e) => handlePropertyChange('replicas', parseInt(e.target.value, 10))}
            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 13, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {/* Role-specific properties */}
      {roles.map((role) => {
        const section = renderRoleProperties(role)
        if (!section) return null

        const showHeader = roles.length > 1

        return (
          <div key={role} style={{ marginTop: showHeader ? 20 : 0, borderTop: showHeader ? '1px solid var(--border-color)' : 'none', paddingTop: showHeader ? 16 : 0 }}>
            {showHeader && (
              <div style={{ 
                display: 'inline-block', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 11, 
                fontWeight: 600, 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 12
              }}>
                {role.replace('_', ' ')} Role
              </div>
            )}
            {section}
          </div>
        )
      })}
    </aside>
  )
}
