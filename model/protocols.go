package model

// ExpectedProtocols defines which protocols are appropriate for connections
// targeting a given component type. A nil value means any protocol is acceptable.
var ExpectedProtocols = map[string]map[string]bool{
	"database": {
		"database": true,
		"resp":     true,
		"binary":   true,
		"uds":      true,
		"tcp":      true,
	},
	"cache": {
		"database": true,
		"resp":     true,
		"binary":   true,
		"uds":      true,
		"tcp":      true,
		"http":     true, // Couchbase/Elasticsearch
	},
	"message_queue": {
		"amqp": true,
		"mqtt": true,
		"tcp":  true,
	},
	"dns": {
		"dns": true,
		"udp": true,
	},
	"client": {
		"http":      true,
		"https":     true,
		"websocket": true,
	},
	"cdn": {
		"http":  true,
		"https": true,
	},
	"storage": {
		"http":  true,
		"https": true,
	},
}

// ProtocolDisplayName maps protocol values to human-readable names.
var ProtocolDisplayName = map[string]string{
	"http":      "HTTP",
	"https":     "HTTPS",
	"grpc":      "gRPC",
	"websocket": "WebSocket",
	"ssh":       "SSH",
	"tcp":       "TCP",
	"udp":       "UDP",
	"amqp":      "AMQP",
	"mqtt":      "MQTT",
	"database":  "Database Protocol",
	"resp":      "RESP (Redis)",
	"binary":    "Binary Protocol",
	"uds":       "UDS (Unix Domain Socket)",
	"dns":       "DNS",
}

// ValidConnectionProtocolPairs defines which protocols are allowed for each connection type.
var ValidConnectionProtocolPairs = map[string]map[string]bool{
	"sync": {
		"unspecified": true,
		"http":        true,
		"https":       true,
		"grpc":        true,
		"websocket":   true,
		"ssh":         true,
		"tcp":         true,
		"database":    true,
		"resp":        true,
		"binary":      true,
		"uds":         true,
		"dns":         true,
	},
	"async": {
		"unspecified": true,
		"amqp":        true,
		"mqtt":        true,
		"http":        true, // Webhooks
		"https":       true, // Webhooks
		"tcp":         true,
		"udp":         true,
	},
	"replication": {
		"unspecified": true,
		"database":    true,
		"binary":      true,
		"tcp":         true,
		"udp":         true,
		"ssh":         true, // rsync over ssh
	},
	"cdn_origin": {
		"unspecified": true,
		"http":        true,
		"https":       true,
	},
}

// ForbiddenConnections defines source→target role pairs that are architecturally invalid.
// Key = source role, Value = list of forbidden target roles.
var ForbiddenConnections = map[string][]string{
	// Entry Node → CDN (Traffic already inside infrastructure should not route back to CDN)
	"firewall": {"cdn"},

	// Entry Node → Data Layer (Skip Service Layer, violates layered architecture)
	"load_balancer": {"cdn", "database", "cache", "message_queue"},
	"reverse_proxy": {"cdn", "database", "cache", "message_queue"},
	"api_gateway":   {"cdn", "database", "cache", "message_queue"},

	// Data Layer → Entry Layer/Client (Data Layer is passive, should not initiate connections)
	"database": {"client", "load_balancer", "reverse_proxy", "api_gateway", "firewall", "cdn"},
	"cache":    {"client", "load_balancer", "reverse_proxy", "api_gateway", "firewall", "cdn"},
	"storage":  {"client"},

	// MQ → Client (Client should not directly consume MQ)
	"message_queue": {"client"},

	// CDN → Data Layer (CDN should only origin pull to Storage or Entry Nodes)
	"cdn": {"database", "cache", "message_queue"},

	// DNS is only relevant for Clients
	"dns": {"service", "database", "cache", "message_queue", "storage",
		"load_balancer", "reverse_proxy", "api_gateway", "firewall", "cdn", "monitor"},

	// Monitor are passive sinks, should not have outgoing connections
	"monitor": {"service", "database", "cache", "message_queue", "storage",
		"client", "cdn", "load_balancer", "reverse_proxy", "api_gateway", "firewall", "dns"},

	// Client should not connect directly to Data Layer
	"client": {"database", "cache"},
}

// ForbiddenConnectionReasons provides human-readable explanations for each category.
var ForbiddenConnectionReasons = map[string]map[string]string{
	"firewall":      {"cdn": "Traffic should not route back to CDN after entering infrastructure; CDN should be in front of Firewall."},
	"load_balancer": {"cdn": "Same as above", "database": "Entry nodes should not bypass Service layer to access Database directly", "cache": "Entry nodes should not bypass Service layer to access Cache directly", "message_queue": "Entry nodes should not bypass Service layer to access MQ directly"},
	"reverse_proxy": {"cdn": "Same as above", "database": "Entry nodes should not bypass Service layer to access Database directly", "cache": "Entry nodes should not bypass Service layer to access Cache directly", "message_queue": "Entry nodes should not bypass Service layer to access MQ directly"},
	"api_gateway":   {"cdn": "Same as above", "database": "Entry nodes should not bypass Service layer to access Database directly", "cache": "Entry nodes should not bypass Service layer to access Cache directly", "message_queue": "Entry nodes should not bypass Service layer to access MQ directly"},
	"database":      {"*": "Database is a passive component and should not initiate connections to entry layer or Client"},
	"cache":         {"*": "Cache is a passive component and should not initiate connections to entry layer or Client"},
	"storage":       {"client": "Object Storage should not connect directly to Client; it should be distributed via CDN or Service"},
	"message_queue": {"client": "Client should not directly consume MQ; it should be processed and pushed by a Service"},
	"cdn":           {"*": "CDN should only origin pull to Storage or Entry nodes and should not access the data layer"},
	"dns":           {"*": "DNS only performs domain resolution and does not route actual traffic to backend components"},
	"monitor":        {"*": "Monitor is a passive sink and should not initiate connections to other components"},
	"client": {
		"database": "Client should not operate directly on the database. Add an API Gateway or Service layer in between for authentication and data abstraction.",
		"cache":    "Direct cache access by Client is not recommended. This can lead to cache penetration risks or data leaks. Cache logic should be encapsulated in a backend Service.",
	},
}
