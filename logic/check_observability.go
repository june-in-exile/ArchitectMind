package logic

import (
	"fmt"
	"github.com/architectmind/backend/model"
)

// checkMissingMonitor warns if any Service is NOT connected to a Monitor.
func checkMissingMonitor(ctx model.TopologyContext) []Warning {
	var serviceNodes []model.SystemNode
	var monitorIDs []string

	for _, node := range ctx.Nodes {
		if model.NodeHasRole(node, "service") {
			serviceNodes = append(serviceNodes, node)
		}
		if model.NodeHasRole(node, "monitor") || model.NodeHasRole(node, "monitor") {
			monitorIDs = append(monitorIDs, node.ID)
		}
	}

	if len(serviceNodes) == 0 {
		return nil
	}

	// Map of monitor IDs for quick lookup
	isMonitor := make(map[string]bool)
	for _, id := range monitorIDs {
		isMonitor[id] = true
	}

	var disconnectedServices []model.SystemNode
	for _, svc := range serviceNodes {
		connected := false
		targets := ctx.Outgoing[svc.ID]
		for _, targetID := range targets {
			if isMonitor[targetID] {
				connected = true
				break
			}
		}
		if !connected {
			disconnectedServices = append(disconnectedServices, svc)
		}
	}

	if len(disconnectedServices) > 0 {
		if len(monitorIDs) == 0 {
			// No monitor exists at all
			var nodeIDs []string
			for i, svc := range disconnectedServices {
				if i >= 3 {
					break
				}
				nodeIDs = append(nodeIDs, svc.ID)
			}
			return []Warning{{
				Rule:     "missing_observability",
				Message:  "📊 Missing Monitor: Services exist in the architecture, but no Monitor nodes are present.",
				Solution: "Consider adding a Monitor node (e.g., ELK Stack, Prometheus) and connecting all Services to it to collect observational data.",
				NodeIDs:  nodeIDs,
			}}
		} else {
			// Monitor exists but some services are not connected
			var nodeIDs []string
			var labels []string
			for i, svc := range disconnectedServices {
				nodeIDs = append(nodeIDs, svc.ID)
				if i < 3 {
					labels = append(labels, svc.Label)
				}
			}
			msg := fmt.Sprintf("📊 Missing Observability: Service %s and others are not connected to a Monitor.", joinLabels(labels))
			if len(disconnectedServices) == 1 {
				msg = fmt.Sprintf("📊 Missing Observability: Service %q is not connected to a Monitor.", disconnectedServices[0].Label)
			}

			return []Warning{{
				Rule:     "incomplete_service_observability",
				Message:  msg,
				Solution: "Please connect these Services to a Monitor node to ensure full monitoring and debugging capabilities.",
				NodeIDs:  nodeIDs,
			}}
		}
	}

	return nil
}

// checkIncompleteObservability warns if a Monitor collects only partial telemetry
// in an architecture with 3+ services.
func checkIncompleteObservability(ctx model.TopologyContext) []Warning {
	serviceCount := 0
	for _, node := range ctx.Nodes {
		if model.NodeHasRole(node, "service") {
			serviceCount++
		}
	}
	if serviceCount < 3 {
		return nil
	}

	var warnings []Warning
	for _, node := range ctx.Nodes {
		if !model.NodeHasRole(node, "monitor") {
			continue
		}
		props, err := model.ParseNodeProperties(node)
		if err != nil {
			continue
		}
		logProps, ok := props.(*model.MonitorProperties)
		if !ok {
			continue
		}
		if logProps.LogType == "all" || logProps.LogType == "" {
			continue
		}
		if logProps.LogType == "metrics" {
			warnings = append(warnings, Warning{
				Rule:     "incomplete_observability",
				Message:  fmt.Sprintf("📊 Incomplete Observability: %q only collects Metrics, lacking Logs and Traces. Without distributed tracing in a microservices architecture, identifying performance bottlenecks across services is difficult.", node.Label),
				Solution: "Consider setting logType to 'All' or adding Traces-type Monitors (e.g., Jaeger) to achieve complete observability.",
				NodeIDs:  []string{node.ID},
			})
		} else if logProps.LogType == "logs" {
			warnings = append(warnings, Warning{
				Rule:     "incomplete_observability",
				Message:  fmt.Sprintf("📊 Incomplete Observability: %q only collects Logs, lacking Metrics and Traces. Without Metrics, effective alerting rules cannot be set.", node.Label),
				Solution: "Consider setting logType to 'All' or adding Metrics-type Monitors (e.g., Prometheus).",
				NodeIDs:  []string{node.ID},
			})
		} else if logProps.LogType == "traces" {
			warnings = append(warnings, Warning{
				Rule:     "incomplete_observability",
				Message:  fmt.Sprintf("📊 Incomplete Observability: %q only collects Traces, lacking Metrics and Logs. Comprehensive diagnosis will be impossible without Metrics and Logs.", node.Label),
				Solution: "Consider setting logType to 'All' or adding both Metrics and Logs-type Monitors.",
				NodeIDs:  []string{node.ID},
			})
		}
	}
	return warnings
}

// checkAlertingDisabled warns if a Monitor node has alerting turned off.
func checkAlertingDisabled(ctx model.TopologyContext) []Warning {
	var warnings []Warning
	for _, node := range ctx.Nodes {
		if !model.NodeHasRole(node, "monitor") {
			continue
		}
		props, err := model.ParseNodeProperties(node)
		if err != nil {
			continue
		}
		logProps, ok := props.(*model.MonitorProperties)
		if !ok {
			continue
		}
		if !logProps.Alerting {
			warnings = append(warnings, Warning{
				Rule:     "alerting_disabled",
				Message:  fmt.Sprintf("🔔 Alerting Disabled: %q has alerting turned off. You will not receive timely notifications when issues occur, and will have to rely on manual checks.", node.Label),
				Solution: "It is recommended to enable alerting and configure notification channels (e.g., Slack, PagerDuty, Email) with threshold triggers for critical metrics.",
				NodeIDs:  []string{node.ID},
			})
		}
	}
	return warnings
}
