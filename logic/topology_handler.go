package logic

import (
	"fmt"
	"net/http"

	"github.com/architectmind/backend/model"
	"github.com/gin-gonic/gin"
)

// PostTopology receives a SystemTopology JSON payload, validates it,
// and returns a summary. This will later feed into the rule engine.
func PostTopology(c *gin.Context) {
	var topology model.SystemTopology
	if err := c.ShouldBindJSON(&topology); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("invalid payload: %v", err),
		})
		return
	}

	warnings := validate(topology)
	totalRules, rulesPassed := ComputeRulesPassed(warnings)

	c.JSON(http.StatusOK, AnalyzeResponse{
		Success:     true,
		NodeCount:   len(topology.Nodes),
		EdgeCount:   len(topology.Edges),
		TotalRules:  totalRules,
		RulesPassed: rulesPassed,
		Warnings:    warnings,
	})
}

// validate performs semantic checks and architecture linting on the topology.
func validate(t model.SystemTopology) []Warning {
	var warnings []Warning
	ctx := model.NewTopologyContext(t)

	// Schema validation
	for _, node := range ctx.Nodes {
		if !model.ValidComponentTypes[node.ComponentType] {
			warnings = append(warnings, Warning{
				Rule:     "schema",
				Message:  fmt.Sprintf("unknown component type %q on node %q", node.ComponentType, node.ID),
				Solution: "Please select a valid Component Type in the node properties.",
				NodeIDs:  []string{node.ID},
			})
		}
		// Validate all roles in merged nodes
		for _, role := range node.Roles {
			if !model.ValidComponentTypes[role] {
				warnings = append(warnings, Warning{
					Rule:     "schema",
					Message:  fmt.Sprintf("unknown role %q on node %q", role, node.ID),
					Solution: "Ensure all roles in the merged node are valid component types.",
					NodeIDs:  []string{node.ID},
				})
			}
		}
	}

	for _, edge := range ctx.Edges {
		if !model.ValidConnectionTypes[edge.ConnectionType] {
			warnings = append(warnings, Warning{
				Rule:     "schema",
				Message:  fmt.Sprintf("unknown connection type %q on edge %q", edge.ConnectionType, edge.ID),
				Solution: "Please select a valid Connection Type in the connection properties.",
				NodeIDs:  []string{},
			})
		}
		if _, ok := ctx.NodeByID[edge.Source]; !ok {
			warnings = append(warnings, Warning{
				Rule:     "schema",
				Message:  fmt.Sprintf("edge %q references unknown source node %q", edge.ID, edge.Source),
				Solution: "Ensure the source of the connection is a valid node.",
				NodeIDs:  []string{},
			})
		}
		if _, ok := ctx.NodeByID[edge.Target]; !ok {
			warnings = append(warnings, Warning{
				Rule:     "schema",
				Message:  fmt.Sprintf("edge %q references unknown target node %q", edge.ID, edge.Target),
				Solution: "Ensure the target of the connection is a valid node.",
				NodeIDs:  []string{},
			})
		}
	}

	warnings = append(warnings, checkSPOF(ctx)...)
	warnings = append(warnings, checkDBSelection(ctx)...)
	warnings = append(warnings, checkVerticalPartitioning(ctx)...)
	warnings = append(warnings, checkCacheConsistency(ctx)...)
	warnings = append(warnings, checkCAP(ctx)...)
	warnings = append(warnings, checkCDNUsage(ctx)...)
	warnings = append(warnings, checkAsyncDecoupling(ctx)...)
	warnings = append(warnings, checkEntryPointSPOF(ctx, "load_balancer", "lb_spof", "⚖️", "Load Balancer")...)
	warnings = append(warnings, checkReadWriteSeparation(ctx)...)
	warnings = append(warnings, checkCacheEviction(ctx)...)
	warnings = append(warnings, checkProtocolMismatch(ctx)...)
	warnings = append(warnings, checkConnectionTypeProtocolMismatch(ctx)...)
	warnings = append(warnings, checkMQConsumer(ctx)...)
	warnings = append(warnings, checkMQDLQ(ctx)...)
	warnings = append(warnings, checkAsyncPeakShaving(ctx)...)
	warnings = append(warnings, checkSyncUpload(ctx)...)
	warnings = append(warnings, checkInvalidConnection(ctx)...)
	warnings = append(warnings, checkEntryPointSPOF(ctx, "reverse_proxy", "reverse_proxy_spof", "🔀", "Reverse Proxy")...)
	warnings = append(warnings, checkReverseProxySSL(ctx)...)
	warnings = append(warnings, checkCDNOrigin(ctx)...)
	warnings = append(warnings, checkSyncChain(ctx)...)
	warnings = append(warnings, checkInternalHTTP(ctx)...)
	warnings = append(warnings, checkSearchDatabase(ctx)...)
	warnings = append(warnings, checkServiceDataSource(ctx)...)
	warnings = append(warnings, checkDatabasePerService(ctx)...)
	warnings = append(warnings, checkCacheOnly(ctx)...)
	warnings = append(warnings, checkMissingFirewall(ctx)...)
	warnings = append(warnings, checkMissingMonitor(ctx)...)
	warnings = append(warnings, checkFirewallMonitorMode(ctx)...)
	warnings = append(warnings, checkFirewallL3Only(ctx)...)
	warnings = append(warnings, checkIncompleteObservability(ctx)...)
	warnings = append(warnings, checkAlertingDisabled(ctx)...)
	warnings = append(warnings, checkServerlessReplicas(ctx)...)
	warnings = append(warnings, checkNoAutoScalingSingle(ctx)...)
	warnings = append(warnings, checkNoHealthCheckBehindLB(ctx)...)
	warnings = append(warnings, checkCapacity(ctx)...)

	return warnings
}
