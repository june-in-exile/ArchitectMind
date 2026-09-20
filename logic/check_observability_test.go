package logic

import (
	"testing"

	"github.com/architectmind/backend/model"
)

// --- checkMissingMonitor ---

func TestCheckMissingMonitor_3Services_NoMonitor(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1": {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2": {ID: "s2", ComponentType: "service", Label: "Svc2"},
		"s3": {ID: "s3", ComponentType: "service", Label: "Svc3"},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkMissingMonitor(ctx)
	if len(w) != 1 || w[0].Rule != "missing_observability" {
		t.Errorf("expected 1 warning, got %d", len(w))
	}
}

func TestCheckMissingMonitor_2Services_NoMonitor(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1": {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2": {ID: "s2", ComponentType: "service", Label: "Svc2"},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkMissingMonitor(ctx)
	if len(w) != 1 || w[0].Rule != "missing_observability" {
		t.Errorf("expected 1 warning for services without monitor, got %d", len(w))
	}
}

func TestCheckMissingMonitor_MonitorNotConnected(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"log": {ID: "log", ComponentType: "monitor", Label: "ELK"},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkMissingMonitor(ctx)
	if len(w) != 1 || w[0].Rule != "incomplete_service_observability" {
		t.Errorf("expected 1 warning for disconnected service, got %d", len(w))
	}
}

func TestCheckMissingMonitor_PartialMonitorConnected(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2":  {ID: "s2", ComponentType: "service", Label: "Svc2"},
		"log": {ID: "log", ComponentType: "monitor", Label: "ELK"},
	}
	edges := []model.SystemEdge{
		{ID: "e1", Source: "s1", Target: "log", ConnectionType: "sync"},
	}
	ctx := makeCtx(nodes, edges)
	w := checkMissingMonitor(ctx)
	if len(w) != 1 || w[0].Rule != "incomplete_service_observability" {
		t.Errorf("expected 1 warning for partial connection, got %d", len(w))
	}
	if w[0].NodeIDs[0] != "s2" {
		t.Errorf("expected warning for s2, got %v", w[0].NodeIDs)
	}
}

func TestCheckMissingMonitor_MonitorAllConnected(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"log": {ID: "log", ComponentType: "monitor", Label: "ELK"},
	}
	edges := []model.SystemEdge{
		{ID: "e1", Source: "s1", Target: "log", ConnectionType: "sync"},
	}
	ctx := makeCtx(nodes, edges)
	w := checkMissingMonitor(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings, got %d", len(w))
	}
}

// --- checkIncompleteObservability ---

func TestCheckIncompleteObservability_MetricsOnly(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2":  {ID: "s2", ComponentType: "service", Label: "Svc2"},
		"s3":  {ID: "s3", ComponentType: "service", Label: "Svc3"},
		"log": {ID: "log", ComponentType: "monitor", Label: "Prometheus", Properties: map[string]interface{}{"logType": "metrics", "alerting": true}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkIncompleteObservability(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for metrics-only, got %d", len(w))
	}
}

func TestCheckIncompleteObservability_AllType_NoWarning(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2":  {ID: "s2", ComponentType: "service", Label: "Svc2"},
		"s3":  {ID: "s3", ComponentType: "service", Label: "Svc3"},
		"log": {ID: "log", ComponentType: "monitor", Label: "Datadog", Properties: map[string]interface{}{"logType": "all"}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkIncompleteObservability(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings for all type, got %d", len(w))
	}
}

func TestCheckIncompleteObservability_LogsOnly(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2":  {ID: "s2", ComponentType: "service", Label: "Svc2"},
		"s3":  {ID: "s3", ComponentType: "service", Label: "Svc3"},
		"log": {ID: "log", ComponentType: "monitor", Label: "ELK", Properties: map[string]interface{}{"logType": "logs"}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkIncompleteObservability(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for logs-only, got %d", len(w))
	}
}

func TestCheckIncompleteObservability_TracesOnly(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"s1":  {ID: "s1", ComponentType: "service", Label: "Svc1"},
		"s2":  {ID: "s2", ComponentType: "service", Label: "Svc2"},
		"s3":  {ID: "s3", ComponentType: "service", Label: "Svc3"},
		"log": {ID: "log", ComponentType: "monitor", Label: "Jaeger", Properties: map[string]interface{}{"logType": "traces"}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkIncompleteObservability(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning for traces-only, got %d", len(w))
	}
}

// --- checkAlertingDisabled ---

func TestCheckAlertingDisabled_Off(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"log": {ID: "log", ComponentType: "monitor", Label: "ELK", Properties: map[string]interface{}{"logType": "all", "alerting": false}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkAlertingDisabled(ctx)
	if len(w) != 1 {
		t.Errorf("expected 1 warning, got %d", len(w))
	}
}

func TestCheckAlertingDisabled_On_NoWarning(t *testing.T) {
	nodes := map[string]model.SystemNode{
		"log": {ID: "log", ComponentType: "monitor", Label: "ELK", Properties: map[string]interface{}{"logType": "all", "alerting": true}},
	}
	ctx := makeCtx(nodes, []model.SystemEdge{})
	w := checkAlertingDisabled(ctx)
	if len(w) != 0 {
		t.Errorf("expected 0 warnings, got %d", len(w))
	}
}
