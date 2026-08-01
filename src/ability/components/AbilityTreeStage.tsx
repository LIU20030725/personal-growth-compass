import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, LockKeyhole, Medal, Sparkles } from 'lucide-react';
import { NODE_STATE_LABELS, TREE_LAYOUT } from '../abilityConfig';
import { getNodeDisplayState } from '../abilityGraph';
import { layoutSkillTree } from '../abilityLayout';
import type { AbilityState, NodeDisplayState, SkillTree, TreeNodeFilter } from '../types';

type Props = {
  state: AbilityState;
  tree: SkillTree;
  selectedNodeId: string | null;
  collapsedPhaseIds: ReadonlySet<string>;
  stateFilter: TreeNodeFilter;
  onSelectNode: (nodeId: string) => void;
  onSelectOutcome: (outcomeId: string) => void;
  onTogglePhase: (phaseId: string) => void;
};

export function AbilityTreeStage({ state, tree, selectedNodeId, collapsedPhaseIds, stateFilter, onSelectNode, onSelectOutcome, onTogglePhase }: Props) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 680px)').matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(max-width: 680px)');
    const update = () => setIsMobile(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  const layout = layoutSkillTree(state, tree.id, collapsedPhaseIds);
  const treeNodes = state.nodes.filter((node) => node.skillTreeId === tree.id && !node.archivedAt);
  const phaseOrder = state.phases.filter((phase) => phase.skillTreeId === tree.id).sort((a, b) => a.order - b.order);
  const currentPhaseId = phaseOrder.find((phase) => treeNodes.some((node) => node.phaseId === phase.id && node.progress !== 'mastered'))?.id ?? phaseOrder[phaseOrder.length - 1]?.id;
  const visibleSkillIds = new Set(treeNodes.filter((node) => {
    const display = getNodeDisplayState(node, state);
    if (stateFilter === 'all') return true;
    if (stateFilter === 'current_phase') return node.phaseId === currentPhaseId;
    return display === stateFilter;
  }).map((node) => node.id));
  const layoutById = new Map(layout.nodes.map((item) => [item.id, item]));

  return <section className="ability-tree-stage" aria-label={`${tree.name}技能树舞台`}>
    {!isMobile ? <div className="ability-stage-scroll">
      <div className="ability-tree-map" role="tree" aria-label={`${tree.name}技能树`} style={{ minWidth: layout.width, minHeight: Math.max(layout.height, 260) }}>
        <svg className="ability-tree-edges" width={layout.width} height={Math.max(layout.height, 260)} aria-hidden="true">
          {layout.unlockEdges.map((edge) => {
            const from = layoutById.get(edge.fromId);
            const to = layoutById.get(edge.toId);
            if (!from || !to || !visibleSkillIds.has(edge.fromId) || !visibleSkillIds.has(edge.toId)) return null;
            const middle = (from.y + to.y) / 2;
            return <path key={edge.id} d={`M ${from.x} ${from.y + 28} C ${from.x} ${middle}, ${to.x} ${middle}, ${to.x} ${to.y - 28}`} />;
          })}
        </svg>

        {layout.phases.map((phase) => <div className="ability-phase-label" style={{ top: phase.row * TREE_LAYOUT.rowHeight + 10 }} key={phase.id}>
          <button type="button" aria-expanded={!phase.collapsed} onClick={() => onTogglePhase(phase.id)}>{phase.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}<span>阶段 {phase.order + 1}</span><strong>{phase.name}</strong></button>
        </div>)}

        {layout.nodes.map((position) => {
          if (position.kind === 'outcome') {
            const outcome = state.outcomes.find((item) => item.id === position.id);
            if (!outcome) return null;
            return <button className="ability-outcome-node" type="button" aria-label={`${outcome.title} 成果`} onClick={() => onSelectOutcome(outcome.id)} key={outcome.id} style={{ left: position.x, top: position.y }}><Medal size={16} /><span>{outcome.title}</span></button>;
          }
          if (!visibleSkillIds.has(position.id)) return null;
          const node = state.nodes.find((item) => item.id === position.id);
          if (!node) return null;
          const display = getNodeDisplayState(node, state);
          return <button
            className={`ability-skill-node state-${display} ${selectedNodeId === node.id ? 'selected' : ''}`}
            type="button"
            role="treeitem"
            aria-label={`${node.name} ${NODE_STATE_LABELS[display]}`}
            aria-disabled={display === 'locked'}
            aria-selected={selectedNodeId === node.id}
            onClick={() => onSelectNode(node.id)}
            key={node.id}
            style={{ left: position.x, top: position.y }}
          >
            <span className="ability-node-icon">{display === 'locked' ? <LockKeyhole size={18} /> : display === 'mastered' ? <Sparkles size={18} /> : <span />}</span>
            <strong>{node.name}</strong><small>{NODE_STATE_LABELS[display]}</small>
          </button>;
        })}
      </div>
    </div> : <div className="ability-mobile-route" role="tree" aria-label={`${tree.name}技能树`}>
      {phaseOrder.map((phase) => {
        const collapsed = collapsedPhaseIds.has(phase.id);
        const phaseNodes = treeNodes.filter((node) => node.phaseId === phase.id && visibleSkillIds.has(node.id));
        const phaseOutcomes = state.outcomes.filter((outcome) => outcome.showOnTree && outcome.skillTreeId === tree.id && outcome.skillNodeId && phaseNodes.some((node) => node.id === outcome.skillNodeId));
        return <section className="ability-mobile-phase" key={phase.id}><header><div><small>阶段 {phase.order + 1}</small><strong>{phase.name}</strong></div><button type="button" aria-expanded={!collapsed} aria-label={`${collapsed ? '展开' : '折叠'}阶段 ${phase.name}`} onClick={() => onTogglePhase(phase.id)}>{collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button></header>{!collapsed ? <div className="ability-mobile-phase-list">{phaseNodes.map((node) => {
          const display: NodeDisplayState = getNodeDisplayState(node, state);
          return <button className={`ability-skill-node state-${display} ${selectedNodeId === node.id ? 'selected' : ''}`} type="button" role="treeitem" aria-label={`${node.name} ${NODE_STATE_LABELS[display]}`} aria-disabled={display === 'locked'} aria-selected={selectedNodeId === node.id} onClick={() => onSelectNode(node.id)} key={node.id}><span className="ability-node-icon">{display === 'locked' ? <LockKeyhole size={18} /> : display === 'mastered' ? <Sparkles size={18} /> : <span />}</span><strong>{node.name}</strong><small>{NODE_STATE_LABELS[display]}</small></button>;
        })}{phaseOutcomes.map((outcome) => <button className="ability-outcome-node" type="button" aria-label={`${outcome.title} 成果`} onClick={() => onSelectOutcome(outcome.id)} key={outcome.id}><Medal size={16} /><span>{outcome.title}</span></button>)}</div> : null}</section>;
      })}
    </div>}
  </section>;
}
