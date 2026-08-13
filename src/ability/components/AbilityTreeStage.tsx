import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ChevronLeft,
  ChevronRight,
  GitMerge,
  Info,
  LocateFixed,
  Medal,
  Pencil,
  Plus,
  RotateCcw,
  Redo2,
  Sparkles,
  Trash2,
  Undo2
} from 'lucide-react';
import { NODE_STATE_LABELS } from '../abilityConfig';
import { getNodeDisplayState, getPhaseProgress, getPrimaryChildren } from '../abilityGraph';
import { CANVAS_GRID, NODE_HEIGHT, NODE_WIDTH, layoutAbilityCanvas, snapCanvasPoint, type CanvasPoint } from '../abilityCanvasLayout';
import { buildAlignedOrthogonalPath } from '../abilityCanvasGeometry';
import { buildAbilityVisibleGraph } from '../abilityView';
import type { CanvasPreferences } from '../abilityCanvasStorage';
import { runAbilityHistoryAction, type CanvasPreferenceHistory } from '../abilityCanvasHistory';
import type { AbilityState, NodeProgress, SkillTree, TreeNodeFilter } from '../types';

type SkillNodeData = Record<string, unknown> & {
  label: string;
  progress: NodeProgress;
  selected: boolean;
  dropTarget: boolean;
  childCount: number;
  hiddenChildCount: number;
  onAddChild: () => void;
  onToggleCollapse: () => void;
  onOpenDetails: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
};

type OutcomeNodeData = Record<string, unknown> & { label: string; onOpen: () => void };
type GroupNodeData = Record<string, unknown> & { label: string };
type PhaseNodeData = Record<string, unknown> & {
  label: string;
  description: string;
  estimatedDuration: string;
  progressLabel: string;
  empty: boolean;
  onAddFirstNode: () => void;
  onEdit: () => void;
};
type FlowNodeData = SkillNodeData | OutcomeNodeData | GroupNodeData | PhaseNodeData;
type FlowNode = Node<FlowNodeData>;
type AlignedEdgeData = Record<string, unknown> & { branchX: number };
type AlignedFlowEdge = Edge<AlignedEdgeData>;

type Props = {
  state: AbilityState;
  tree: SkillTree;
  selectedNodeId: string | null;
  focusRequest?: AbilityFocusRequest | null;
  resetLayoutRequest?: number;
  stateFilter: TreeNodeFilter;
  preferences: CanvasPreferences;
  canvasHistory: CanvasPreferenceHistory;
  onCommitPreferences: (preferences: CanvasPreferences) => void;
  onUpdateViewport: (viewport: CanvasPreferences['viewport']) => void;
  onUndoCanvas: () => void;
  onRedoCanvas: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectOutcome: (outcomeId: string) => void;
  onAddPhase: () => void;
  onAddNode: (phaseId?: string) => void;
  onEditPhase: (phaseId: string) => void;
  onAddChild: (nodeId: string) => string;
  onAddSibling: (nodeId: string) => string;
  onAddParent: (nodeId: string) => string;
  onRenameNode: (nodeId: string, name: string) => void;
  onDeleteBranch: (nodeId: string) => void;
  onReparent: (nodeId: string, parentNodeId: string) => void;
  onConnectAuxiliary: (fromNodeId: string, toNodeId: string) => void;
  onMerge: (nodeIds: string[]) => string;
  onOpenDetails: (nodeId: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
};

export type AbilityFocusRequest = { nodeId: string; sequence: number };

export function consumeFocusRequest(
  consumedSequence: number,
  request: AbilityFocusRequest | null | undefined
): AbilityFocusRequest | null {
  return request && request.sequence > consumedSequence ? request : null;
}

export function consumeAbilityFocusRequest(
  consumedSequence: number,
  request: AbilityFocusRequest | null | undefined,
  focus: (nodeId: string) => void
): number {
  const freshRequest = consumeFocusRequest(consumedSequence, request);
  if (!freshRequest) return consumedSequence;
  focus(freshRequest.nodeId);
  return freshRequest.sequence;
}

export function getAbilityHistoryShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): 'undo' | 'redo' | null {
  if (!event.ctrlKey && !event.metaKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'y' || (key === 'z' && event.shiftKey)) return 'redo';
  return key === 'z' ? 'undo' : null;
}

