import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  SelectionMode,
  MarkerType,
  type OnConnect,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import ArchitectureNode from '../nodes/ArchitectureNode'
import HandDrawnEdge from '../edges/HandDrawnEdge'
import ComponentPropertyPanel from './ComponentPropertyPanel'
import EdgePropertyPanel from './EdgePropertyPanel'
import SystemParamsPanel from './SystemParamsPanel'
import ToolbarButton from './ToolbarButton'
import SettingsMenu from './SettingsMenu'
import { NODE_TYPE_CONFIG } from '../nodes/nodeConfig'
import { analyzeTopology } from '../api/topologyApi'
import type {
  ComponentType,
  SystemTopology,
  SystemParams,
  AnalyzeResponse,
  Warning,
} from '../types/topology'

const nodeTypes = {
  architecture: ArchitectureNode,
}

const edgeTypes = {
  handdrawn: HandDrawnEdge,
}

let nodeIdCounter = 0
function generateNodeId(): string {
  nodeIdCounter += 1
  return `node-${nodeIdCounter}`
}

interface CanvasProps {
  theme: 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk';
  setTheme: (theme: 'light' | 'dark' | 'warm' | 'dream' | 'cyberpunk') => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onStateChange?: (nodes: Node[], edges: Edge[]) => void;
}

const PROTOCOL_LABELS: Record<string, string> = {
  http: 'HTTP',
  https: 'HTTPS',
  grpc: 'gRPC',
  websocket: 'WebSocket',
  ssh: 'SSH',
  tcp: 'TCP',
  udp: 'UDP',
  amqp: 'AMQP',
  mqtt: 'MQTT',
  database: 'Database',
  dns: 'DNS',
}

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  sync: 'Sync',
  async: 'Async',
  replication: 'Replication',
  cdn_origin: 'CDN Origin',
  unspecified: '',
}

