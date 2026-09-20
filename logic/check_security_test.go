package logic

import (
	"testing"

	"github.com/architectmind/backend/model"
)

// --- checkInvalidConnection ---

func TestCheckInvalidConnection_FirewallToCDN(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"fw1":  {ID: "fw1", ComponentType: "firewall", Label: "WAF"},
			"cdn1": {ID: "cdn1", ComponentType: "cdn", Label: "CloudFront"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "fw1", Target: "cdn1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 || w[0].Rule != "invalid_connection" {
		t.Errorf("expected 1 invalid_connection warning, got %d", len(w))
	}
}

func TestCheckInvalidConnection_LBToDatabase(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"lb1": {ID: "lb1", ComponentType: "load_balancer", Label: "LB"},
			"db1": {ID: "db1", ComponentType: "database", Label: "MySQL"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "lb1", Target: "db1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for LB→DB, got %d", len(w))
	}
}

func TestCheckInvalidConnection_DatabaseToClient(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"db1": {ID: "db1", ComponentType: "database", Label: "MySQL"},
			"c1":  {ID: "c1", ComponentType: "client", Label: "Browser"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "db1", Target: "c1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for DB→Client, got %d", len(w))
	}
}

func TestCheckInvalidConnection_MQToClient(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"mq1": {ID: "mq1", ComponentType: "message_queue", Label: "Kafka"},
			"c1":  {ID: "c1", ComponentType: "client", Label: "App"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "mq1", Target: "c1", ConnectionType: "async"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for MQ→Client, got %d", len(w))
	}
}

func TestCheckInvalidConnection_CDNToDatabase(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"cdn1": {ID: "cdn1", ComponentType: "cdn", Label: "CloudFront"},
			"db1":  {ID: "db1", ComponentType: "database", Label: "MySQL"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "cdn1", Target: "db1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for CDN→DB, got %d", len(w))
	}
}

func TestCheckInvalidConnection_DNSToService(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"dns1": {ID: "dns1", ComponentType: "dns", Label: "Route53"},
			"s1":   {ID: "s1", ComponentType: "service", Label: "API"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "dns1", Target: "s1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for DNS→Service, got %d", len(w))
	}
}

func TestCheckInvalidConnection_MonitorToService(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"log1": {ID: "log1", ComponentType: "monitor", Label: "ELK"},
			"s1":   {ID: "s1", ComponentType: "service", Label: "API"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "log1", Target: "s1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for Monitor→Service, got %d", len(w))
	}
}

func TestCheckInvalidConnection_ValidConnection_NoWarning(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"s1":  {ID: "s1", ComponentType: "service", Label: "API"},
			"db1": {ID: "db1", ComponentType: "database", Label: "MySQL"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "s1", Target: "db1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings for valid Service→DB, got %d", len(w))
	}
}

func TestCheckInvalidConnection_ClientToCDN_Valid(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"c1":   {ID: "c1", ComponentType: "client", Label: "Browser"},
			"cdn1": {ID: "cdn1", ComponentType: "cdn", Label: "CloudFront"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "c1", Target: "cdn1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings for valid Client→CDN, got %d", len(w))
	}
}

func TestCheckInvalidConnection_ServiceToMonitor_Valid(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"s1":   {ID: "s1", ComponentType: "service", Label: "API"},
			"log1": {ID: "log1", ComponentType: "monitor", Label: "ELK"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "s1", Target: "log1", ConnectionType: "async"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings for valid Service→Monitor, got %d", len(w))
	}
}

func TestCheckInvalidConnection_MergedNode(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"merged": {ID: "merged", ComponentType: "reverse_proxy", Label: "Nginx+LB",
				Roles: []string{"reverse_proxy", "load_balancer"}},
			"db1": {ID: "db1", ComponentType: "database", Label: "MySQL"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "merged", Target: "db1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) == 0 {
		t.Error("expected warning for merged RP+LB → DB")
	}
}

func TestCheckInvalidConnection_StorageToClient(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"st1": {ID: "st1", ComponentType: "storage", Label: "S3"},
			"c1":  {ID: "c1", ComponentType: "client", Label: "Browser"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "st1", Target: "c1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for Storage→Client, got %d", len(w))
	}
}

