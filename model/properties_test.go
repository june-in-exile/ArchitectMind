package model

import "testing"

func TestParseNodeProperties_Database(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "database", Label: "MySQL",
		Properties: map[string]interface{}{
			"dbType": "sql", "readWriteRatio": 0.8, "acidRequired": true,
		},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	dbProps, ok := props.(*DatabaseProperties)
	if !ok {
		t.Fatal("expected *DatabaseProperties")
	}
	if dbProps.DBType != "sql" {
		t.Errorf("expected sql, got %s", dbProps.DBType)
	}
	if dbProps.ReadWriteRatio != 0.8 {
		t.Errorf("expected 0.8, got %f", dbProps.ReadWriteRatio)
	}
}

func TestParseNodeProperties_Service(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "service", Label: "API",
		Properties: map[string]interface{}{
			"replicas": float64(3), "stateless": true, "autoScaling": true, "healthCheck": true,
		},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	svcProps, ok := props.(*ServiceProperties)
	if !ok {
		t.Fatal("expected *ServiceProperties")
	}
	if svcProps.Replicas != 3 {
		t.Errorf("expected 3 replicas, got %d", svcProps.Replicas)
	}
	if !svcProps.AutoScaling {
		t.Error("expected autoScaling true")
	}
}

func TestParseNodeProperties_Cache(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "cache", Label: "Redis",
		Properties: map[string]interface{}{
			"evictionPolicy": "lru", "ttlSeconds": float64(300),
		},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cacheProps, ok := props.(*CacheProperties)
	if !ok {
		t.Fatal("expected *CacheProperties")
	}
	if cacheProps.EvictionPolicy != "lru" {
		t.Errorf("expected lru, got %s", cacheProps.EvictionPolicy)
	}
	if cacheProps.TTLSeconds != 300 {
		t.Errorf("expected 300, got %d", cacheProps.TTLSeconds)
	}
}

func TestParseNodeProperties_MessageQueue(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "message_queue", Label: "RabbitMQ",
		Properties: map[string]interface{}{
			"hasDLQ": true, "deliveryGuarantee": "at_least_once",
		},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	mqProps, ok := props.(*MessageQueueProperties)
	if !ok {
		t.Fatal("expected *MessageQueueProperties")
	}
	if !mqProps.HasDLQ {
		t.Error("expected hasDLQ true")
	}
}

func TestParseNodeProperties_UnknownType(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "unknown_thing", Label: "???",
		Properties: map[string]interface{}{"foo": "bar"},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	m, ok := props.(map[string]interface{})
	if !ok {
		t.Fatal("expected raw map for unknown type")
	}
	if m["foo"] != "bar" {
		t.Error("expected original properties returned")
	}
}

func TestParseNodeProperties_Firewall(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "firewall", Label: "WAF",
		Properties: map[string]interface{}{"mode": "monitor", "layer": "l3"},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	fwProps, ok := props.(*FirewallProperties)
	if !ok {
		t.Fatal("expected *FirewallProperties")
	}
	if fwProps.Mode != "monitor" {
		t.Errorf("expected monitor, got %s", fwProps.Mode)
	}
}

func TestParseNodeProperties_Logger(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "monitor", Label: "ELK",
		Properties: map[string]interface{}{"logType": "metrics", "alerting": false},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	logProps, ok := props.(*MonitorProperties)
	if !ok {
		t.Fatal("expected *MonitorProperties")
	}
	if logProps.LogType != "metrics" {
		t.Errorf("expected metrics, got %s", logProps.LogType)
	}
}

func TestParseNodeProperties_ReverseProxy(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "reverse_proxy", Label: "Nginx",
		Properties: map[string]interface{}{"sslTermination": true, "replicas": float64(2)},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	rpProps, ok := props.(*ReverseProxyProperties)
	if !ok {
		t.Fatal("expected *ReverseProxyProperties")
	}
	if !rpProps.SSLTermination {
		t.Error("expected sslTermination true")
	}
	if rpProps.Replicas != 2 {
		t.Errorf("expected 2, got %d", rpProps.Replicas)
	}
}

func TestParseNodeProperties_LoadBalancer(t *testing.T) {
	node := SystemNode{
		ID: "1", ComponentType: "load_balancer", Label: "ALB",
		Properties: map[string]interface{}{"algorithm": "round_robin", "replicas": float64(3)},
	}
	props, err := ParseNodeProperties(node)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	lbProps, ok := props.(*LoadBalancerProperties)
	if !ok {
		t.Fatal("expected *LoadBalancerProperties")
	}
	if lbProps.Algorithm != "round_robin" {
		t.Errorf("expected round_robin, got %s", lbProps.Algorithm)
	}
}
