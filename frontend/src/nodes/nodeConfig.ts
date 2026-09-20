import type { ComponentType, ComponentProperties } from '../types/topology'

interface NodeTypeConfig {
  label: string
  color: string
  icon: string
  description: string
  defaultProperties: ComponentProperties
}

export const NODE_TYPE_CONFIG: Record<ComponentType, NodeTypeConfig> = {
  client: {
    label: 'Client',
    color: '#4b5563',
    icon: '',
    description: 'Represents an end-user device, web browser, or external consumer of the system.',
    defaultProperties: {
      clientType: 'web',
    },
  },
  dns: {
    label: 'DNS',
    color: '#4b5563',
    icon: '',
    description: 'Domain Name System: Translates human-readable domain names to IP addresses.',
    defaultProperties: {
      routingPolicy: 'simple',
      healthCheck: false,
    },
  },
  cdn: {
    label: 'CDN',
    color: '#4b5563',
    icon: '',
    description: 'Content Delivery Network: Geographically distributed group of servers which work together to provide fast delivery of Internet content.',
    defaultProperties: {
      contentType: 'static',
      cacheTTL: 'medium',
    },
  },
  firewall: {
    label: 'Firewall',
    color: '#4b5563',
    icon: '',
    description: 'Web Application Firewall: Filters and monitors HTTP traffic between the client and the application, blocking malicious requests.',
    defaultProperties: {
      mode: 'inline',
      layer: 'l7',
    },
  },
  load_balancer: {
    label: 'Load Balancer',
    color: '#4b5563',
    icon: '',
    description: 'Distributes incoming network traffic across a group of backend servers to ensure availability and reliability.',
    defaultProperties: {
      algorithm: 'round_robin',
      healthCheck: true,
      layer: 'l7',
    },
  },
  reverse_proxy: {
    label: 'Reverse Proxy',
    color: '#4b5563',
    icon: '',
    description: 'Sits between clients and backend servers, handling SSL termination, caching, compression, and request routing.',
    defaultProperties: {
      product: 'nginx',
      sslTermination: true,
      caching: false,
      compression: false,
      rateLimiting: false,
    },
  },
  api_gateway: {
    label: 'API Gateway',
    color: '#4b5563',
    icon: '',
    description: 'A single entry point for all clients, handling request routing, composition, and protocol translation.',
    defaultProperties: {
      rateLimiting: false,
    },
  },
  service: {
    label: 'Service',
    color: '#4b5563',
    icon: '',
    description: 'A generic compute unit, microservice, or application server that performs business logic.',
    defaultProperties: {
      replicas: 1,
      stateless: true,
      autoScaling: false,
      healthCheck: false,
    },
  },
  message_queue: {
    label: 'Message Queue',
    color: '#4b5563',
    icon: '',
    description: 'Provides an asynchronous communication protocol for inter-service messaging.',
    defaultProperties: {
      category: 'broker',
      product: 'rabbitmq',
      queueType: 'pub_sub',
      deliveryGuarantee: 'at_least_once',
      ordered: false,
      hasDLQ: false,
    },
  },
  cache: {
    label: 'Cache',
    color: '#4b5563',
    icon: '',
    description: 'High-speed data storage layer which stores a subset of data for faster retrieval.',
    defaultProperties: {
      cacheType: 'distributed',
      product: 'redis',
      evictionPolicy: 'lru',
      ttlSeconds: 3600,
    },
  },
  database: {
    label: 'Database',
    color: '#4b5563',
    icon: '',
    description: 'A structured system for storing, managing, and retrieving data.',
    defaultProperties: {
      dbType: 'sql',
      acidRequired: true,
      readWriteRatio: 0.8,
      scalingStrategy: 'vertical',
    },
  },
  storage: {
    label: 'Storage',
    color: '#4b5563',
    icon: '',
    description: 'Object or block storage for unstructured data like images, logs, and backups.',
    defaultProperties: {
      accessLevel: 'private',
      storageClass: 'standard',
      versioning: false,
    },
  },
  monitor: {
    label: 'Monitor',
    color: '#4b5563',
    icon: '',
    description: 'Logging and monitoring system: Collects metrics, logs, and traces from all services for observability and alerting.',
    defaultProperties: {
      logType: 'all',
      alerting: false,
    },
  },
  external_system: {
    label: 'External System',
    color: '#4b5563',
    icon: '',
    description: 'A third-party API or external service (e.g. Stripe, SendGrid, OAuth).',
    defaultProperties: {
      systemType: 'api',
    },
  },
  worker: {
    label: 'Worker',
    color: '#4b5563',
    icon: '',
    description: 'Background worker, batch processor, or cron job.',
    defaultProperties: {
      workerType: 'cron',
    },
  },
  search_engine: {
    label: 'Search Engine',
    color: '#4b5563',
    icon: '',
    description: 'Search and analytics engine for text and document retrieval.',
    defaultProperties: {
      indexType: 'document',
    },
  },
}

export function getMergedConfig(roles: ComponentType[]): {
  label: string
  icons: string[]
  colors: string[]
  descriptions: string[]
} {
  return {
    label: roles.map(r => NODE_TYPE_CONFIG[r].label).join(' + '),
    icons: roles.map(r => NODE_TYPE_CONFIG[r].icon),
    colors: roles.map(r => NODE_TYPE_CONFIG[r].color),
    descriptions: roles.map(r => NODE_TYPE_CONFIG[r].description),
  }
}