func TestCheckInvalidConnection_ClientToDatabase(t *testing.T) {
	ctx := makeCtx(
		map[string]model.SystemNode{
			"c1":  {ID: "c1", ComponentType: "client", Label: "Browser"},
			"db1": {ID: "db1", ComponentType: "database", Label: "MySQL"},
		},
		[]model.SystemEdge{
			{ID: "e1", Source: "c1", Target: "db1", ConnectionType: "sync"},
		},
	)
	w := checkInvalidConnection(ctx)
	if len(w) != 1 || w[0].Rule != "invalid_connection" {
		t.Errorf("expected 1 invalid_connection warning for Client→DB, got %d", len(w))
	}
}

// --- checkMissingFirewall ---

func TestCheckMissingFirewall_NoFirewall(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"c1":  {ID: "c1", ComponentType: "client", Label: "Browser"},
		"lb1": {ID: "lb1", ComponentType: "load_balancer", Label: "LB"},
	}
	edges := []model.SystemEdge{
		{ID: "e1", Source: "c1", Target: "lb1", ConnectionType: "sync"},
	}
	ctx := makeCtx(nodes, edges)
	w := checkMissingFirewall(ctx)
	if len(w) != 1 || w[0].Rule != "missing_firewall" {
		t.Errorf("expected 1 warning, got %d", len(w))
	}
}

func TestCheckMissingFirewall_FirewallNotConnected(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"c1":  {ID: "c1", ComponentType: "client", Label: "Browser"},
		"lb1": {ID: "lb1", ComponentType: "load_balancer", Label: "LB"},
		"fw1": {ID: "fw1", ComponentType: "firewall", Label: "WAF"},
	}
	edges := []model.SystemEdge{
		{ID: "e1", Source: "c1", Target: "lb1", ConnectionType: "sync"},
	}
	ctx := makeCtx(nodes, edges)
	w := checkMissingFirewall(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for disconnected firewall, got %d", len(w))
	}
}

func TestCheckMissingFirewall_FirewallConnected(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"c1":  {ID: "c1", ComponentType: "client", Label: "Browser"},
		"lb1": {ID: "lb1", ComponentType: "load_balancer", Label: "LB"},
		"fw1": {ID: "fw1", ComponentType: "firewall", Label: "WAF"},
	}
	edges := []model.SystemEdge{
		{ID: "e1", Source: "c1", Target: "fw1", ConnectionType: "sync"},
		{ID: "e2", Source: "fw1", Target: "lb1", ConnectionType: "sync"},
	}
	ctx := makeCtx(nodes, edges)
	w := checkMissingFirewall(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings, got %d", len(w))
	}
}

// --- checkFirewallMonitorMode ---

func TestCheckFirewallMonitorMode_Monitor(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"fw1": {ID: "fw1", ComponentType: "firewall", Label: "WAF", Properties: map[string]interface{}{
			"mode": "monitor", "layer": "l7",
		}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkFirewallMonitorMode(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning, got %d", len(w))
	}
}

func TestCheckFirewallMonitorMode_Inline_NoWarning(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"fw1": {ID: "fw1", ComponentType: "firewall", Label: "WAF", Properties: map[string]interface{}{
			"mode": "inline", "layer": "l7",
		}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkFirewallMonitorMode(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings, got %d", len(w))
	}
}

// --- checkFirewallL3Only ---

func TestCheckFirewallL3Only_WithAPIGateway(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"fw1": {ID: "fw1", ComponentType: "firewall", Label: "FW", Properties: map[string]interface{}{
			"layer": "l3",
		}},
		"ag1": {ID: "ag1", ComponentType: "api_gateway", Label: "Gateway"},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkFirewallL3Only(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning, got %d", len(w))
	}
}

func TestCheckFirewallL3Only_NoAPIGateway_NoWarning(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"fw1": {ID: "fw1", ComponentType: "firewall", Label: "FW", Properties: map[string]interface{}{
			"layer": "l3",
		}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkFirewallL3Only(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings without API gateway, got %d", len(w))
	}
}
