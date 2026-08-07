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
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2
} from 'lucide-react';
import { NODE_STATE_LABELS } from '../abilityConfig';
import { getNodeDisplayState, getPrimaryChildren } from '../abilityGraph';
import { CANVAS_GRID, NODE_HEIGHT, NODE_WIDTH, layoutAbilityCanvas, snapCanvasPoint, type CanvasPoint } from '../abilityCanvasLayout';
import { buildAlignedOrthogonalPath } from '../abilityCanvasGeometry';
import { loadCanvasPreferences, saveCanvasPreferences, type CanvasPreferences } from '../abilityCanvasStorage';
import type { StorageLike } from '../../lib/storage';
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
type FlowNodeData = SkillNodeData | OutcomeNodeData | GroupNodeData;
type FlowNode = Node<FlowNodeData>;
type AlignedEdgeData = Record<string, unknown> & { branchX: number };
type AlignedFlowEdge = Edge<AlignedEdgeData>;

type Props = {
  state: AbilityState;
  tree: SkillTree;
  selectedNodeId: string | null;
  stateFilter: TreeNodeFilter;
  storage?: StorageLike;
  onSelectNode: (nodeId: string | null) => void;
  onSelectOutcome: (outcomeId: string) => void;
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
};

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
    {data.selected ? <button
      className="nodrag ability-add-child"
      type="button"
      aria-label={`为 ${data.label} 添加子节点`}
      onClick={(event) => { event.stopPropagation(); data.onAddChild(); }}
    ><Plus size={18} /></button> : null}
    <Handle className="ability-flow-handle" type="source" position={Position.Right} />
  </div>;
}

function OutcomeCanvasNode({ data }: NodeProps<Node<OutcomeNodeData>>) {
  return <button className="ability-flow-outcome nodrag" type="button" aria-label={`${data.label} 成果`} onClick={data.onOpen}><Medal size={15} />{data.label}</button>;
}

function ParallelGroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  return <div className="ability-parallel-group"><span><GitMerge size={14} />{data.label}</span></div>;
}

const nodeTypes = { skill: SkillCanvasNode, outcome: OutcomeCanvasNode, parallelGroup: ParallelGroupNode };

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

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]'));
}

function sameSelection(current: ReadonlySet<string>, ids: string[]): boolean {
  return current.size === ids.length && ids.every((id) => current.has(id));
}