function SkillCanvasNode({ data }: NodeProps<Node<SkillNodeData>>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  useEffect(() => setDraft(data.label), [data.label]);
  const save = () => {
    const name = draft.trim();
    if (name && name !== data.label) data.onRename(name);
    else setDraft(data.label);
    setEditing(false);
  };

  return <div
    className={`ability-flow-node state-${data.progress} ${data.selected ? 'selected' : ''} ${data.dropTarget ? 'drop-target' : ''}`}
    onDoubleClick={(event) => { event.stopPropagation(); setEditing(true); }}
  >
    <Handle className="ability-flow-handle" type="target" position={Position.Left} />
    {data.selected ? <div className="ability-node-floating-toolbar" aria-label={`${data.label} 节点工具栏`}>
      <button type="button" aria-label={`查看详情 ${data.label}`} onClick={(event) => { event.stopPropagation(); data.onOpenDetails(); }}><Info size={15} /></button>
      <button type="button" aria-label={`删除分支 ${data.label}`} onClick={(event) => { event.stopPropagation(); data.onDelete(); }}><Trash2 size={15} /></button>
    </div> : null}
    <span className="ability-flow-status" aria-hidden="true">{data.progress === 'mastered' ? <Sparkles size={15} /> : null}</span>
    {editing ? <input
      className="nodrag nowheel ability-node-inline-input"
      aria-label="编辑节点名称"
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); save(); }
        if (event.key === 'Escape') { setDraft(data.label); setEditing(false); }
      }}
    /> : <strong>{data.label}</strong>}
    <small>{NODE_STATE_LABELS[data.progress]}</small>
    {data.childCount > 0 ? <button
      className="nodrag ability-collapse-branch"
      type="button"
      aria-label={`${data.hiddenChildCount ? '展开' : '折叠'} ${data.label} 分支`}
      onClick={(event) => { event.stopPropagation(); data.onToggleCollapse(); }}
    >{data.hiddenChildCount ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}{data.hiddenChildCount ? data.hiddenChildCount : ''}</button> : null}
    <button
      className="nodrag ability-add-child"
      type="button"
      aria-label={`为 ${data.label} 添加子节点`}
      onClick={(event) => { event.stopPropagation(); data.onAddChild(); }}
    ><Plus size={18} /></button>
    <Handle className="ability-flow-handle" type="source" position={Position.Right} />
  </div>;
}

function OutcomeCanvasNode({ data }: NodeProps<Node<OutcomeNodeData>>) {
  return <button className="ability-flow-outcome nodrag" type="button" aria-label={`${data.label} 成果`} onClick={data.onOpen}><Medal size={15} />{data.label}</button>;
}

function ParallelGroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  return <div className="ability-parallel-group"><span><GitMerge size={14} />{data.label}</span></div>;
}

function PhaseCanvasNode({ data }: NodeProps<Node<PhaseNodeData>>) {
  return <div className={`ability-canvas-phase ${data.empty ? 'is-empty' : ''}`} role="group" aria-label={`阶段 ${data.label}`}>
    <Handle className="ability-phase-handle" type="target" position={Position.Left} />
    <header>
      <div><small>{data.progressLabel}{data.estimatedDuration ? ` · ${data.estimatedDuration}` : ''}</small><strong>{data.label}</strong>{data.description ? <p>{data.description}</p> : null}</div>
      <button className="nodrag" type="button" aria-label={`编辑阶段 ${data.label}`} onClick={data.onEdit}><Pencil size={13} /></button>
    </header>
    {data.empty ? <div className="ability-canvas-phase-empty"><span>这个阶段还没有技能节点</span><button className="nodrag" type="button" aria-label={`在 ${data.label} 添加第一个节点`} onClick={data.onAddFirstNode}><Plus size={15} />添加第一个节点</button></div> : null}
    <Handle className="ability-phase-handle" type="source" position={Position.Right} />
  </div>;
}

