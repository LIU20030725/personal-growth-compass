import { useEffect, useMemo, useRef, useState } from 'react';
import { Ellipsis, Medal, Pencil, Plus, Route, Sparkles } from 'lucide-react';
import { getCurrentPhase, getNodeDisplayState, getPhaseProgress, getPrimaryParent, getTreeProgress, hasPrerequisiteWarning, selectDefaultTree } from './abilityGraph';
import { NODE_STATE_LABELS, SKILL_ROLE_LABELS } from './abilityConfig';
import { buildAbilityVisibleGraph } from './abilityView';
import { useAbilitySystem } from './useAbilitySystem';
import type { StorageLike } from '../lib/storage';
import type { TreeNodeFilter } from './types';
import { AbilityTreeStage } from './components/AbilityTreeStage';
import { AbilityNodePanel } from './components/AbilityNodePanel';
import { SkillLibrary } from './components/SkillLibrary';
import { NodeFormDialog, OutcomeFormDialog, PhaseFormDialog, TreeFormDialog } from './components/AbilityForms';
import './AbilityModule.css';

type FormName = 'tree' | 'edit-tree' | 'phase' | 'edit-phase' | 'node' | 'edit-node' | 'outcome' | null;

type Props = {
  abilityStorage?: StorageLike;
  taskStorage?: StorageLike;
  initialTreeId?: string | null;
  onTreeChange?: (treeId: string, mode: 'push' | 'replace') => void;
};