function Canvas({ theme, setTheme, initialNodes = [], initialEdges = [], onStateChange }: CanvasProps) {
  const isDarkMode = theme === 'dark' || theme === 'cyberpunk'
  const isWarmMode = theme === 'warm'
  const isDreamMode = theme === 'dream'
  const isCyberPunk = theme === 'cyberpunk'
  
  const defaultEdgeColor = isCyberPunk ? '#E8D44A' : isDarkMode ? '#d1d5db' : isWarmMode ? '#6B543D' : isDreamMode ? '#83A2FE' : '#b1b1b7'
  const defaultLabelBg = isCyberPunk ? '#0a0a0c' : isDarkMode ? '#1f2937' : isWarmMode ? '#EBE4D1' : isDreamMode ? '#F5F3FF' : '#ffffff'
  const gridColor = isCyberPunk ? '#bc00ff' : isDarkMode ? '#444' : isWarmMode ? '#D6C2A1' : isDreamMode ? '#DBC5FC' : '#ccc'
  const tooltipBg = isCyberPunk ? '#0f0f0f' : isDarkMode ? '#1e293b' : isWarmMode ? '#EBD8C7' : isDreamMode ? '#ECB2FF' : '#f1f5f9'
  const tooltipHover = isCyberPunk ? '#1a1a1a' : isDarkMode ? '#1e293b' : isWarmMode ? '#EBE2A4' : isDreamMode ? '#DBC5FC' : '#f8fafc'

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(
    null
  )
  const [analyzing, setAnalyzing] = useState(false)
  const [showWarnings, setShowWarnings] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const presetsRef = useRef<HTMLDivElement>(null)
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set())
  const [systemParams, setSystemParams] = useState<SystemParams>({})

  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)

  const [panelHeight, setPanelHeight] = useState(250)
  const [propertyPanelWidth, setPropertyPanelWidth] = useState(300)
  const [showPropertyPanel, setShowPropertyPanel] = useState(true)
  const isDraggingRef = useRef(false)
  const panelHeightRef = useRef(250)

  useEffect(() => {
    panelHeightRef.current = panelHeight
  }, [panelHeight])

  useEffect(() => {
    if (!showPresets) return
    const handleClickOutside = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as HTMLElement)) {
        setShowPresets(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [showPresets])

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    const startY = e.clientY
    const startHeight = panelHeightRef.current

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = startY - moveEvent.clientY
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight + delta))
      setPanelHeight(newHeight)
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'default'
    }

    document.body.style.cursor = 'row-resize'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([])
  const redoRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([])
  const isUndoRedoRef = useRef(false)
  const prevNodesRef = useRef<Node[]>([])
  const prevEdgesRef = useRef<Edge[]>([])

  const MAX_HISTORY = 20

  const buildWarningsByNode = useCallback((warnings: Warning[]): Map<string, Warning[]> => {
    const map = new Map<string, Warning[]>()
    for (const w of warnings) {
      for (const nodeId of w.nodeIds) {
        const existing = map.get(nodeId) ?? []
        map.set(nodeId, [...existing, w])
      }
    }
    return map
  }, [])

  const activeWarnings = useMemo(() => {
    if (!analysisResult?.warnings) return []
    return analysisResult.warnings.filter((_, idx) => !dismissedWarnings.has(idx))
  }, [analysisResult?.warnings, dismissedWarnings])

  const warningsByNode = useMemo(
    () => buildWarningsByNode(activeWarnings),
    [activeWarnings, buildWarningsByNode]
  )

  const fitViewToNode = useCallback((nodeId: string) => {
    if (!rfInstance) return
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    
    rfInstance.fitView({
      nodes: [{ id: nodeId, position: node.position }],
      padding: 0.5,
      duration: 300,
    })
    setSelectedNodeId(nodeId)
  }, [rfInstance, nodes])

  useEffect(() => {
    if (isUndoRedoRef.current) return
    
    const currentNodeIds = new Set(nodes.map(n => n.id))
    const prevNodeIds = new Set(prevNodesRef.current.map(n => n.id))
    const currentEdgeIds = new Set(edges.map(e => e.id))
    const prevEdgeIds = new Set(prevEdgesRef.current.map(e => e.id))
    
    const nodeAdded = nodes.length > prevNodesRef.current.length
    const nodeRemoved = prevNodeIds.size > currentNodeIds.size
    const edgeAdded = edges.length > prevEdgesRef.current.length
    const edgeRemoved = prevEdgeIds.size > currentEdgeIds.size
    
    if (nodeAdded || nodeRemoved || edgeAdded || edgeRemoved) {
      historyRef.current.push({
        nodes: [...prevNodesRef.current],
        edges: [...prevEdgesRef.current]
      })
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift()
      }
      redoRef.current = []
    }
    
    prevNodesRef.current = [...nodes]
    prevEdgesRef.current = [...edges]

    if (onStateChange) {
      onStateChange(nodes, edges)
    }
  }, [nodes, edges, onStateChange])

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) return
    historyRef.current.push({ nodes: [...nodes], edges: [...edges] })
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift()
    }
    redoRef.current = []
  }, [nodes, edges])

  const copyToClipboard = useCallback(() => {
    if (selectedNodeIds.length === 0) return

    const nodesToCopy = nodes.filter(n => selectedNodeIds.includes(n.id))
    const edgesToCopy = edges.filter(e => 
      selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    )

    setClipboard({
      nodes: JSON.parse(JSON.stringify(nodesToCopy)),
      edges: JSON.parse(JSON.stringify(edgesToCopy)),
    })
  }, [nodes, edges, selectedNodeIds])

  const pasteFromClipboard = useCallback(() => {
    if (!clipboard) return

    pushHistory()

    const idMap = new Map<string, string>()
    const offset = { x: 40, y: 40 }

    const newNodes = clipboard.nodes.map(node => {
      const newNodeId = generateNodeId()
      idMap.set(node.id, newNodeId)
      return {
        ...node,
        id: newNodeId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        selected: true,
      }
    })

    const newEdges = clipboard.edges.map(edge => {
      const newSource = idMap.get(edge.source) || edge.source
      const newTarget = idMap.get(edge.target) || edge.target
      const newEdgeId = `edge-${newSource}-${newTarget}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      
      return {
        ...edge,
        id: newEdgeId,
        source: newSource,
        target: newTarget,
        selected: true,
      }
    })

    setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNodes))
    setEdges(eds => eds.map(e => ({ ...e, selected: false })).concat(newEdges))
    
    const newNodeIds = newNodes.map(n => n.id)
    setSelectedNodeIds(newNodeIds)
    if (newNodeIds.length > 0) setSelectedNodeId(newNodeIds[0])
    
    // Update clipboard with new positions so consecutive pastes are offset
    setClipboard({
      nodes: newNodes,
      edges: newEdges,
    })
  }, [clipboard, pushHistory, setNodes, setEdges])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return

    isUndoRedoRef.current = true
    redoRef.current.push({ nodes: [...nodes], edges: [...edges] })
    const previousState = historyRef.current.pop()
    if (previousState) {
      setNodes(previousState.nodes)
      setEdges(previousState.edges)
    }
    setTimeout(() => { isUndoRedoRef.current = false }, 0)
  }, [nodes, edges, setNodes, setEdges])

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return

    isUndoRedoRef.current = true
    historyRef.current.push({ nodes: [...nodes], edges: [...edges] })
    const nextState = redoRef.current.pop()
    if (nextState) {
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
    }
    setTimeout(() => { isUndoRedoRef.current = false }, 0)
  }, [nodes, edges, setNodes, setEdges])

  // Auto-show warnings panel when analysis returns warnings
  useEffect(() => {
    if (!analyzing && analysisResult?.warnings && analysisResult.warnings.length > 0) {
      setShowWarnings(true)
    }
  }, [analyzing, analysisResult])

  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id))
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  const duplicateNodes = useCallback((nodeIds: string[], offset = { x: 50, y: 50 }, selectNew = true) => {
    if (nodeIds.length === 0) return
    
    pushHistory()
    
    const idMap = new Map<string, string>()
    const newNodes: Node[] = []
    
    // We need current nodes and edges to perform the duplication
    // Using functional updates to ensure we have the latest state if needed, 
    // but here we can just use the state from the closure as it's stable enough for the start of a drag.
    
    // 1. Duplicate Nodes
    nodes.forEach(node => {
      if (nodeIds.includes(node.id)) {
        const newNodeId = generateNodeId()
        idMap.set(node.id, newNodeId)
        
        const data = node.data as Record<string, unknown>
        newNodes.push({
          ...node,
          id: newNodeId,
          position: {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
          selected: selectNew,
          data: {
            ...data,
            properties: { ...(data.properties as Record<string, unknown>) },
          }
        })
      }
    })
    
    // 2. Duplicate Edges
    const newEdges: Edge[] = []
    edges.forEach(edge => {
      const sourceIsDuplicated = idMap.has(edge.source)
      const targetIsDuplicated = idMap.has(edge.target)
      
      if (sourceIsDuplicated || targetIsDuplicated) {
        const newSource = sourceIsDuplicated ? idMap.get(edge.source)! : edge.source
        const newTarget = targetIsDuplicated ? idMap.get(edge.target)! : edge.target
        
        const newEdgeId = `edge-${newSource}-${newTarget}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        
        newEdges.push({
          ...edge,
          id: newEdgeId,
          source: newSource,
          target: newTarget,
          selected: selectNew,
        })
      }
    })

    if (selectNew) {
      setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNodes.map(n => ({ ...n, selected: false }))))
      setEdges(eds => eds.map(e => ({ ...e, selected: false })).concat(newEdges.map(e => ({ ...e, selected: false }))))
      
      const newNodeIds = newNodes.map(n => n.id)
      setSelectedNodeIds(newNodeIds)
      if (newNodeIds.length > 0) setSelectedNodeId(newNodeIds[0])
    } else {
      setNodes(nds => [...nds, ...newNodes])
      setEdges(eds => [...eds, ...newEdges])
    }
  }, [nodes, edges, pushHistory, setNodes, setEdges])

  const onNodeDragStart = useCallback((event: React.MouseEvent, _node: Node) => {
    if (event.shiftKey) {
      // Duplicate all selected nodes (fall back to the dragged node if none selected)
      const draggedNodeIds = selectedNodeIds.length > 0 && selectedNodeIds.includes(_node.id)
        ? selectedNodeIds
        : [_node.id]
      duplicateNodes(draggedNodeIds, { x: 0, y: 0 }, false)

      // Shift+click may toggle selection — re-select all dragged nodes
      const draggedSet = new Set(draggedNodeIds)
      requestAnimationFrame(() => {
        setNodes(nds => nds.map(n => ({
          ...n,
          selected: draggedSet.has(n.id) ? true : n.selected,
        })))
      })
    }
  }, [duplicateNodes, selectedNodeIds, setNodes])

  const canMerge = selectedNodeIds.length === 2
  const selectedNodeForSplit = selectedNodes.length > 0 ? selectedNodes[0] : null
  const selectedNodeForSplitData = selectedNodeForSplit
    ? ((selectedNodeForSplit.data as Record<string, unknown>).roles as ComponentType[] | undefined)
    : undefined
  const canSplit = selectedNodeForSplitData && selectedNodeForSplitData.length > 1

  const mergeSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length !== 2) return
    const [primaryId, secondaryId] = selectedNodeIds
    const primary = nodes.find(n => n.id === primaryId)
    const secondary = nodes.find(n => n.id === secondaryId)
    if (!primary || !secondary) return

    pushHistory()

    const primaryData = primary.data as Record<string, unknown>
    const secondaryData = secondary.data as Record<string, unknown>
    const primaryType = primaryData.componentType as ComponentType
    const secondaryType = secondaryData.componentType as ComponentType
    const primaryRoles = (primaryData.roles as ComponentType[] | undefined) ?? [primaryType]
    const secondaryRoles = (secondaryData.roles as ComponentType[] | undefined) ?? [secondaryType]

    // Union of roles (deduplicated)
    const mergedRoles = [...new Set([...primaryRoles, ...secondaryRoles])]

    // Merge properties: union, shared keys use primary's value except replicas (take max)
    const primaryProps = (primaryData.properties as Record<string, unknown>) ?? {}
    const secondaryProps = (secondaryData.properties as Record<string, unknown>) ?? {}
    const mergedProps = { ...secondaryProps, ...primaryProps }
    const primaryReplicas = (primaryProps.replicas as number) ?? 1
    const secondaryReplicas = (secondaryProps.replicas as number) ?? 1
    if (primaryReplicas > 1 || secondaryReplicas > 1) {
      mergedProps.replicas = Math.max(primaryReplicas, secondaryReplicas)
    }

    const mergedData = {
      ...primaryData,
      label: `${primaryData.label}`,
      roles: mergedRoles,
      properties: mergedProps,
      mergedFrom: {
        primary: { id: primaryId, data: primaryData, position: primary.position },
        secondary: { id: secondaryId, data: secondaryData, position: secondary.position },
      },
    }

    // Update primary node with merged data
    setNodes(nds => nds
      .filter(n => n.id !== secondaryId)
      .map(n => n.id === primaryId ? { ...n, data: mergedData } : n)
    )

    // Re-route edges from secondary to primary, remove duplicate edges between them
    setEdges(eds => {
      const rerouted = eds
        .filter(e => !(
          (e.source === primaryId && e.target === secondaryId) ||
          (e.source === secondaryId && e.target === primaryId)
        ))
        .map(e => {
          const newEdge = { ...e }
          if (e.source === secondaryId) {
            newEdge.source = primaryId
            newEdge.id = `edge-${primaryId}-${e.target}-merged`
          }
          if (e.target === secondaryId) {
            newEdge.target = primaryId
            newEdge.id = `edge-${e.source}-${primaryId}-merged`
          }
          return newEdge
        })

      // Deduplicate edges (same source+target)
      const seen = new Set<string>()
      return rerouted.filter(e => {
        const key = `${e.source}-${e.target}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    })

    setSelectedNodeIds([primaryId])
    setSelectedNodeId(primaryId)
  }, [selectedNodeIds, nodes, pushHistory, setNodes, setEdges])

  const splitSelectedNode = useCallback(() => {
    if (!selectedNodeForSplit) return
    const data = selectedNodeForSplit.data as Record<string, unknown>
    const mergedFrom = data.mergedFrom as {
      primary: { id: string; data: Record<string, unknown>; position: { x: number; y: number } }
      secondary: { id: string; data: Record<string, unknown>; position: { x: number; y: number } }
    } | undefined

    if (!mergedFrom) return

    pushHistory()

    // Restore original nodes
    const restoredPrimary: Node = {
      id: mergedFrom.primary.id,
      type: 'architecture',
      position: mergedFrom.primary.position,
      data: mergedFrom.primary.data,
    }
    const restoredSecondary: Node = {
      id: mergedFrom.secondary.id,
      type: 'architecture',
      position: mergedFrom.secondary.position,
      data: mergedFrom.secondary.data,
    }

    setNodes(nds => [
      ...nds.filter(n => n.id !== selectedNodeForSplit.id),
      restoredPrimary,
      restoredSecondary,
    ])

    // Restore edges: redirect merged edges back
    setEdges(eds => eds.map(e => {
      if (e.source === selectedNodeForSplit.id && e.id.endsWith('-merged')) {
        return { ...e, source: mergedFrom.primary.id, id: e.id.replace('-merged', '') }
      }
      if (e.target === selectedNodeForSplit.id && e.id.endsWith('-merged')) {
        return { ...e, target: mergedFrom.primary.id, id: e.id.replace('-merged', '') }
      }
      return e
    }))

    setSelectedNodeId(null)
    setSelectedNodeIds([])
  }, [selectedNodeForSplit, pushHistory, setNodes, setEdges])

  const onNodeDataChange = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      pushHistory()
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: newData } : node
        )
      )
    },
    [setNodes, pushHistory]
  )

  const onEdgeDataChange = useCallback(
    (edgeId: string, partialData: Record<string, unknown>) => {
      pushHistory()
      setEdges((eds) => {
        const targetEdge = eds.find(e => e.id === edgeId)
        const isSelected = targetEdge?.selected || false;
        return eds.map((edge) => {
          let apply = false;
          if (isSelected) {
            if (edge.id === edgeId) apply = true;
            else if (edge.selected) {
              apply = selectedNodeIds.length >= 2 
                ? (selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target))
                : true;
            }
          } else {
            apply = edge.id === edgeId;
          }
          return apply ? { ...edge, data: { ...(edge.data as Record<string, unknown>), ...partialData } } : edge;
        });
      })
    },
    [setEdges, pushHistory, selectedNodeIds]
  )

  const onEdgeAnimatedChange = useCallback(
    (edgeId: string, animated: boolean) => {
      pushHistory()
      setEdges((eds) => {
        const targetEdge = eds.find(e => e.id === edgeId)
        const isSelected = targetEdge?.selected || false;
        return eds.map((edge) => {
          let apply = false;
          if (isSelected) {
            if (edge.id === edgeId) apply = true;
            else if (edge.selected) {
              apply = selectedNodeIds.length >= 2 
                ? (selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target))
                : true;
            }
          } else {
            apply = edge.id === edgeId;
          }
          return apply ? { ...edge, animated } : edge;
        });
      })
    },
    [setEdges, pushHistory, selectedNodeIds]
  )

  const onEdgeDirectionChange = useCallback(
    (edgeId: string, direction: 'uni' | 'bi' | 'none') => {
      pushHistory()
      setEdges((eds) => {
        const targetEdge = eds.find(e => e.id === edgeId)
        const isSelected = targetEdge?.selected || false;
        return eds.map((edge) => {
          let apply = false;
          if (isSelected) {
            if (edge.id === edgeId) apply = true;
            else if (edge.selected) {
              apply = selectedNodeIds.length >= 2 
                ? (selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target))
                : true;
            }
          } else {
            apply = edge.id === edgeId;
          }
          if (!apply) return edge;
          
          const color = defaultEdgeColor
          let markerEnd: Edge['markerEnd'] = undefined
          let markerStart: Edge['markerStart'] = undefined
          
          if (direction === 'uni') {
            markerEnd = { type: MarkerType.ArrowClosed, color }
          } else if (direction === 'bi') {
            markerEnd = { type: MarkerType.ArrowClosed, color }
            markerStart = { type: MarkerType.ArrowClosed, color }
          }
          
          return {
            ...edge,
            data: { ...(edge.data as Record<string, unknown>), direction },
            markerEnd,
            markerStart,
          }
        });
      })
    },
    [setEdges, pushHistory, theme, selectedNodeIds]
  )

  const onEdgeReverse = useCallback(
    (edgeId: string) => {
      pushHistory()
      setEdges((eds) => {
        const targetEdge = eds.find(e => e.id === edgeId)
        const isSelected = targetEdge?.selected || false;
        return eds.map((edge) => {
          let apply = false;
          if (isSelected) {
            if (edge.id === edgeId) apply = true;
            else if (edge.selected) {
              apply = selectedNodeIds.length >= 2 
                ? (selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target))
                : true;
            }
          } else {
            apply = edge.id === edgeId;
          }
          if (!apply) return edge;
          
          const oldSourceHandle = edge.sourceHandle ?? ''
          const oldTargetHandle = edge.targetHandle ?? ''
          return {
            ...edge,
            source: edge.target,
            target: edge.source,
            sourceHandle: oldTargetHandle.replace('-target', '-source'),
            targetHandle: oldSourceHandle.replace('-source', '-target'),
          }
        });
      })
    },
    [setEdges, pushHistory, selectedNodeIds]
  )

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
    const nodeIds = selectedNodes.map(n => n.id)
    const nodeIdSet = new Set(nodeIds)
    setSelectedNodeIds(nodeIds)
    setSelectedNodeId(nodeIds.length > 0 ? nodeIds[0] : null)

    if (nodeIds.length === 0) {
      // No nodes selected — edges were explicitly selected
      setSelectedEdgeId(selectedEdges.length > 0 ? selectedEdges[0].id : null)
    } else {
      // Auto-select edges where both endpoints are selected, deselect the rest
      setEdges(eds => eds.map(e => ({
        ...e,
        selected: nodeIdSet.has(e.source) && nodeIdSet.has(e.target),
      })))
      setSelectedEdgeId(null)
    }

    // Automatically show the property panel when something is selected
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      setShowPropertyPanel(true)
    }
  }, [setShowPropertyPanel, setEdges])

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target) return
      pushHistory()
      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'handdrawn',
        data: { connectionType: 'unspecified', protocol: '', direction: 'uni' },
        style: { stroke: defaultEdgeColor, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: defaultEdgeColor },
        animated: false,
      }
      setEdges((eds) => [...eds, newEdge])
    },
    [setEdges, theme, pushHistory]
  )

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = new Set(deletedNodes.map((n) => n.id))
      setEdges((eds) =>
        eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
      )
      if (selectedNodeId && deletedIds.has(selectedNodeId)) {
        setSelectedNodeId(null)
      }
    },
    [setEdges, selectedNodeId]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const componentType = event.dataTransfer.getData(
        'application/architectmind'
      ) as ComponentType

      if (!componentType || !NODE_TYPE_CONFIG[componentType]) return
      if (!rfInstance || !reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      pushHistory()
      const config = NODE_TYPE_CONFIG[componentType]
      const newNode: Node = {
        id: generateNodeId(),
        type: 'architecture',
        position,
        data: {
          label: config.label,
          componentType,
          properties: { ...config.defaultProperties },
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [rfInstance, setNodes, pushHistory]
  )

  const isAnalyzingRef = useRef(false)

  const handleAnalyze = useCallback(async () => {
    if (nodes.length === 0 || isAnalyzingRef.current) return

    isAnalyzingRef.current = true
    setAnalyzing(true)
    setDismissedWarnings(new Set()) // Reset dismissed warnings for new analysis
    try {
      const hasParams = Object.values(systemParams).some(v => v !== undefined && v !== '' && v !== 0)
      const topology: SystemTopology = {
        id: 'current-design',
        name: 'Untitled Design',
        version: 1,
        nodes: nodes.map((n) => {
          const data = n.data as Record<string, unknown>
          const roles = data.roles as ComponentType[] | undefined
          return {
            id: n.id,
            componentType: data.componentType as ComponentType,
            label: data.label as string,
            position: n.position,
            properties:
              (data.properties as Record<string, unknown>) ?? {},
            ...(roles && roles.length > 1 ? { roles } : {}),
          }
        }),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          connectionType:
            ((e.data as Record<string, unknown>)?.connectionType as string ??
            'sync') as SystemTopology['edges'][number]['connectionType'],
          protocol:
            ((e.data as Record<string, unknown>)?.protocol as string ??
            '') as SystemTopology['edges'][number]['protocol'],
        })),
        ...(hasParams ? { params: systemParams } : {}),
      }

      const result = await analyzeTopology(topology)
      setAnalysisResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed'
      setAnalysisResult({
        success: false,
        nodeCount: 0,
        edgeCount: 0,
        totalRules: 0,
        rulesPassed: 0,
        warnings: [
          { rule: 'error', message, solution: 'Please ensure the backend service is running and try again.', nodeIds: [] } as Warning,
        ],
      })
    } finally {
      isAnalyzingRef.current = false
      setAnalyzing(false)
    }
  }, [nodes, edges, systemParams])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      
      if (isInput) return

      if (e.ctrlKey && e.key === 'a' || (e.metaKey && e.key === 'a')) {
        e.preventDefault()
        setNodes((nds) => nds.map((node) => ({ ...node, selected: true })))
        setEdges((eds) => eds.map((edge) => ({ ...edge, selected: true })))
        
        const allNodeIds = nodes.map(n => n.id)
        setSelectedNodeIds(allNodeIds)
        if (allNodeIds.length > 0) setSelectedNodeId(allNodeIds[0])
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        // Only prevent default if we actually copied something
        if (selectedNodeIds.length > 0) {
          e.preventDefault()
          copyToClipboard()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (clipboard) {
          e.preventDefault()
          pasteFromClipboard()
        }
      }
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault()
        if (canMerge) mergeSelectedNodes()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canMerge, mergeSelectedNodes, copyToClipboard, pasteFromClipboard, selectedNodeIds, clipboard, nodes.length])

  // Auto-analyze whenever the topology or system parameters change
  useEffect(() => {
    // If there are no nodes, clear the analysis result
    if (nodes.length === 0) {
      setAnalysisResult(null)
      return
    }

    // Use a debounce timer to avoid excessive analysis requests during rapid changes
    const timer = setTimeout(() => {
      handleAnalyze()
    }, 800)

    return () => clearTimeout(timer)
  }, [nodes, systemParams, handleAnalyze])

  const handleDemo = useCallback(() => {
    pushHistory()
    
    const demoNodes: Node[] = [
      { id: 'demo-client', type: 'architecture', position: { x: 400, y: 50 }, data: { label: 'Client', componentType: 'client', properties: {} } },
      { id: 'demo-dns', type: 'architecture', position: { x: 700, y: 50 }, data: { label: 'DNS', componentType: 'dns', properties: {} } },
      { id: 'demo-firewall', type: 'architecture', position: { x: 400, y: 250 }, data: { label: 'Firewall', componentType: 'firewall', properties: { mode: 'inline' } } },
      { id: 'demo-cdn', type: 'architecture', position: { x: 650, y: 450 }, data: { label: 'CDN', componentType: 'cdn', properties: {} } },
      { id: 'demo-lb', type: 'architecture', position: { x: 400, y: 450 }, data: { label: 'Load Balancer', componentType: 'load_balancer', properties: { algorithm: 'round_robin', layer: 'l7' } } },
      { id: 'demo-reverse-proxy', type: 'architecture', position: { x: 400, y: 650 }, data: { label: 'Reverse Proxy', componentType: 'reverse_proxy', properties: { product: 'nginx', sslTermination: true } } },
      { id: 'demo-apigw', type: 'architecture', position: { x: 400, y: 850 }, data: { label: 'API Gateway', componentType: 'api_gateway', properties: { rateLimit: 1000, authEnabled: true } } },
      { id: 'demo-service', type: 'architecture', position: { x: 400, y: 1050 }, data: { label: 'Service', componentType: 'service', properties: { replicas: 3 } } },
      { id: 'demo-mq', type: 'architecture', position: { x: 700, y: 1050 }, data: { label: 'Message Queue', componentType: 'message_queue', properties: { queueType: 'kafka' } } },
      { id: 'demo-db-master', type: 'architecture', position: { x: 250, y: 1250 }, data: { label: 'Database', componentType: 'database', properties: { dbType: 'sql' } } },
      { id: 'demo-db-slave', type: 'architecture', position: { x: 450, y: 1250 }, data: { label: 'Database', componentType: 'database', properties: { dbType: 'sql' } } },
      { id: 'demo-cache', type: 'architecture', position: { x: 650, y: 1250 }, data: { label: 'Cache', componentType: 'cache', properties: { cacheType: 'distributed' } } },
      { id: 'demo-storage', type: 'architecture', position: { x: 850, y: 850 }, data: { label: 'Storage', componentType: 'storage', properties: {} } },
      { id: 'demo-logger', type: 'architecture', position: { x: 150, y: 1050 }, data: { label: 'Logger', componentType: 'logger', properties: { logType: 'all', retentionDays: 30 } } }
    ]

    const demoEdges: Edge[] = [
      { id: 'e-client-dns', source: 'demo-client', target: 'demo-dns', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'dns' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-client-cdn', source: 'demo-client', target: 'demo-cdn', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-client-firewall', source: 'demo-client', target: 'demo-firewall', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-firewall-lb', source: 'demo-firewall', target: 'demo-lb', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-cdn-storage', source: 'demo-cdn', target: 'demo-storage', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-lb-proxy', source: 'demo-lb', target: 'demo-reverse-proxy', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-proxy-apigw', source: 'demo-reverse-proxy', target: 'demo-apigw', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-apigw-service', source: 'demo-apigw', target: 'demo-service', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-service-mq', source: 'demo-service', target: 'demo-mq', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'async', protocol: 'amqp' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-service-dbm', source: 'demo-service', target: 'demo-db-master', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-service-dbs', source: 'demo-service', target: 'demo-db-slave', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-service-cache', source: 'demo-service', target: 'demo-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false },
      { id: 'e-service-logger', source: 'demo-service', target: 'demo-logger', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: { stroke: defaultEdgeColor, strokeWidth: 2 }, type: 'handdrawn', animated: false }
    ]

    setNodes(demoNodes)
    setEdges(demoEdges)

    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.2, duration: 500 })
      }
    }, 50)
  }, [pushHistory, setNodes, setEdges, theme, rfInstance])

  const handleTwitter = useCallback(() => {
    pushHistory()
    
    const twitterNodes: Node[] = [
      // Entry points
      { id: 'tw-client', type: 'architecture', position: { x: 400, y: 0 }, data: { label: 'Client', componentType: 'client', properties: {} } },
      { id: 'tw-dns', type: 'architecture', position: { x: 700, y: 0 }, data: { label: 'DNS', componentType: 'dns', properties: {} } },
      { id: 'tw-cdn', type: 'architecture', position: { x: 700, y: 150 }, data: { label: 'CDN', componentType: 'cdn', properties: {} } },
      { id: 'tw-firewall', type: 'architecture', position: { x: 400, y: 150 }, data: { label: 'Firewall', componentType: 'firewall', properties: { mode: 'inline', layer: 'l7' } } },
      { id: 'tw-lb', type: 'architecture', position: { x: 400, y: 300 }, data: { label: 'Load Balancer', componentType: 'load_balancer', properties: { algorithm: 'round_robin', layer: 'l7', replicas: 2 } } },
      
      // Reverse Proxy
      { id: 'tw-rp', type: 'architecture', position: { x: 390, y: 500 }, data: { label: 'Reverse Proxy (Nginx)', componentType: 'reverse_proxy', properties: { product: 'nginx', sslTermination: true, replicas: 2 } } },
      
      // Gateway
      { id: 'tw-apigw', type: 'architecture', position: { x: 400, y: 700 }, data: { label: 'API Gateway', componentType: 'api_gateway', properties: { authEnabled: true, rateLimit: 5000, replicas: 2 } } },
      
      // Core Services
      { id: 'tw-user-srv', type: 'architecture', position: { x: 50, y: 950 }, data: { label: 'User Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'tw-tweet-srv', type: 'architecture', position: { x: 250, y: 950 }, data: { label: 'Tweet Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'tw-timeline-srv', type: 'architecture', position: { x: 450, y: 950 }, data: { label: 'Timeline Service', componentType: 'service', properties: { replicas: 3, healthCheck: true } } },
      { id: 'tw-media-srv', type: 'architecture', position: { x: 650, y: 950 }, data: { label: 'Media Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      
      // Async & Storage
      { id: 'tw-mq', type: 'architecture', position: { x: 250, y: 1200 }, data: { label: 'Message Queue', componentType: 'message_queue', properties: { product: 'kafka', queueType: 'pub_sub', hasDLQ: true } } },
      { id: 'tw-storage', type: 'architecture', position: { x: 650, y: 1200 }, data: { label: 'Storage (S3)', componentType: 'storage', properties: { storageClass: 'standard', accessLevel: 'private' } } },
      
      // Async Workers
      { id: 'tw-fanout-srv', type: 'architecture', position: { x: 150, y: 1450 }, data: { label: 'Fan-out Service', componentType: 'service', properties: { replicas: 3 } } },
      { id: 'tw-search-srv', type: 'architecture', position: { x: 350, y: 1450 }, data: { label: 'Search Service', componentType: 'service', properties: { replicas: 2 } } },
      
      // Data Layer
      { id: 'tw-db', type: 'architecture', position: { x: 250, y: 1700 }, data: { label: 'Database (MySQL)', componentType: 'database', properties: { dbType: 'sql', readWriteRatio: 0.2, replicas: 2 } } },
      { id: 'tw-cache', type: 'architecture', position: { x: 550, y: 1700 }, data: { label: 'Cache (Redis)', componentType: 'cache', properties: { cacheType: 'distributed', product: 'redis', evictionPolicy: 'lru', ttlSeconds: 3600 } } },
      
      // Observability
      { id: 'tw-monitor', type: 'architecture', position: { x: 50, y: 1200 }, data: { label: 'Monitor', componentType: 'logger', properties: { product: 'prometheus', logType: 'all', alerting: true } } },
    ]

    const edgeStyle = { stroke: defaultEdgeColor, strokeWidth: 2 }

    const twitterEdges: Edge[] = [
      // User Request Flow (Sync)
      { id: 'e-tw-client-dns', source: 'tw-client', target: 'tw-dns', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'dns' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-client-cdn', source: 'tw-client', target: 'tw-cdn', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-client-firewall', source: 'tw-client', target: 'tw-firewall', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-firewall-lb', source: 'tw-firewall', target: 'tw-lb', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-lb-rp', source: 'tw-lb', target: 'tw-rp', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-rp-apigw', source: 'tw-rp', target: 'tw-apigw', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Gateway to Services (Sync)
      { id: 'e-tw-apigw-user', source: 'tw-apigw', target: 'tw-user-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-apigw-tweet', source: 'tw-apigw', target: 'tw-tweet-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-apigw-timeline', source: 'tw-apigw', target: 'tw-timeline-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-apigw-media', source: 'tw-apigw', target: 'tw-media-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Service to Data/Storage (Sync)
      { id: 'e-tw-user-db', source: 'tw-user-srv', target: 'tw-db', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-tweet-db', source: 'tw-tweet-srv', target: 'tw-db', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-timeline-cache', source: 'tw-timeline-srv', target: 'tw-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-media-storage', source: 'tw-media-srv', target: 'tw-storage', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Async Decoupling (MQ as Channel)
      // Tweet Service -> MQ (Async)
      { id: 'e-tw-tweet-mq', source: 'tw-tweet-srv', target: 'tw-mq', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      // MQ -> Workers (Async Consumption)
      { id: 'e-tw-mq-fanout', source: 'tw-mq', target: 'tw-fanout-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-mq-search', source: 'tw-mq', target: 'tw-search-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Worker to Data (Sync - Worker Services access Data Layer)
      { id: 'e-tw-fanout-cache', source: 'tw-fanout-srv', target: 'tw-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-search-db', source: 'tw-search-srv', target: 'tw-db', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },

      // Observability
      { id: 'e-tw-user-monitor', source: 'tw-user-srv', target: 'tw-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-tweet-monitor', source: 'tw-tweet-srv', target: 'tw-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-tw-timeline-monitor', source: 'tw-timeline-srv', target: 'tw-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
    ]

    setNodes(twitterNodes)
    setEdges(twitterEdges)

    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.2, duration: 500 })
      }
    }, 50)
  }, [pushHistory, setNodes, setEdges, theme, rfInstance])

  const handleYouTube = useCallback(() => {
    pushHistory()
    
    const ytNodes: Node[] = [
      // Row 1: Users & DNS
      { id: 'yt-client', type: 'architecture', position: { x: 500, y: 50 }, data: { label: 'Client', componentType: 'client', properties: {} } },
      { id: 'yt-dns', type: 'architecture', position: { x: 900, y: 50 }, data: { label: 'DNS', componentType: 'dns', properties: {} } },
      
      // Row 2: Entry Points
      { id: 'yt-firewall', type: 'architecture', position: { x: 500, y: 200 }, data: { label: 'Firewall', componentType: 'firewall', properties: { mode: 'inline', layer: 'l7' } } },
      { id: 'yt-lb', type: 'architecture', position: { x: 500, y: 350 }, data: { label: 'Load Balancer', componentType: 'load_balancer', properties: { algorithm: 'round_robin', layer: 'l7', replicas: 2 } } },
      { id: 'yt-cdn', type: 'architecture', position: { x: 900, y: 350 }, data: { label: 'CDN', componentType: 'cdn', properties: {} } },
      
      // Reverse Proxy
      { id: 'yt-rp', type: 'architecture', position: { x: 490, y: 550 }, data: { label: 'Reverse Proxy (Nginx)', componentType: 'reverse_proxy', properties: { product: 'nginx', sslTermination: true, replicas: 2 } } },
      
      // Row 3: Gateway
      { id: 'yt-apigw', type: 'architecture', position: { x: 500, y: 750 }, data: { label: 'API Gateway', componentType: 'api_gateway', properties: { authEnabled: true, rateLimit: 10000 } } },
      
      // Row 4: Core Services
      { id: 'yt-user-srv', type: 'architecture', position: { x: 100, y: 1000 }, data: { label: 'User Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'yt-search-srv', type: 'architecture', position: { x: 300, y: 1000 }, data: { label: 'Search Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'yt-reco-srv', type: 'architecture', position: { x: 500, y: 1000 }, data: { label: 'Recommendation', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'yt-streaming-srv', type: 'architecture', position: { x: 700, y: 1000 }, data: { label: 'Streaming', componentType: 'service', properties: { replicas: 3, healthCheck: true } } },
      { id: 'yt-metadata-srv', type: 'architecture', position: { x: 900, y: 1000 }, data: { label: 'Metadata Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'yt-upload-srv', type: 'architecture', position: { x: 1100, y: 1000 }, data: { label: 'Upload Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      
      // Row 5: Async & Workers
      { id: 'yt-mq', type: 'architecture', position: { x: 1100, y: 1250 }, data: { label: 'Message Queue', componentType: 'message_queue', properties: { product: 'kafka', queueType: 'pub_sub', hasDLQ: true } } },
      { id: 'yt-transcoding-srv', type: 'architecture', position: { x: 1100, y: 1500 }, data: { label: 'Transcoding', componentType: 'service', properties: { replicas: 5, healthCheck: true } } },
      
      // Row 6: Data Layer
      { id: 'yt-db', type: 'architecture', position: { x: 300, y: 1750 }, data: { label: 'Database', componentType: 'database', properties: { dbType: 'sql', readWriteRatio: 0.8 } } },
      { id: 'yt-cache', type: 'architecture', position: { x: 600, y: 1750 }, data: { label: 'Cache', componentType: 'cache', properties: { cacheType: 'distributed', product: 'redis', evictionPolicy: 'lru', ttlSeconds: 3600 } } },
      { id: 'yt-storage', type: 'architecture', position: { x: 1000, y: 1750 }, data: { label: 'Storage (S3)', componentType: 'storage', properties: { storageClass: 'standard' } } },

      // Observability
      { id: 'yt-monitor', type: 'architecture', position: { x: 100, y: 1250 }, data: { label: 'Monitor', componentType: 'logger', properties: { product: 'datadog', logType: 'all', alerting: true } } },
    ]

    const edgeStyle = { stroke: defaultEdgeColor, strokeWidth: 2 }

    const ytEdges: Edge[] = [
      // Request Flow
      { id: 'e-yt-client-dns', source: 'yt-client', target: 'yt-dns', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'dns' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-client-cdn', source: 'yt-client', target: 'yt-cdn', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-client-firewall', source: 'yt-client', target: 'yt-firewall', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-firewall-lb', source: 'yt-firewall', target: 'yt-lb', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-lb-rp', source: 'yt-lb', target: 'yt-rp', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-rp-apigw', source: 'yt-rp', target: 'yt-apigw', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // API Gateway to Services
      { id: 'e-yt-apigw-user', source: 'yt-apigw', target: 'yt-user-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-apigw-search', source: 'yt-apigw', target: 'yt-search-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-apigw-reco', source: 'yt-apigw', target: 'yt-reco-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-apigw-streaming', source: 'yt-apigw', target: 'yt-streaming-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-apigw-metadata', source: 'yt-apigw', target: 'yt-metadata-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-apigw-upload', source: 'yt-apigw', target: 'yt-upload-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Upload Flow
      { id: 'e-yt-upload-storage', source: 'yt-upload-srv', target: 'yt-storage', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-upload-mq', source: 'yt-upload-srv', target: 'yt-mq', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-mq-transcoding', source: 'yt-mq', target: 'yt-transcoding-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-transcoding-storage', source: 'yt-transcoding-srv', target: 'yt-storage', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-transcoding-mq', source: 'yt-transcoding-srv', target: 'yt-mq', sourceHandle: 'top-source', targetHandle: 'bottom-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-mq-metadata', source: 'yt-mq', target: 'yt-metadata-srv', sourceHandle: 'top-source', targetHandle: 'bottom-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Metadata & CDN
      { id: 'e-yt-metadata-db', source: 'yt-metadata-srv', target: 'yt-db', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-metadata-cdn', source: 'yt-metadata-srv', target: 'yt-cdn', sourceHandle: 'top-source', targetHandle: 'bottom-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Streaming Flow
      { id: 'e-yt-streaming-db', source: 'yt-streaming-srv', target: 'yt-db', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-streaming-cache', source: 'yt-streaming-srv', target: 'yt-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-cdn-storage', source: 'yt-cdn', target: 'yt-storage', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: { ...edgeStyle, strokeDasharray: '5,5' }, type: 'handdrawn', animated: false },

      // Search & Reco
      { id: 'e-yt-search-db', source: 'yt-search-srv', target: 'yt-db', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-reco-cache', source: 'yt-reco-srv', target: 'yt-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: edgeStyle, type: 'handdrawn', animated: false },

      // Observability
      { id: 'e-yt-streaming-monitor', source: 'yt-streaming-srv', target: 'yt-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-yt-upload-monitor', source: 'yt-upload-srv', target: 'yt-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
    ]

    setNodes(ytNodes)
    setEdges(ytEdges)

    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.2, duration: 500 })
      }
    }, 50)
  }, [pushHistory, setNodes, setEdges, theme, rfInstance])

  const handleGoogle = useCallback(() => {
    pushHistory()
    
    const googleNodes: Node[] = [
      // Row 1: Users & DNS
      { id: 'gg-client', type: 'architecture', position: { x: 400, y: 0 }, data: { label: 'Client', componentType: 'client', properties: {} } },
      { id: 'gg-dns', type: 'architecture', position: { x: 700, y: 0 }, data: { label: 'DNS', componentType: 'dns', properties: {} } },
      
      // Row 2: Entry Points
      { id: 'gg-firewall', type: 'architecture', position: { x: 400, y: 150 }, data: { label: 'Firewall', componentType: 'firewall', properties: { mode: 'inline', layer: 'l7' } } },
      { id: 'gg-lb', type: 'architecture', position: { x: 400, y: 300 }, data: { label: 'Load Balancer', componentType: 'load_balancer', properties: { replicas: 2, healthCheck: true } } },
      { id: 'gg-cdn', type: 'architecture', position: { x: 700, y: 300 }, data: { label: 'CDN', componentType: 'cdn', properties: {} } },
      
      // Reverse Proxy
      { id: 'gg-rp', type: 'architecture', position: { x: 390, y: 500 }, data: { label: 'Reverse Proxy (Nginx)', componentType: 'reverse_proxy', properties: { product: 'nginx', sslTermination: true, replicas: 2 } } },
      
      // Row 3: Gateway
      { id: 'gg-apigw', type: 'architecture', position: { x: 400, y: 700 }, data: { label: 'API Gateway', componentType: 'api_gateway', properties: { authEnabled: true, rateLimit: 20000 } } },
      
      // Row 4: Core Services
      { id: 'gg-auto-srv', type: 'architecture', position: { x: 0, y: 950 }, data: { label: 'Autocomplete Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'gg-query-srv', type: 'architecture', position: { x: 200, y: 950 }, data: { label: 'Query Service', componentType: 'service', properties: { replicas: 3, healthCheck: true } } },
      { id: 'gg-ranking-srv', type: 'architecture', position: { x: 400, y: 950 }, data: { label: 'Ranking Service', componentType: 'service', properties: { replicas: 3, healthCheck: true } } },
      { id: 'gg-ads-srv', type: 'architecture', position: { x: 600, y: 950 }, data: { label: 'Ads Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'gg-snippet-srv', type: 'architecture', position: { x: 800, y: 950 }, data: { label: 'Snippet Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      { id: 'gg-crawler-srv', type: 'architecture', position: { x: 1000, y: 950 }, data: { label: 'Crawler Service', componentType: 'service', properties: { replicas: 3, healthCheck: true } } },
      
      // Row 5: Async Middleware
      { id: 'gg-mq', type: 'architecture', position: { x: 1000, y: 1200 }, data: { label: 'Message Queue', componentType: 'message_queue', properties: { product: 'kafka', hasDLQ: true } } },
      
      // Row 6: Indexing Worker
      { id: 'gg-indexing-srv', type: 'architecture', position: { x: 1000, y: 1450 }, data: { label: 'Indexing Service', componentType: 'service', properties: { replicas: 2, healthCheck: true } } },
      
      // Row 7: Data Layer
      { id: 'gg-cache', type: 'architecture', position: { x: 100, y: 1700 }, data: { label: 'Cache (Results/Trie)', componentType: 'cache', properties: { product: 'redis', evictionPolicy: 'lru', ttlSeconds: 3600 } } },
      { id: 'gg-db-index', type: 'architecture', position: { x: 500, y: 1700 }, data: { label: 'Database (Inverted Index)', componentType: 'database', properties: { dbType: 'nosql' } } },
      { id: 'gg-storage', type: 'architecture', position: { x: 1000, y: 1700 }, data: { label: 'Storage (HTML)', componentType: 'storage', properties: { storageClass: 'standard' } } },

      // Observability
      { id: 'gg-monitor', type: 'architecture', position: { x: 0, y: 1200 }, data: { label: 'Monitor', componentType: 'logger', properties: { product: 'elk', logType: 'all', alerting: true } } },
    ]

    const edgeStyle = { stroke: defaultEdgeColor, strokeWidth: 2 }

    const googleEdges: Edge[] = [
      // Request Flow
      { id: 'e-gg-client-dns', source: 'gg-client', target: 'gg-dns', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'dns' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-client-cdn', source: 'gg-client', target: 'gg-cdn', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-client-firewall', source: 'gg-client', target: 'gg-firewall', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-firewall-lb', source: 'gg-firewall', target: 'gg-lb', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-lb-rp', source: 'gg-lb', target: 'gg-rp', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-rp-apigw', source: 'gg-rp', target: 'gg-apigw', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Gateway to Services
      { id: 'e-gg-apigw-auto', source: 'gg-apigw', target: 'gg-auto-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-apigw-query', source: 'gg-apigw', target: 'gg-query-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Query Chain (Sync)
      { id: 'e-gg-query-cache', source: 'gg-query-srv', target: 'gg-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-query-db', source: 'gg-query-srv', target: 'gg-db-index', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-query-ranking', source: 'gg-query-srv', target: 'gg-ranking-srv', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'grpc' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-ranking-ads', source: 'gg-ranking-srv', target: 'gg-ads-srv', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'grpc' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-ads-snippet', source: 'gg-ads-srv', target: 'gg-snippet-srv', sourceHandle: 'right-source', targetHandle: 'left-target', data: { connectionType: 'sync', protocol: 'grpc' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Autocomplete (Heavy Cache)
      { id: 'e-gg-auto-cache', source: 'gg-auto-srv', target: 'gg-cache', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'resp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      
      // Crawler & Indexing Flow (Async)
      { id: 'e-gg-crawler-storage', source: 'gg-crawler-srv', target: 'gg-storage', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'https' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-crawler-mq', source: 'gg-crawler-srv', target: 'gg-mq', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-mq-indexing', source: 'gg-mq', target: 'gg-indexing-srv', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'async', protocol: 'amqp' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-indexing-db', source: 'gg-indexing-srv', target: 'gg-db-index', sourceHandle: 'bottom-source', targetHandle: 'top-target', data: { connectionType: 'sync', protocol: 'database' }, style: edgeStyle, type: 'handdrawn', animated: false },

      // Observability
      { id: 'e-gg-query-monitor', source: 'gg-query-srv', target: 'gg-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
      { id: 'e-gg-ranking-monitor', source: 'gg-ranking-srv', target: 'gg-monitor', sourceHandle: 'left-source', targetHandle: 'right-target', data: { connectionType: 'async', protocol: 'http' }, style: edgeStyle, type: 'handdrawn', animated: false },
    ]

    setNodes(googleNodes)
    setEdges(googleEdges)

    setTimeout(() => {
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.2, duration: 500 })
      }
    }, 50)
  }, [pushHistory, setNodes, setEdges, theme, rfInstance])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        {canMerge && (
          <ToolbarButton
            label="Merge"
            shortcut="Ctrl+M"
            onClick={mergeSelectedNodes}
          />
        )}
        {canSplit && (
          <ToolbarButton
            label="Split"
            onClick={splitSelectedNode}
            title="Split merged node back into individual components"
          />
        )}
        {analysisResult && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {analysisResult.success
                ? `${analysisResult.nodeCount} nodes, ${analysisResult.edgeCount} edges`
                : 'Analysis failed'}
              {activeWarnings.length > 0 && (
                <span 
                  onClick={() => setShowWarnings((prev) => !prev)}
                  style={{ 
                    color: 'var(--text-secondary)',
                    marginLeft: 8,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {activeWarnings.length} warning(s)
                </span>
              )}
            </span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div ref={presetsRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPresets(prev => !prev)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 400,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Demo ▾
              </button>
            {showPresets && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                minWidth: 130,
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 100,
              }}>
                {[
                  { label: 'Basic', handler: handleDemo },
                  { label: 'Twitter', handler: handleTwitter },
                  { label: 'YouTube', handler: handleYouTube },
                  { label: 'Google', handler: handleGoogle },
                ].map(({ label, handler }) => (
                  <button
                    key={label}
                    onClick={() => { handler(); setShowPresets(false) }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontWeight: 400,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <SettingsMenu 
          theme={theme} 
          setTheme={setTheme} 
          getNodes={() => nodes}
          getEdges={() => edges}
        />
      </div>
    </div>
    <div ref={reactFlowWrapper} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <ReactFlow
              nodes={nodes.map(node => {
              const nodeWarnings = warningsByNode.get(node.id) ?? []
              const data = node.data as Record<string, unknown>
              return {
                ...node,
                data: {
                  ...data,
                  warnings: nodeWarnings,
                },
              }
            })}
            edges={edges.map(e => {
              const edgeData = (e.data as Record<string, unknown>) ?? {}
              const protocol = edgeData.protocol as string | undefined
              const connectionType = edgeData.connectionType as string | undefined
              const edgeLabel = edgeData.label as string | undefined
              
              let autoLabel = ''
              const protocolLabel = protocol && protocol !== 'unspecified' ? (PROTOCOL_LABELS[protocol] || protocol) : ''
              const connTypeLabel = connectionType && connectionType !== 'unspecified' ? (CONNECTION_TYPE_LABELS[connectionType] || connectionType) : ''
              
              if (protocolLabel && connTypeLabel) {
                autoLabel = `${protocolLabel} (${connTypeLabel})`
              } else if (protocolLabel) {
                autoLabel = protocolLabel
              } else if (connTypeLabel) {
                autoLabel = connTypeLabel
              }

              const displayLabel = edgeLabel || autoLabel || undefined
              const isHighlighted = e.selected;
              const color = isHighlighted ? '#3b82f6' : defaultEdgeColor
              const direction = edgeData.direction as string | undefined
              const arrowMarker = { type: MarkerType.ArrowClosed, color }
              const markerEnd = direction === 'none' ? undefined : arrowMarker
              const markerStart = direction === 'bi' ? arrowMarker : undefined
              return {
                ...e,
                selectable: true,
                label: displayLabel,
                labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
                labelBgStyle: { fill: defaultLabelBg, fillOpacity: 0.85 },
                labelBgPadding: [6, 3] as [number, number],
                labelBgBorderRadius: 3,
                markerEnd,
                markerStart,
                style: {
                  ...e.style,
                  stroke: color,
                  strokeWidth: isHighlighted ? 3 : 2,
                },
              }
            })}
            selectionMode={SelectionMode.Partial}
            selectionOnDrag
            panOnDrag={false}
            panOnScroll
            selectionKeyCode={null}
            multiSelectionKeyCode="Shift"
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodesDelete={onNodesDelete}
            onNodeDragStart={onNodeDragStart}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={isDarkMode ? 'dark' : 'light'}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              selectable: true,
              type: 'handdrawn',
            }}
            proOptions={{ hideAttribution: true }}
          >
            {/* SVG filter for hand-drawn edge effect */}
            <svg width="0" height="0">
              <defs>
                <filter id="roughen">
                  <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="2" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
                </filter>
              </defs>
            </svg>

            <Controls />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color={gridColor}
            />
            
            {analysisResult && (
              <div style={{
                position: 'absolute',
                bottom: 15,
                right: 70,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: analysisResult.rulesPassed === analysisResult.totalRules
                    ? '#22c55e'
                    : analysisResult.rulesPassed / analysisResult.totalRules >= 0.8
                      ? '#eab308'
                      : '#ef4444',
                }}>
                  {analysisResult.rulesPassed}/{analysisResult.totalRules}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  rules passed
                </span>
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 16, left: 70, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <SystemParamsPanel
                params={systemParams}
                onChange={setSystemParams}
              />
            </div>
          </ReactFlow>
          </div>

          {/* Warning Panel terminal style */}
          {showWarnings && activeWarnings.length > 0 && (
            <div
              style={{
                height: panelHeight,
                minHeight: 100,
                backgroundColor: 'var(--bg-primary)',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10,
                position: 'relative',
                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              <div
                onMouseDown={onDragStart}
                style={{
                  position: 'absolute',
                  top: -4,
                  left: 0,
                  right: 0,
                  height: 8,
                  cursor: 'row-resize',
                  zIndex: 20,
                  backgroundColor: 'transparent',
                }}
              />
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '0 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: '36px',
              }}>
                <div style={{ display: 'flex', height: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    borderBottom: '1px solid var(--text-primary)',
                    padding: '0 8px',
                    marginBottom: '-1px',
                    gap: 8,
                  }}>
                    <h3 style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: 0.5 }}>
                      PROBLEMS
                    </h3>
                    <span style={{ 
                      backgroundColor: tooltipBg,
                      color: 'var(--text-primary)', 
                      padding: '2px 6px', 
                      borderRadius: 12, 
                      fontSize: 10,
                      fontWeight: 600,
                    }}>{activeWarnings.length}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWarnings(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    lineHeight: 1,
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--text-primary)'
                    e.currentTarget.style.color = 'var(--bg-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                  title="Close Panel"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                {analysisResult?.warnings?.map((w, idx) => {
                  if (dismissedWarnings.has(idx)) return null
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        if (w.nodeIds && w.nodeIds.length > 0) {
                          fitViewToNode(w.nodeIds[0])
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = tooltipHover
                        const closeBtn = e.currentTarget.querySelector('.dismiss-btn') as HTMLElement
                        if (closeBtn) closeBtn.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        const closeBtn = e.currentTarget.querySelector('.dismiss-btn') as HTMLElement
                        if (closeBtn) closeBtn.style.opacity = '0'
                      }}
                      style={{
                        padding: '8px 16px 8px 36px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        cursor: w.nodeIds && w.nodeIds.length > 0 ? 'pointer' : 'default',
                        position: 'relative',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <svg 
                        viewBox="0 0 16 16" 
                        fill="#f59e0b" 
                        style={{ position: 'absolute', left: 14, top: 10, width: 14, height: 14 }}
                      >
                        <path fillRule="evenodd" clipRule="evenodd" d="M7.56 1h.88l6.5 13v.88H1.05V14l6.5-13zm.45 1.74l-5.6 11.2h11.2L8.01 2.74zM9 12.01H7v-1.9h2v1.9zm0-2.92H7V5.01h2v4.08z" />
                      </svg>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span>{w.message}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7, fontFamily: 'sans-serif' }}>
                            [{w.rule.replace(/_/g, ' ')}]
                          </span>
                        </div>
                        <button
                          className="dismiss-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDismissedWarnings(prev => {
                              const next = new Set(prev)
                              next.add(idx)
                              return next
                            })
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: 16,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            marginLeft: 8,
                          }}
                          title="Dismiss warning"
                        >
                          ×
                        </button>
                      </div>

                      {w.solution && (
                        <div style={{ 
                          fontSize: 12, 
                          color: 'var(--text-secondary)', 
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          marginTop: 4
                        }}>
                          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12, marginTop: 2, flexShrink: 0, opacity: 0.7 }}>
                            <path fillRule="evenodd" clipRule="evenodd" d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 1.25.5 2.4 1.34 3.23.4.4.66.95.66 1.52A1.25 1.25 0 006.75 12h2.5a1.25 1.25 0 001.25-1.25c0-.57.26-1.12.66-1.52.84-.83 1.34-1.98 1.34-3.23A4.5 4.5 0 008 1.5zm-3.5 4.5a3.5 3.5 0 117 0c0 .99-.4 1.88-1.04 2.53-.54.54-.86 1.26-.86 2.02v.2H6.4v-.2c0-.76-.32-1.48-.86-2.02A3.5 3.5 0 014.5 6zM6 13.5v.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-.5H6z" />
                          </svg>
                          <span style={{ fontStyle: 'italic', opacity: 0.9 }}>{w.solution}</span>
                        </div>
                      )}
                      
                      {w.nodeIds && w.nodeIds.length > 0 && (
                        <div style={{ fontSize: 11, color: '#3b82f6', opacity: 0.9, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', marginTop: 4 }}>
                          Nodes: {w.nodeIds.join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        {showPropertyPanel && (
          <div style={{ position: 'relative' }}>
            <div
              onMouseDown={(e) => {
                e.preventDefault()
                isDraggingRef.current = true
                const startX = e.clientX
                const startWidth = propertyPanelWidth
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startX - moveEvent.clientX
                  const newWidth = Math.max(200, Math.min(600, startWidth + delta))
                  setPropertyPanelWidth(newWidth)
                }
                const handleMouseUp = () => {
                  isDraggingRef.current = false
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }
                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
              style={{
                position: 'absolute',
                left: -4,
                top: 0,
                bottom: 0,
                width: 8,
                cursor: 'col-resize',
                zIndex: 20,
                backgroundColor: 'transparent',
              }}
              title="Resize panel"
            />
            <div
              style={{
                width: propertyPanelWidth,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Properties</span>
                <button
                  onClick={() => setShowPropertyPanel(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 2,
                    lineHeight: 1,
                    borderRadius: 3,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                  title="Close panel"
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ComponentPropertyPanel
                  selectedNode={selectedNode}
                  selectedEdgeId={selectedEdgeId}
                  onNodeDataChange={onNodeDataChange}
                />
                <EdgePropertyPanel
                  selectedEdgeId={selectedEdgeId}
                  edges={edges}
                  onEdgeDataChange={onEdgeDataChange}
                  onEdgeAnimatedChange={onEdgeAnimatedChange}
                  onEdgeDirectionChange={onEdgeDirectionChange}
                  onEdgeReverse={onEdgeReverse}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Canvas