const nodeTypes = { skill: SkillCanvasNode, outcome: OutcomeCanvasNode, parallelGroup: ParallelGroupNode, phase: PhaseCanvasNode };

function AlignedOrthogonalEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, style, data }: EdgeProps<AlignedFlowEdge>) {
  const path = buildAlignedOrthogonalPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    branchX: data?.branchX ?? (sourceX + targetX) / 2
  });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={18} />;
}

const edgeTypes = { aligned: AlignedOrthogonalEdge };

export function applyCanvasDragPreference(
  preferences: CanvasPreferences,
  nodeId: string,
  position: CanvasPoint
): CanvasPreferences {
  const snapped = snapCanvasPoint(position);
  if (nodeId.startsWith('phase:')) {
    return {
      ...preferences,
      phasePositions: { ...preferences.phasePositions, [nodeId.slice('phase:'.length)]: snapped }
    };
  }
  return { ...preferences, positions: { ...preferences.positions, [nodeId]: snapped } };
}

export function applyPhaseDragPreference(
  preferences: CanvasPreferences,
  phaseId: string,
  from: CanvasPoint,
  to: CanvasPoint,
  memberNodeIds: string[]
): CanvasPreferences {
  const previous = snapCanvasPoint(from);
  const next = snapCanvasPoint(to);
  const delta = { x: next.x - previous.x, y: next.y - previous.y };
  const memberIds = new Set(memberNodeIds);
  return {
    ...preferences,
    phasePositions: { ...preferences.phasePositions, [phaseId]: next },
    positions: Object.fromEntries(Object.entries(preferences.positions).map(([id, point]) => [
      id,
      memberIds.has(id) ? snapCanvasPoint({ x: point.x + delta.x, y: point.y + delta.y }) : point
    ]))
  };
}

export function resetCanvasLayoutPreferences(preferences: CanvasPreferences): CanvasPreferences {
  return { ...preferences, positions: {}, phasePositions: {} };
}

export function isCanvasPaneTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.classList.contains('react-flow__pane');
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]'));
}

function sameSelection(current: ReadonlySet<string>, ids: string[]): boolean {
  return current.size === ids.length && ids.every((id) => current.has(id));
}