export function AbilityModule({ abilityStorage, initialTreeId = null, onTreeChange }: Props) {
  const ability = useAbilitySystem({ storage: abilityStorage });
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(() => {
    const requested = initialTreeId ? ability.state.trees.find((tree) => tree.id === initialTreeId && tree.status === 'active') : null;
    return requested?.id ?? selectDefaultTree(ability.state)?.id ?? null;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filter, setFilter] = useState<TreeNodeFilter>('all');
  const [form, setForm] = useState<FormName>(null);
  const [editMode, setEditMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [nodePhaseId, setNodePhaseId] = useState<string | undefined>(undefined);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'canvas' | 'linear'>(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 680px)').matches ? 'linear' : 'canvas');
  const handledRouteTreeId = useRef<string | null | undefined>(undefined);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreItemRef = useRef<HTMLButtonElement>(null);
  const [routeNotice, setRouteNotice] = useState(() => {
    if (!initialTreeId) return '';
    return ability.state.trees.some((tree) => tree.id === initialTreeId && tree.status === 'active')
      ? ''
      : '技能树不存在，已返回能力首页';
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const compact = window.matchMedia('(max-width: 680px)');
    const syncView = (event: MediaQueryListEvent | MediaQueryList) => setViewMode(event.matches ? 'linear' : 'canvas');
    syncView(compact);
    compact.addEventListener?.('change', syncView);
    return () => compact.removeEventListener?.('change', syncView);
  }, []);

  const currentTree = ability.state.trees.find((tree) => tree.id === currentTreeId && tree.status === 'active') ?? null;
  const phases = ability.state.phases.filter((phase) => phase.skillTreeId === currentTreeId).sort((a, b) => a.order - b.order);
  const nodes = ability.state.nodes.filter((node) => node.skillTreeId === currentTreeId);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const focusedTrees = ability.state.trees.filter((tree) => tree.status === 'active' && tree.focusedRank !== null).sort((a, b) => (a.focusedRank as number) - (b.focusedRank as number));

  useEffect(() => {
    if (currentTree) return;
    const next = selectDefaultTree(ability.state);
    setCurrentTreeId(next?.id ?? null);
    setSelectedNodeId(null);
    if (next) onTreeChange?.(next.id, 'replace');
  }, [ability.state, currentTree, onTreeChange]);

  useEffect(() => {
    if (handledRouteTreeId.current === initialTreeId) return;
    handledRouteTreeId.current = initialTreeId;
    if (!initialTreeId) return;
    if (ability.state.trees.some((tree) => tree.id === initialTreeId && tree.status === 'active')) {
      setCurrentTreeId(initialTreeId);
      setRouteNotice('');
      return;
    }
    const fallback = selectDefaultTree(ability.state);
    setCurrentTreeId(fallback?.id ?? null);
    setSelectedNodeId(null);
    setRouteNotice('技能树不存在，已返回能力首页');
    if (fallback) onTreeChange?.(fallback.id, 'replace');
  }, [ability.state, initialTreeId, onTreeChange]);

  const openTree = (treeId: string, nodeId?: string) => {
    setCurrentTreeId(treeId);
    setSelectedNodeId(nodeId ?? null);
    setDetailOpen(Boolean(nodeId));
    ability.visitTree(treeId);
    setRouteNotice('');
    setFilter('all');
    setEditMode(false);
    setMoreOpen(false);
    setNodePhaseId(undefined);
    setEditingPhaseId(null);
    onTreeChange?.(treeId, 'push');
  };

  const progress = currentTree ? getTreeProgress(ability.state, currentTree.id) : null;
  const currentPhase = currentTree ? getCurrentPhase(ability.state, currentTree.id) : null;
  const selectedCriteria = selectedNode ? ability.state.masteryCriteria.filter((item) => item.skillNodeId === selectedNode.id) : [];
  const selectedOutcomes = selectedNode ? ability.state.outcomes.filter((item) => item.skillNodeId === selectedNode.id) : [];
  const displayState = selectedNode ? getNodeDisplayState(selectedNode, ability.state) : null;
  const focusedIds = focusedTrees.map((tree) => tree.id);
  const visibleGraph = useMemo(
    () => currentTreeId ? buildAbilityVisibleGraph(ability.state, currentTreeId, filter, selectedNodeId) : null,
    [ability.state, currentTreeId, filter, selectedNodeId]
  );
  const visibleLinearNodes = useMemo(() => {
    return [...(visibleGraph?.nodes ?? [])].sort((a, b) => {
      const phaseA = phases.findIndex((phase) => phase.id === a.phaseId);
      const phaseB = phases.findIndex((phase) => phase.id === b.phaseId);
      return phaseA - phaseB || a.createdAt.localeCompare(b.createdAt);
    });
  }, [phases, visibleGraph?.nodes]);
  useEffect(() => {
    if (!selectedNodeId || visibleGraph?.selectedNodeId) return;
    setSelectedNodeId(null);
    setDetailOpen(false);
  }, [selectedNodeId, visibleGraph?.selectedNodeId]);
  const filterOptions: Array<{ value: TreeNodeFilter; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'next', label: '下一步' },
    { value: 'mastered', label: '已掌握' }
  ];

  return <section className="ability-module" aria-label="能力属性模块">
    <header className="ability-hero">
      <div><p className="eyebrow"><Sparkles size={17} /> Ability Tree · Manual First</p><h1>能力技能树</h1><p>把主技能与副技能变成可以持续生长的路线，用阶段、掌握标准和真实成果证明进步。</p></div>
      <button className="ability-primary" type="button" onClick={() => setForm('tree')}><Plus size={18} />新建技能树</button>
    </header>

    {ability.persistenceError ? <div className="ability-error-banner" role="alert"><span>{ability.persistenceError}</span><button type="button" onClick={ability.clearPersistenceError}>关闭</button></div> : null}
    {routeNotice ? <div className="ability-route-notice" role="status">{routeNotice}</div> : null}

    <SkillLibrary state={ability.state} currentTreeId={currentTreeId} onOpenTree={openTree} onCreateTree={() => setForm('tree')} onArchiveTree={ability.archiveTree} onRestoreTree={ability.restoreTree} onChangeFocus={(treeId, focused) => ability.reorderFocusedTrees(focused ? [...focusedIds, treeId] : focusedIds.filter((id) => id !== treeId))} onReorderFocused={ability.reorderFocusedTrees} />

    {!currentTree ? <section className="ability-empty-state"><Route size={48} /><small>YOUR FIRST SKILL TREE</small><h2>从一项真正想成长的技能开始</h2><p>先创建技能树，再逐步补充阶段、技能节点、掌握标准与学习资源。</p><button className="ability-primary" type="button" onClick={() => setForm('tree')}>创建第一棵技能树</button></section> : <>
      <section className="ability-current-header" aria-label="当前技能树概览">
        <div><span>{SKILL_ROLE_LABELS[currentTree.role]}</span><h2>{currentTree.name}</h2><p>{currentTree.description || '为这棵技能树补充一句成长方向。'}</p></div>
        <div className="ability-current-stats"><strong>{progress?.percent ?? 0}%</strong><span>{progress?.mastered ?? 0}/{progress?.total ?? 0} 已掌握</span><small>当前：{currentPhase?.name ?? '等待添加阶段'}</small></div>
        <div className="ability-current-actions">
          <button type="button" onClick={() => setForm('outcome')}><Medal size={16} />记录成果</button>
          <button className={editMode ? 'active' : ''} type="button" aria-pressed={editMode} onClick={() => { setEditMode((value) => !value); setMoreOpen(false); }}><Pencil size={16} />{editMode ? '完成编辑' : '编辑技能树'}</button>
          <div className="ability-more-actions">
            <button ref={moreTriggerRef} type="button" aria-haspopup="menu" aria-expanded={moreOpen} aria-label="更多技能树操作" onClick={() => setMoreOpen((value) => { const next = !value; if (next) queueMicrotask(() => moreItemRef.current?.focus()); return next; })}><Ellipsis size={18} /></button>
            {moreOpen ? <div className="ability-tree-action-menu" role="menu" onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); setMoreOpen(false); window.setTimeout(() => moreTriggerRef.current?.focus(), 0); }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') { event.preventDefault(); moreItemRef.current?.focus(); }
            }}><button ref={moreItemRef} role="menuitem" type="button" onClick={() => { setForm('edit-tree'); setMoreOpen(false); }}>编辑技能树资料</button></div> : null}
          </div>
        </div>
      </section>

      <div className="ability-tree-toolbar" aria-label="技能树显示筛选">{filterOptions.map((option) => <button className={filter === option.value ? 'active' : ''} type="button" onClick={() => setFilter(option.value)} key={option.value}>{option.label}</button>)}</div>

      <div className="ability-stage-view-switch" aria-label="技能路线视图">
        <button type="button" aria-pressed={viewMode === 'linear'} onClick={() => setViewMode(viewMode === 'canvas' ? 'linear' : 'canvas')}>{viewMode === 'canvas' ? '切换到线性路线' : '切换到技能树画布'}</button>
      </div>

      <div className={`ability-workbench ${detailOpen ? 'has-detail' : ''}`}>
        {viewMode === 'canvas' ? <AbilityTreeStage
          state={ability.state}
          tree={currentTree}
          editMode={editMode}
          selectedNodeId={selectedNodeId}
          stateFilter={filter}
          storage={abilityStorage}
          onSelectNode={(nodeId) => { setSelectedNodeId(nodeId); if (!nodeId) setDetailOpen(false); }}
          onSelectOutcome={(outcomeId) => { const outcome = ability.state.outcomes.find((item) => item.id === outcomeId); setSelectedNodeId(outcome?.skillNodeId ?? null); setDetailOpen(Boolean(outcome?.skillNodeId)); }}
          onAddPhase={() => setForm('phase')}
          onAddNode={(phaseId) => { setNodePhaseId(phaseId); setForm('node'); }}
          onEditPhase={(phaseId) => { setEditingPhaseId(phaseId); setForm('edit-phase'); }}
          onAddChild={(nodeId) => ability.addChildNode(nodeId)}
          onAddSibling={(nodeId) => {
            const node = ability.state.nodes.find((item) => item.id === nodeId);
            const parent = getPrimaryParent(ability.state, nodeId);
            return parent
              ? ability.addChildNode(parent.id)
              : ability.addNode({ skillTreeId: currentTree.id, phaseId: node?.phaseId ?? phases[0].id, name: '新技能', description: '', progress: 'available', masteryNote: '' });
          }}
          onAddParent={(nodeId) => {
            return ability.insertParentNode(nodeId);
          }}
          onRenameNode={(nodeId, name) => { const node = ability.state.nodes.find((item) => item.id === nodeId); if (node) ability.updateNode(nodeId, { name, description: node.description, phaseId: node.phaseId, requiredForPhase: node.requiredForPhase }); }}
          onDeleteBranch={ability.archiveNodeBranch}
          onReparent={ability.reparentNode}
          onConnectAuxiliary={ability.addAuxiliaryDependency}
          onMerge={ability.createParallelContinuation}
          onOpenDetails={(nodeId) => { setSelectedNodeId(nodeId); setDetailOpen(true); }}
          onUndo={ability.undo}
          canUndo={ability.canUndo}
        /> : <section className="ability-linear-route ability-linear-route--compact" data-testid="ability-linear-route" aria-label={`${currentTree.name}线性技能路线`}>
          {phases.map((phase) => {
            const phaseNodes = visibleLinearNodes.filter((node) => node.phaseId === phase.id);
            const phaseProgress = getPhaseProgress(ability.state, phase.id);
            return <section className="ability-linear-phase" key={phase.id} aria-labelledby={`ability-phase-${phase.id}`}>
              <header><span>{String(phase.order + 1).padStart(2, '0')}</span><div><h3 id={`ability-phase-${phase.id}`}>{phase.name}</h3><p>{phase.description || phase.estimatedDuration || '按顺序推进本阶段技能'}</p></div><strong>{phaseProgress.mastered}/{phaseProgress.required}</strong></header>
              {phaseNodes.length ? <ol>{phaseNodes.map((node, index) => {
                const state = getNodeDisplayState(node, ability.state);
                return <li key={node.id}><button data-testid="linear-skill-node" type="button" aria-current={selectedNodeId === node.id ? 'true' : undefined} onClick={() => { setSelectedNodeId(node.id); setDetailOpen(true); }}><i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i><strong>{node.name}</strong><span>{NODE_STATE_LABELS[state]}</span></button></li>;
              })}</ol> : <p className="ability-linear-empty">这个阶段还没有技能节点</p>}
            </section>;
          })}
          {!visibleLinearNodes.length ? <p className="ability-muted">当前筛选下没有技能节点。</p> : null}
        </section>}
        {detailOpen ? <AbilityNodePanel node={selectedNode} editMode={editMode} displayState={displayState} prerequisiteWarning={selectedNode ? hasPrerequisiteWarning(selectedNode, ability.state) : false} criteria={selectedCriteria} resources={ability.state.resources} resourceLinks={ability.state.resourceLinks} outcomes={selectedOutcomes} onClose={() => { setDetailOpen(false); setSelectedNodeId(null); }} onStart={() => selectedNode && ability.startNode(selectedNode.id)} onAddCriterion={(description) => selectedNode && ability.addCriterion(selectedNode.id, description)} onToggleCriterion={ability.toggleCriterion} onConfirmMastery={() => selectedNode && ability.masterNode(selectedNode.id, '')} onDemote={() => selectedNode && ability.demoteNode(selectedNode.id)} onAddResource={(input) => selectedNode && ability.addOrLinkResource(selectedNode.id, input)} onLinkResource={(resourceId) => selectedNode && ability.linkExistingResource(selectedNode.id, resourceId)} onUpdateResource={ability.updateResource} onUnlinkResource={ability.unlinkResource} onDeleteResource={ability.deleteResource} onRequestOutcome={() => setForm('outcome')} onToggleOutcomeVisibility={ability.setOutcomeTreeVisibility} onEdit={() => setForm('edit-node')} onArchive={() => { if (!selectedNode) return; ability.archiveNodeBranch(selectedNode.id); setSelectedNodeId(null); setDetailOpen(false); }} /> : null}
      </div>
    </>}

    {form === 'tree' ? <TreeFormDialog onClose={() => setForm(null)} onSave={(value) => { const focusedRank = value.focused ? focusedTrees.length + 1 : null; ability.applyTreeDraft({ tree: { name: value.name, description: value.description, role: value.role, status: 'active', focusedRank }, phases: [], nodes: [], dependencies: [], parallelGroups: [], masteryCriteria: [] }); setForm(null); }} /> : null}
    {form === 'edit-tree' && currentTree ? <TreeFormDialog initial={{ name: currentTree.name, description: currentTree.description, role: currentTree.role, focused: currentTree.focusedRank !== null }} onClose={() => setForm(null)} onSave={(value) => { ability.updateTree(currentTree.id, { name: value.name, description: value.description, role: value.role }); const isFocused = currentTree.focusedRank !== null; if (value.focused !== isFocused) ability.reorderFocusedTrees(value.focused ? [...focusedIds, currentTree.id] : focusedIds.filter((id) => id !== currentTree.id)); setForm(null); }} /> : null}
    {form === 'phase' && currentTree ? <PhaseFormDialog onClose={() => setForm(null)} onSave={(value) => { ability.addPhase({ skillTreeId: currentTree.id, ...value }); setForm(null); }} /> : null}
    {form === 'edit-phase' && currentTree && editingPhaseId ? <PhaseFormDialog initial={phases.find((phase) => phase.id === editingPhaseId)} onClose={() => { setEditingPhaseId(null); setForm(null); }} onSave={(value) => { ability.updatePhase(editingPhaseId, value); setEditingPhaseId(null); setForm(null); }} onDelete={() => { ability.removePhase(editingPhaseId); setEditingPhaseId(null); setForm(null); }} deleteDisabledReason={nodes.some((node) => node.phaseId === editingPhaseId) ? '请先移动或归档阶段内的技能节点' : undefined} /> : null}
    {form === 'node' && currentTree ? <NodeFormDialog phases={phases} nodes={nodes} defaultPhaseId={nodePhaseId} onClose={() => { setNodePhaseId(undefined); setForm(null); }} onSave={(value) => { const id = ability.addNode({ skillTreeId: currentTree.id, phaseId: value.phaseId, name: value.name, description: value.description, progress: 'available', masteryNote: '', requiredForPhase: value.requiredForPhase }, value.prerequisiteNodeIds); setSelectedNodeId(id); setNodePhaseId(undefined); setForm(null); }} /> : null}
    {form === 'edit-node' && currentTree && selectedNode ? <NodeFormDialog initial={{ nodeId: selectedNode.id, name: selectedNode.name, description: selectedNode.description, phaseId: selectedNode.phaseId, requiredForPhase: selectedNode.requiredForPhase, prerequisiteNodeIds: ability.state.dependencies.filter((edge) => edge.dependentNodeId === selectedNode.id).map((edge) => edge.prerequisiteNodeId) }} phases={phases} nodes={nodes} onClose={() => setForm(null)} onSave={(value) => { ability.updateNode(selectedNode.id, { name: value.name, description: value.description, phaseId: value.phaseId, requiredForPhase: value.requiredForPhase }); ability.replaceNodeDependencies(selectedNode.id, value.prerequisiteNodeIds); setForm(null); }} /> : null}
    {form === 'outcome' && currentTree ? <OutcomeFormDialog nodes={nodes} defaultNodeId={selectedNodeId} onClose={() => setForm(null)} onSave={(value) => { ability.addOutcome({ skillTreeId: currentTree.id, ...value }); setForm(null); }} /> : null}
  </section>;
}
