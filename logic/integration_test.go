package logic

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/topology", PostTopology)
	return r
}

// --- Happy Path ---

func TestPostTopology_MinimalValid(t *testing.T) {
	body := map[string]interface{}{
		"id": "t1", "name": "Test", "version": 1,
		"nodes": []map[string]interface{}{
			{"id": "s1", "componentType": "service", "label": "API", "position": map[string]interface{}{"x": 0, "y": 0}},
		},
		"edges": []interface{}{},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp AnalyzeResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if !resp.Success {
		t.Error("expected success=true")
	}
	if resp.NodeCount != 1 {
		t.Errorf("expected nodeCount=1, got %d", resp.NodeCount)
	}
	if resp.EdgeCount != 0 {
		t.Errorf("expected edgeCount=0, got %d", resp.EdgeCount)
	}
}

func TestPostTopology_WithWarnings(t *testing.T) {
	body := map[string]interface{}{
		"id": "t1", "name": "Test", "version": 1,
		"nodes": []map[string]interface{}{
			{"id": "c1", "componentType": "client", "label": "Browser", "position": map[string]interface{}{"x": 0, "y": 0}},
			{"id": "db1", "componentType": "database", "label": "MySQL", "position": map[string]interface{}{"x": 100, "y": 0},
				"properties": map[string]interface{}{"dbType": "sql", "readWriteRatio": 0.5}},
		},
		"edges": []map[string]interface{}{
			{"id": "e1", "source": "c1", "target": "db1", "connectionType": "sync"},
		},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp AnalyzeResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Success {
		t.Error("expected success=true")
	}

	// Should at least have invalid_connection warning
	hasInvalidConn := false
	for _, warn := range resp.Warnings {
		if warn.Rule == "invalid_connection" {
			hasInvalidConn = true
			break
		}
	}
	if !hasInvalidConn {
		t.Error("expected invalid_connection warning")
	}
}

// --- Error Handling ---

func TestPostTopology_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPostTopology_MissingRequiredFields(t *testing.T) {
	body := map[string]interface{}{
		"name": "Test",
		// missing id, nodes
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestPostTopology_EmptyBody(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Schema validation ---

func TestPostTopology_UnknownComponentType(t *testing.T) {
	body := map[string]interface{}{
		"id": "t1", "name": "Test", "version": 1,
		"nodes": []map[string]interface{}{
			{"id": "n1", "componentType": "banana", "label": "Banana", "position": map[string]interface{}{"x": 0, "y": 0}},
		},
		"edges": []interface{}{},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	var resp AnalyzeResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	hasSchema := false
	for _, warn := range resp.Warnings {
		if warn.Rule == "schema" {
			hasSchema = true
			break
		}
	}
	if !hasSchema {
		t.Error("expected schema warning for unknown component type")
	}
}

func TestPostTopology_UnknownConnectionType(t *testing.T) {
	body := map[string]interface{}{
		"id": "t1", "name": "Test", "version": 1,
		"nodes": []map[string]interface{}{
			{"id": "s1", "componentType": "service", "label": "A", "position": map[string]interface{}{"x": 0, "y": 0}},
			{"id": "s2", "componentType": "service", "label": "B", "position": map[string]interface{}{"x": 100, "y": 0}},
		},
		"edges": []map[string]interface{}{
			{"id": "e1", "source": "s1", "target": "s2", "connectionType": "magic"},
		},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	var resp AnalyzeResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	hasSchema := false
	for _, warn := range resp.Warnings {
		if warn.Rule == "schema" {
			hasSchema = true
			break
		}
	}
	if !hasSchema {
		t.Error("expected schema warning for unknown connection type")
	}
}

// --- Full Scenario: Healthy Architecture ---

func TestPostTopology_HealthyArchitecture_NoWarnings(t *testing.T) {
	body := map[string]interface{}{
		"id": "t1", "name": "Healthy", "version": 1,
		"nodes": []map[string]interface{}{
			{"id": "c1", "componentType": "client", "label": "Browser", "position": map[string]interface{}{"x": 0, "y": 0}},
			{"id": "cdn1", "componentType": "cdn", "label": "CloudFront", "position": map[string]interface{}{"x": 100, "y": 0}},
			{"id": "fw1", "componentType": "firewall", "label": "WAF", "position": map[string]interface{}{"x": 200, "y": 0},
				"properties": map[string]interface{}{"mode": "inline", "layer": "l7"}},
			{"id": "lb1", "componentType": "load_balancer", "label": "ALB", "position": map[string]interface{}{"x": 300, "y": 0},
				"properties": map[string]interface{}{"replicas": float64(2)}},
			{"id": "s1", "componentType": "service", "label": "API-1", "position": map[string]interface{}{"x": 400, "y": 0},
				"properties": map[string]interface{}{"replicas": float64(2), "autoScaling": true, "healthCheck": true}},
			{"id": "s2", "componentType": "service", "label": "API-2", "position": map[string]interface{}{"x": 400, "y": 100},
				"properties": map[string]interface{}{"replicas": float64(2), "autoScaling": true, "healthCheck": true}},
			{"id": "cache1", "componentType": "cache", "label": "Redis", "position": map[string]interface{}{"x": 500, "y": 0},
				"properties": map[string]interface{}{"evictionPolicy": "lru", "ttlSeconds": float64(300)}},
			{"id": "db1", "componentType": "database", "label": "PostgreSQL", "position": map[string]interface{}{"x": 500, "y": 100},
				"properties": map[string]interface{}{"dbType": "sql", "readWriteRatio": 0.7}},
			{"id": "log1", "componentType": "monitor", "label": "Datadog", "position": map[string]interface{}{"x": 600, "y": 0},
				"properties": map[string]interface{}{"logType": "all", "alerting": true}},
		},
		"edges": []map[string]interface{}{
			{"id": "e1", "source": "c1", "target": "cdn1", "connectionType": "sync", "protocol": "https"},
			{"id": "e2", "source": "cdn1", "target": "fw1", "connectionType": "cdn_origin", "protocol": "https"},
			{"id": "e3", "source": "fw1", "target": "lb1", "connectionType": "sync"},
			{"id": "e4", "source": "lb1", "target": "s1", "connectionType": "sync"},
			{"id": "e5", "source": "lb1", "target": "s2", "connectionType": "sync"},
			{"id": "e6", "source": "s1", "target": "cache1", "connectionType": "sync", "protocol": "resp"},
			{"id": "e7", "source": "s1", "target": "db1", "connectionType": "sync", "protocol": "database"},
			{"id": "e8", "source": "s1", "target": "log1", "connectionType": "sync"},
			{"id": "e9", "source": "s2", "target": "cache1", "connectionType": "sync", "protocol": "resp"},
			{"id": "e10", "source": "s2", "target": "db1", "connectionType": "sync", "protocol": "database"},
		},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/topology", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	setupRouter().ServeHTTP(w, req)

	var resp AnalyzeResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Success {
		t.Error("expected success=true")
	}
	// A well-designed architecture should have minimal warnings
	if len(resp.Warnings) > 2 {
		t.Errorf("expected <=2 warnings for healthy arch, got %d:", len(resp.Warnings))
		for _, warn := range resp.Warnings {
			t.Logf("  - [%s] %s", warn.Rule, warn.Message)
		}
	}
}