export function AbilityTreeStage(props: Props) {
  const preferences = props.preferences;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(props.selectedNodeId ? [props.selectedNodeId] : []));
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [copiedName, setCopiedName] = useState('');
  const instanceRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const previousSkillCountRef = useRef(
    props.state.nodes.filter((node) => node.skillTreeId === props.tree.id && !node.archivedAt).length
  );
  const previousResetRequestRef = useRef(props.resetLayoutRequest ?? 0);
  const phaseDragStartPositionRef = useRef<CanvasPoint | null>(null);
  const phaseDragPositionRef = useRef<CanvasPoint | null>(null);
  const consumedFocusRequestRef = useRef({ treeId: props.tree.id, sequence: 0 });

  useEffect(() => {
    const requestedNode = props.selectedNodeId
      ? props.state.nodes.find((node) => node.id === props.selectedNodeId && node.skillTreeId === props.tree.id && !node.archivedAt)
      : null;
    setSelectedIds(new Set(requestedNode ? [requestedNode.id] : []));
    queueMicrotask(() => {
      const instance = instanceRef.current;
      if (!instance) return;
      if (Object.keys(preferences.positions).length || preferences.viewport.zoom !== 1 || preferences.viewport.x || preferences.viewport.y) {
        void instance.setViewport(preferences.viewport, { duration: 0 });
      } else {
        void instance.fitView({ padding: 0.2, maxZoom: 1.15, duration: 0 });
      }
    });
  }, [props.tree.id]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const clearFromPane = (event: MouseEvent) => {
      if (!isCanvasPaneTarget(event.target)) return;
      setSelectedIds(new Set());
      props.onSelectNode(null);
    };
    document.addEventListener('click', clearFromPane, true);
    return () => document.removeEventListener('click', clearFromPane, true);
  }, [props.onSelectNode]);

  useEffect(() => {
    const requestedNode = props.selectedNodeId
      ? props.state.nodes.find((node) => node.id === props.selectedNodeId && node.skillTreeId === props.tree.id && !node.archivedAt)
      : null;
    setSelectedIds(new Set(requestedNode ? [requestedNode.id] : []));
  }, [props.selectedNodeId, props.state.nodes, props.tree.id]);

  useEffect(() => {
    const consumedSequence = consumedFocusRequestRef.current.treeId === props.tree.id
      ? consumedFocusRequestRef.current.sequence
      : 0;
    const sequence = consumeAbilityFocusRequest(consumedSequence, props.focusRequest, (nodeId) => {
      setSelectedIds(new Set([nodeId]));
      requestAnimationFrame(() => {
        void instanceRef.current?.fitView({
          nodes: [{ id: nodeId }],
          padding: 1.6,
          duration: 220,
          maxZoom: 1.15
        });
      });
    });
    consumedFocusRequestRef.current = { treeId: props.tree.id, sequence };
  }, [props.focusRequest, props.tree.id]);

  const visibleGraph = useMemo(
    () => buildAbilityVisibleGraph(props.state, props.tree.id, props.stateFilter, props.selectedNodeId),
    [props.selectedNodeId, props.state, props.stateFilter, props.tree.id]
  );
  const layoutState = useMemo(() => ({
    ...props.state,
    nodes: visibleGraph.nodes,
    dependencies: visibleGraph.dependencies,
    parallelGroups: visibleGraph.parallelGroups,
    outcomes: visibleGraph.outcomes
  }), [props.state, visibleGraph]);
  const collapsedNodeIds = useMemo(() => new Set(preferences.collapsedNodeIds), [preferences.collapsedNodeIds]);
  const layout = useMemo(() => layoutAbilityCanvas(layoutState, props.tree.id, {
    collapsedNodeIds,
    manualPositions: preferences.positions,
    phasePositions: preferences.phasePositions
  }), [layoutState, props.tree.id, collapsedNodeIds, preferences.phasePositions, preferences.positions]);

  useEffect(() => {
    const skillCount = layout.nodes.filter((node) => node.kind === 'skill').length;
    const shouldRevealFirstNode = previousSkillCountRef.current === 0 && skillCount > 0;
    previousSkillCountRef.current = skillCount;
    if (!shouldRevealFirstNode) return;
    requestAnimationFrame(() => {
      void instanceRef.current?.fitView({ padding: 0.5, maxZoom: 1.15, duration: 180 });
    });
  }, [layout.nodes]);

  useEffect(() => {
    if (!props.selectedNodeId || visibleGraph.selectedNodeId) return;
    setSelectedIds(new Set());
    props.onSelectNode(null);
  }, [props.onSelectNode, props.selectedNodeId, visibleGraph.selectedNodeId]);

  const toggleCollapse = useCallback((nodeId: string) => {
    const ids = new Set(preferences.collapsedNodeIds);
    ids.has(nodeId) ? ids.delete(nodeId) : ids.add(nodeId);
    props.onCommitPreferences({ ...preferences, collapsedNodeIds: [...ids] });
  }, [preferences, props.onCommitPreferences]);

  const deleteBranch = useCallback((nodeId: string) => {
    props.onDeleteBranch(nodeId);
    setSelectedIds(new Set());
    props.onSelectNode(null);
    setNotice('已删除该分支');
  }, [props.onDeleteBranch, props.onSelectNode]);

  const computedNodes = useMemo<FlowNode[]>(() => {
    const skills = layout.nodes.flatMap((item): FlowNode[] => {
      if (item.kind === 'outcome') {
        const outcome = visibleGraph.outcomes.find((candidate) => candidate.id === item.id);
        return outcome ? [{
          id: item.id,
          type: 'outcome',
          position: { x: item.x, y: item.y },
          width: 160,
          height: 30,
          selectable: false,
          draggable: false,
          data: { label: outcome.title, onOpen: () => props.onSelectOutcome(outcome.id) },
          zIndex: 4
        }] : [];
      }
      const node = visibleGraph.nodes.find((candidate) => candidate.id === item.id);
      if (!node) return [];
      const children = getPrimaryChildren(layoutState, node.id).filter((child) => !child.archivedAt);
      return [{
        id: item.id,
        type: 'skill',
        ariaLabel: `${node.name} ${NODE_STATE_LABELS[getNodeDisplayState(node, props.state)]}`,
        position: { x: item.x, y: item.y },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        draggable: true,
        selected: selectedIds.has(item.id),
        data: {
          label: node.name,
          progress: getNodeDisplayState(node, props.state),
          selected: selectedIds.has(item.id),
          dropTarget: dropTargetId === item.id,
          childCount: children.length,
          hiddenChildCount: item.hiddenChildCount,
          onAddChild: () => {
            const childId = props.onAddChild(node.id);
            requestAnimationFrame(() => {
              void instanceRef.current?.fitView({
                nodes: [{ id: node.id }, { id: childId }],
                padding: 1.2,
                maxZoom: 1.15,
                duration: 180
              });
            });
          },
          onToggleCollapse: () => toggleCollapse(node.id),
          onOpenDetails: () => props.onOpenDetails(node.id),
          onDelete: () => deleteBranch(node.id),
          onRename: (name) => props.onRenameNode(node.id, name)
        },
        zIndex: 5
      }];
    });
    const groups: FlowNode[] = layout.groups.map((group) => ({
      id: `group:${group.id}`,
      type: 'parallelGroup',
      position: { x: group.x, y: group.y },
      data: { label: group.name },
      width: group.width,
      height: group.height,
      style: { width: group.width, height: group.height },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      zIndex: 0
    }));
    const phaseNodes: FlowNode[] = layout.phases.map((phase) => {
      const progress = getPhaseProgress(props.state, phase.id);
      const actualNodeCount = props.state.nodes.filter((node) => node.phaseId === phase.id && !node.archivedAt).length;
      return {
        id: `phase:${phase.id}`,
        type: 'phase',
        ariaLabel: `阶段 ${phase.name}`,
        position: { x: phase.x, y: phase.y },
        width: phase.width,
        height: phase.height,
        style: { width: phase.width, height: phase.height },
        data: {
          label: phase.name,
          description: phase.description,
          estimatedDuration: phase.estimatedDuration,
          progressLabel: `${progress.mastered}/${progress.required} 个必修节点`,
          empty: actualNodeCount === 0,
          onAddFirstNode: () => props.onAddNode(phase.id),
          onEdit: () => props.onEditPhase(phase.id)
        },
        draggable: true,
        selectable: false,
        connectable: false,
        focusable: false,
        zIndex: -5
      };
    });
    return [...phaseNodes, ...groups, ...skills];
  }, [
    deleteBranch,
    dropTargetId,
    layout,
    layoutState,
    props.onAddChild,
    props.onAddNode,
    props.onEditPhase,
    props.onOpenDetails,
    props.onRenameNode,
    props.onSelectNode,
    props.onSelectOutcome,
    props.state,
    selectedIds,
    toggleCollapse,
    visibleGraph.nodes,
    visibleGraph.outcomes
  ]);

  const computedEdges = useMemo<Edge[]>(() => {
    const nodeEdges = layout.edges.flatMap((item) => {
    const related = selectedIds.has(item.fromId) || selectedIds.has(item.toId);
    const auxiliary = item.kind === 'auxiliary';
    const stroke = auxiliary
      ? (related ? '#667b91' : '#9aa7b4')
      : (related ? '#3d4650' : '#5f6872');
    return [{
      id: item.id,
      source: item.fromId,
      target: item.toId,
      type: 'aligned',
      data: { branchX: item.branchX },
      markerEnd: { type: MarkerType.ArrowClosed, width: auxiliary ? 10 : 12, height: auxiliary ? 10 : 12, color: stroke },
      className: `ability-edge-aligned ${auxiliary ? 'ability-edge-auxiliary' : 'ability-edge-primary'} ${related ? 'is-related' : ''}`,
      style: auxiliary
        ? { stroke, strokeWidth: related ? 2 : 1.35, strokeDasharray: '6 7', opacity: related ? 1 : 0.58 }
        : { stroke, strokeWidth: related ? 2.6 : 2, opacity: selectedIds.size && !related ? 0.58 : 1 },
      zIndex: auxiliary ? 1 : 2
    }];
    });
    const phaseEdges: Edge[] = layout.phaseEdges.map((item) => ({
      id: item.id,
      source: `phase:${item.fromPhaseId}`,
      target: `phase:${item.toPhaseId}`,
      type: 'default',
      className: 'ability-edge-phase-order',
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#b48a22' },
      style: { stroke: '#b48a22', strokeWidth: 1.5 },
      zIndex: -3
    }));
    return [...phaseEdges, ...nodeEdges];
  }, [layout.edges, layout.phaseEdges, selectedIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(computedNodes);
  const edges = computedEdges;
  const localNodesById = new Map(nodes.map((node) => [node.id, node]));
  const renderedNodes = computedNodes.map((node) => {
    const local = localNodesById.get(node.id);
    return local ? { ...node, position: local.position, dragging: local.dragging, measured: local.measured } : node;
  });
  const previousNodeIdsRef = useRef(new Set<string>());
  const removedNodeIdsRef = useRef(new Set<string>());
  const flowRevisionRef = useRef(0);
  const currentNodeIds = new Set(computedNodes.map((node) => node.id));
  previousNodeIdsRef.current.forEach((id) => {
    if (!currentNodeIds.has(id)) removedNodeIdsRef.current.add(id);
  });
  let restoredNode = false;
  currentNodeIds.forEach((id) => {
    if (removedNodeIdsRef.current.delete(id)) restoredNode = true;
  });
  if (restoredNode) flowRevisionRef.current += 1;
  previousNodeIdsRef.current = currentNodeIds;
  useEffect(() => {
    setNodes((current) => {
      const currentById = new Map(current.map((node) => [node.id, node]));
      return computedNodes.map((node) => {
        const local = currentById.get(node.id);
        return local?.measured ? { ...node, measured: local.measured } : node;
      });
    });
  }, [computedNodes, setNodes]);

  const addFromKeyboard = useCallback((mode: 'child' | 'sibling' | 'parent') => {
    const id = [...selectedIds][0];
    if (!id || selectedIds.size !== 1) return;
    const created = mode === 'child' ? props.onAddChild(id) : mode === 'sibling' ? props.onAddSibling(id) : props.onAddParent(id);
    setSelectedIds(new Set([created]));
    props.onSelectNode(created);
  }, [props.onAddChild, props.onAddParent, props.onAddSibling, props.onSelectNode, selectedIds]);

  const undoAction = useCallback(() => {
    const source = runAbilityHistoryAction('undo', props.canvasHistory, props.canUndo, props.onUndoCanvas, props.onUndo);
    if (source !== 'none') setNotice(source === 'canvas' ? '已撤销画布调整' : '已撤销上一步操作');
  }, [props.canvasHistory, props.canUndo, props.onUndo, props.onUndoCanvas]);

  const redoAction = useCallback(() => {
    const source = runAbilityHistoryAction('redo', props.canvasHistory, props.canRedo, props.onRedoCanvas, props.onRedo);
    if (source !== 'none') setNotice(source === 'canvas' ? '已重做画布调整' : '已重做上一步操作');
  }, [props.canvasHistory, props.canRedo, props.onRedo, props.onRedoCanvas]);

  const handleCanvasKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) return;
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const historyShortcut = getAbilityHistoryShortcut(event);
    if (historyShortcut) {
      event.preventDefault();
      historyShortcut === 'undo' ? undoAction() : redoAction();
      return;
    }
    if (command && key === 'c') {
      const id = [...selectedIds][0];
      const node = props.state.nodes.find((item) => item.id === id);
      if (node) {
        event.preventDefault();
        setCopiedName(node.name);
      }
      return;
    }
    if (command && key === 'v' && copiedName) {
      const parentId = [...selectedIds][0];
      if (parentId) {
        event.preventDefault();
        const id = props.onAddChild(parentId);
        props.onRenameNode(id, `${copiedName} 副本`);
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!selectedIds.size) return;
      event.preventDefault();
      [...selectedIds].forEach(deleteBranch);
      return;
    }
    if (command && event.key === 'Enter') {
      event.preventDefault();
      addFromKeyboard(event.shiftKey ? 'sibling' : 'child');
    }
  }, [addFromKeyboard, copiedName, deleteBranch, props.onAddChild, props.onRenameNode, props.state.nodes, redoAction, selectedIds, undoAction]);

  const persistPreferences = useCallback((next: CanvasPreferences) => {
    props.onCommitPreferences(next);
  }, [props.onCommitPreferences]);

  const persistViewport = useCallback((viewport: CanvasPreferences['viewport']) => {
    props.onUpdateViewport(viewport);
  }, [props.onUpdateViewport]);

  const resetLayout = () => {
    persistPreferences(resetCanvasLayoutPreferences(preferences));
    queueMicrotask(() => void instanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.15, duration: 220 }));
  };

  useEffect(() => {
    const request = props.resetLayoutRequest ?? 0;
    if (request === previousResetRequestRef.current) return;
    previousResetRequestRef.current = request;
    resetLayout();
  }, [props.resetLayoutRequest]);

  const locateSelected = () => {
    const id = [...selectedIds][0];
    if (id) void instanceRef.current?.fitView({ nodes: [{ id }], padding: 1.6, duration: 220, maxZoom: 1.15 });
    else void instanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.15, duration: 220 });
  };

  return <section className="ability-tree-stage" aria-label={`${props.tree.name}技能树舞台`}>
    <div className="ability-canvas-instructions"><span>拖动画布移动 · 滚轮平移 · Ctrl + 滚轮缩放</span><span>单击查看详情 · 双击改名 · Ctrl + Enter 新建子技能</span></div>
    <div
      ref={shellRef}
      className="ability-flow-shell"
      role="group"
      aria-label={`${props.tree.name}交互画布`}
      tabIndex={0}
      onKeyDown={handleCanvasKeyDown}
    >
      <ReactFlow<FlowNode, Edge>
        key={`${props.tree.id}:${flowRevisionRef.current}`}
        nodes={renderedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onInit={(instance) => {
          instanceRef.current = instance;
          if (Object.keys(preferences.positions).length || preferences.viewport.x || preferences.viewport.y || preferences.viewport.zoom !== 1) {
            void instance.setViewport(preferences.viewport, { duration: 0 });
          } else {
            void instance.fitView({ padding: 0.2, maxZoom: 1.15, duration: 0 });
          }
        }}
        onNodeClick={(event, node) => {
          if (node.type !== 'skill') return;
          const next = event.shiftKey ? new Set(selectedIds) : new Set<string>();
          if (event.shiftKey && next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          setSelectedIds(next);
          props.onSelectNode(next.size === 1 ? [...next][0] : null);
        }}
        onPaneClick={() => { setSelectedIds(new Set()); props.onSelectNode(null); }}
        onSelectionChange={({ nodes: selected }) => {
          const ids = selected.filter((node) => node.type === 'skill').map((node) => node.id);
          if (ids.length === 0) return;
          setSelectedIds((current) => sameSelection(current, ids) ? current : new Set(ids));
          props.onSelectNode(ids.length === 1 ? ids[0] : null);
        }}
        onNodeDragStart={(_, node) => {
          if (node.type === 'phase') {
            phaseDragStartPositionRef.current = node.position;
            phaseDragPositionRef.current = node.position;
          }
        }}
        onNodeDrag={(_, node) => {
          if (node.type === 'phase') {
            const previous = phaseDragPositionRef.current ?? node.position;
            const delta = { x: node.position.x - previous.x, y: node.position.y - previous.y };
            phaseDragPositionRef.current = node.position;
            const phaseId = node.id.slice('phase:'.length);
            const memberIds = new Set(props.state.nodes.filter((item) => item.phaseId === phaseId && !item.archivedAt).map((item) => item.id));
            setNodes((current) => current.map((item) => item.id !== node.id && memberIds.has(item.id)
              ? { ...item, position: { x: item.position.x + delta.x, y: item.position.y + delta.y } }
              : item));
            return;
          }
          if (node.type === 'skill') {
            const target = instanceRef.current?.getIntersectingNodes(node).find((item) => item.type === 'skill' && item.id !== node.id);
            setDropTargetId(target?.id ?? null);
          }
        }}
        onNodeDragStop={(_, node) => {
          if (node.type === 'phase') {
            const phaseId = node.id.slice('phase:'.length);
            const from = phaseDragStartPositionRef.current ?? node.position;
            phaseDragStartPositionRef.current = null;
            phaseDragPositionRef.current = null;
            const memberIds = props.state.nodes.filter((item) => item.phaseId === phaseId && !item.archivedAt).map((item) => item.id);
            persistPreferences(applyPhaseDragPreference(preferences, phaseId, from, node.position, memberIds));
            return;
          }
          if (node.type !== 'skill') return;
          const targetId = dropTargetId;
          setDropTargetId(null);
          if (targetId) {
            try { props.onReparent(node.id, targetId); } catch { /* invalid cycle keeps the original parent */ }
            return;
          }
          persistPreferences(applyCanvasDragPreference(preferences, node.id, node.position));
        }}
        onConnect={(connection: Connection) => {
          if (connection.source && connection.target && connection.source !== connection.target && !connection.source.startsWith('phase:') && !connection.target.startsWith('phase:')) {
            props.onConnectAuxiliary(connection.source, connection.target);
          }
        }}
        onMoveEnd={(_, viewport) => {
          if (layout.nodes.length > 0) persistViewport(viewport);
        }}
        defaultViewport={preferences.viewport}
        minZoom={0.2}
        maxZoom={2}
        panOnDrag
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        zoomActivationKeyCode={['Meta', 'Control']}
        selectionOnDrag
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null}
        nodesConnectable
        nodesDraggable
        snapToGrid
        snapGrid={[CANVAS_GRID, CANVAS_GRID]}
        elementsSelectable
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#dedbd2" />
        <Controls position="bottom-right" showInteractive={false} fitViewOptions={{ padding: 0.2, maxZoom: 1.15 }} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(node) => node.type === 'phase' ? '#f5f3ec' : node.type === 'parallelGroup' ? '#f4ead1' : node.selected ? '#f4b400' : '#d9dde0'}
          maskColor="rgba(249, 248, 244, .76)"
        />
        <Panel position="top-right" className="ability-canvas-toolbar">
          <button type="button" onClick={props.onAddPhase}><Plus size={15} />添加下一阶段</button>
          <button type="button" disabled={!props.state.phases.some((phase) => phase.skillTreeId === props.tree.id)} onClick={() => props.onAddNode()}><Plus size={15} />添加技能节点</button>
          <button type="button" onClick={resetLayout}><RotateCcw size={15} />重新自动布局</button>
          <button type="button" onClick={locateSelected}><LocateFixed size={15} />定位</button>
          <button type="button" disabled={!props.canvasHistory.past.length && !props.canUndo} onClick={undoAction}><Undo2 size={15} />撤销</button>
          <button type="button" disabled={!props.canvasHistory.future.length && !props.canRedo} onClick={redoAction}><Redo2 size={15} />重做</button>
        </Panel>
        {selectedIds.size >= 2 ? <Panel position="top-center" className="ability-merge-toolbar">
          <span>已选择 {selectedIds.size} 个节点</span>
          <button type="button" onClick={() => {
            try { const id = props.onMerge([...selectedIds]); setSelectedIds(new Set([id])); props.onSelectNode(id); }
            catch { setNotice('只有同一父级下的节点可以汇合'); }
          }}><GitMerge size={16} />汇合到下一步</button>
        </Panel> : null}
      </ReactFlow>
    </div>
    {notice ? <div className="ability-undo-toast" role="status"><span>{notice}</span>{props.canUndo ? <button type="button" onClick={() => { props.onUndo(); setNotice(''); }}>撤销</button> : null}<button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div> : null}
  </section>;
}