export function AbilityTreeStage(props: Props) {
  const browserStorage = props.storage ?? window.localStorage;
  const [preferences, setPreferences] = useState<CanvasPreferences>(() => loadCanvasPreferences(browserStorage, props.tree.id));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(props.selectedNodeId ? [props.selectedNodeId] : []));
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [copiedName, setCopiedName] = useState('');
  const instanceRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const previousSkillCountRef = useRef(
    props.state.nodes.filter((node) => node.skillTreeId === props.tree.id && !node.archivedAt).length
  );

  useEffect(() => {
    const next = loadCanvasPreferences(browserStorage, props.tree.id);
    setPreferences(next);
    const requestedNode = props.selectedNodeId
      ? props.state.nodes.find((node) => node.id === props.selectedNodeId && node.skillTreeId === props.tree.id && !node.archivedAt)
      : null;
    setSelectedIds(new Set(requestedNode ? [requestedNode.id] : []));
    queueMicrotask(() => {
      const instance = instanceRef.current;
      if (!instance) return;
      if (Object.keys(next.positions).length || next.viewport.zoom !== 1 || next.viewport.x || next.viewport.y) {
        void instance.setViewport(next.viewport, { duration: 0 });
      } else {
        void instance.fitView({ padding: 0.2, maxZoom: 1.15, duration: 0 });
      }
    });
  }, [browserStorage, props.tree.id]);

  useEffect(() => {
    const requestedNode = props.selectedNodeId
      ? props.state.nodes.find((node) => node.id === props.selectedNodeId && node.skillTreeId === props.tree.id && !node.archivedAt)
      : null;
    setSelectedIds(new Set(requestedNode ? [requestedNode.id] : []));
  }, [props.selectedNodeId, props.state.nodes, props.tree.id]);

  const collapsedNodeIds = useMemo(() => new Set(preferences.collapsedNodeIds), [preferences.collapsedNodeIds]);
  const layout = useMemo(() => layoutAbilityCanvas(props.state, props.tree.id, {
    collapsedNodeIds,
    manualPositions: preferences.positions
  }), [props.state, props.tree.id, collapsedNodeIds, preferences.positions]);

  useEffect(() => {
    const skillCount = layout.nodes.filter((node) => node.kind === 'skill').length;
    const shouldRevealFirstNode = previousSkillCountRef.current === 0 && skillCount > 0;
    previousSkillCountRef.current = skillCount;
    if (!shouldRevealFirstNode) return;
    requestAnimationFrame(() => {
      void instanceRef.current?.fitView({ padding: 0.5, maxZoom: 1.15, duration: 180 });
    });
  }, [layout.nodes]);

  const filteredSkillIds = useMemo(() => {
    const treeNodes = props.state.nodes.filter((node) => node.skillTreeId === props.tree.id && !node.archivedAt);
    const phaseOrder = props.state.phases.filter((phase) => phase.skillTreeId === props.tree.id).sort((a, b) => a.order - b.order);
    const currentPhaseId = phaseOrder.find((phase) => treeNodes.some((node) => node.phaseId === phase.id && node.progress !== 'mastered'))?.id ?? phaseOrder[phaseOrder.length - 1]?.id;
    return new Set(treeNodes.filter((node) => {
      if (props.stateFilter === 'all') return true;
      if (props.stateFilter === 'current_phase') return node.phaseId === currentPhaseId;
      return node.progress === props.stateFilter;
    }).map((node) => node.id));
  }, [props.state, props.tree.id, props.stateFilter]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setPreferences((current) => {
      const ids = new Set(current.collapsedNodeIds);
      ids.has(nodeId) ? ids.delete(nodeId) : ids.add(nodeId);
      const next = { ...current, collapsedNodeIds: [...ids] };
      saveCanvasPreferences(browserStorage, props.tree.id, next);
      return next;
    });
  }, [browserStorage, props.tree.id]);

  const deleteBranch = useCallback((nodeId: string) => {
    props.onDeleteBranch(nodeId);
    setSelectedIds(new Set());
    props.onSelectNode(null);
    setNotice('已删除该分支');
  }, [props.onDeleteBranch, props.onSelectNode]);

  const computedNodes = useMemo<FlowNode[]>(() => {
    const skills = layout.nodes.flatMap((item): FlowNode[] => {
      if (item.kind === 'outcome') {
        const outcome = props.state.outcomes.find((candidate) => candidate.id === item.id);
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
      if (!filteredSkillIds.has(item.id)) return [];
      const node = props.state.nodes.find((candidate) => candidate.id === item.id);
      if (!node) return [];
      const children = getPrimaryChildren(props.state, node.id).filter((child) => !child.archivedAt);
      return [{
        id: item.id,
        type: 'skill',
        ariaLabel: `${node.name} ${NODE_STATE_LABELS[getNodeDisplayState(node, props.state)]}`,
        position: { x: item.x, y: item.y },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
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
    return [...groups, ...skills];
  }, [
    deleteBranch,
    dropTargetId,
    filteredSkillIds,
    layout,
    props.onAddChild,
    props.onOpenDetails,
    props.onRenameNode,
    props.onSelectNode,
    props.onSelectOutcome,
    props.state,
    selectedIds,
    toggleCollapse
  ]);

  const computedEdges = useMemo<Edge[]>(() => layout.edges.flatMap((item) => {
    if (!filteredSkillIds.has(item.fromId) || !filteredSkillIds.has(item.toId)) return [];
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
  }), [filteredSkillIds, layout.edges, selectedIds]);

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

  const handleCanvasKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) return;
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (command && key === 'z') {
      if (!props.canUndo) return;
      event.preventDefault();
      props.onUndo();
      setNotice('已撤销上一步操作');
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
  }, [addFromKeyboard, copiedName, deleteBranch, props.canUndo, props.onAddChild, props.onRenameNode, props.onUndo, props.state.nodes, selectedIds]);

  const persistPreferences = useCallback((patch: Partial<CanvasPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      saveCanvasPreferences(browserStorage, props.tree.id, next);
      return next;
    });
  }, [browserStorage, props.tree.id]);

  const resetLayout = () => {
    persistPreferences({ positions: {} });
    queueMicrotask(() => void instanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.15, duration: 220 }));
  };

  const locateSelected = () => {
    const id = [...selectedIds][0];
    if (id) void instanceRef.current?.fitView({ nodes: [{ id }], padding: 1.6, duration: 220, maxZoom: 1.15 });
    else void instanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.15, duration: 220 });
  };

  return <section className="ability-tree-stage" aria-label={`${props.tree.name}技能树舞台`}>
    <div className="ability-canvas-instructions"><span>拖动画布移动 · 滚轮平移 · Ctrl + 滚轮缩放</span><span>聚焦画布后：Ctrl + Enter 新建子技能 · Ctrl + Shift + Enter 新建同级</span></div>
    <div
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
        onNodeDrag={(_, node) => {
          if (node.type !== 'skill') return;
          const target = instanceRef.current?.getIntersectingNodes(node).find((item) => item.type === 'skill' && item.id !== node.id);
          setDropTargetId(target?.id ?? null);
        }}
        onNodeDragStop={(_, node) => {
          if (node.type !== 'skill') return;
          const targetId = dropTargetId;
          setDropTargetId(null);
          if (targetId) {
            try { props.onReparent(node.id, targetId); } catch { /* invalid cycle keeps the original parent */ }
            return;
          }
          persistPreferences({ positions: { ...preferences.positions, [node.id]: snapCanvasPoint(node.position) } });
        }}
        onConnect={(connection: Connection) => {
          if (connection.source && connection.target && connection.source !== connection.target) {
            props.onConnectAuxiliary(connection.source, connection.target);
          }
        }}
        onMoveEnd={(_, viewport) => {
          if (layout.nodes.length > 0) persistPreferences({ viewport });
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
          nodeColor={(node) => node.type === 'parallelGroup' ? '#f4ead1' : node.selected ? '#f4b400' : '#d9dde0'}
          maskColor="rgba(249, 248, 244, .76)"
        />
        <Panel position="top-right" className="ability-canvas-toolbar">
          <button type="button" onClick={resetLayout}><RotateCcw size={15} />重新自动布局</button>
          <button type="button" onClick={locateSelected}><LocateFixed size={15} />定位</button>
          <button type="button" disabled={!props.canUndo} onClick={() => { props.onUndo(); setNotice('已撤销上一步操作'); }}><Undo2 size={15} />撤销</button>
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
