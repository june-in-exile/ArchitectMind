package model

// SystemTopology is the top-level graph sent from the frontend.
type SystemTopology struct {
	ID      string        `json:"id" binding:"required"`
	Name    string        `json:"name" binding:"required"`
	Version int           `json:"version"`
	Nodes   []SystemNode  `json:"nodes" binding:"required"`
	Edges   []SystemEdge  `json:"edges"`
	Params  *SystemParams `json:"params,omitempty"`
}

// SystemParams holds user-defined capacity and performance parameters.
type SystemParams struct {
	DAU            int     `json:"dau,omitempty"`
	PeakQPS        int     `json:"peakQPS,omitempty"`
	AvgQPS         int     `json:"avgQPS,omitempty"`
	StorageGB      float64 `json:"storageGB,omitempty"`
	DailyGrowthGB  float64 `json:"dailyGrowthGB,omitempty"`
	ReadWriteRatio float64 `json:"readWriteRatio,omitempty"`
	LatencyTarget  string  `json:"latencyTarget,omitempty"`
	Availability   string  `json:"availability,omitempty"`
}

// Position represents the x/y coordinates of a node on the canvas.
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// SystemNode represents a single architecture component.
type SystemNode struct {
	ID            string                 `json:"id" binding:"required"`
	ComponentType string                 `json:"componentType" binding:"required"`
	Label         string                 `json:"label" binding:"required"`
	Position      Position               `json:"position"`
	Properties    map[string]interface{} `json:"properties"`
	Roles         []string               `json:"roles,omitempty"`
}

// SystemEdge represents a connection between two nodes.
type SystemEdge struct {
	ID             string `json:"id" binding:"required"`
	Source         string `json:"source" binding:"required"`
	Target         string `json:"target" binding:"required"`
	ConnectionType string `json:"connectionType" binding:"required"`
	Protocol       string `json:"protocol,omitempty"`
	Label          string `json:"label,omitempty"`
}

// ValidComponentTypes enumerates all supported component types.
var ValidComponentTypes = map[string]bool{
	"client":        true,
	"load_balancer": true,
	"api_gateway":   true,
	"service":       true,
	"database":      true,
	"cache":         true,
	"message_queue": true,
	"cdn":           true,
	"dns":           true,
	"storage":       true,
	"reverse_proxy": true,
	"firewall":      true,
	"monitor":         true,
	"external_system": true,
	"worker":          true,
	"search_engine":   true,
}

// ValidConnectionTypes enumerates all supported connection types.
var ValidConnectionTypes = map[string]bool{
	"sync":        true,
	"async":       true,
	"replication": true,
	"cdn_origin":  true,
	"unspecified": true,
}

// TopologyContext holds pre-computed lookup structures for validation.
type TopologyContext struct {
	Nodes    []SystemNode
	Edges    []SystemEdge
	NodeByID map[string]SystemNode
	Outgoing map[string][]string // source ID -> list of target IDs
	Params   *SystemParams
}

// NewTopologyContext builds a TopologyContext from a SystemTopology.
func NewTopologyContext(t SystemTopology) TopologyContext {
	nodeByID := make(map[string]SystemNode, len(t.Nodes))
	for _, node := range t.Nodes {
		nodeByID[node.ID] = node
	}
	outgoing := make(map[string][]string)
	for _, edge := range t.Edges {
		outgoing[edge.Source] = append(outgoing[edge.Source], edge.Target)
	}
	return TopologyContext{
		Nodes:    t.Nodes,
		Edges:    t.Edges,
		NodeByID: nodeByID,
		Outgoing: outgoing,
		Params:   t.Params,
	}
}
