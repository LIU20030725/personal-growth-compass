import { useEffect, useRef, useState } from 'react';
import { Layers3, Medal, Plus, Route, Sparkles } from 'lucide-react';
import { getNodeDisplayState, getTreeProgress, hasPrerequisiteWarning, selectDefaultTree } from './abilityGraph';
import { SKILL_ROLE_LABELS } from './abilityConfig';
import { useAbilitySystem } from './useAbilitySystem';
import { useTaskSystem } from '../tasks/useTaskSystem';
import type { StorageLike } from '../lib/storage';
import type { TreeNodeFilter } from './types';
import { AbilityTreeStage } from './components/AbilityTreeStage';
import { AbilityNodePanel } from './components/AbilityNodePanel';
import { SkillLibrary } from './components/SkillLibrary';
import { NodeFormDialog, OutcomeFormDialog, ParallelGroupDialog, PhaseFormDialog, TreeFormDialog } from './components/AbilityForms';
import './AbilityModule.css';

type FormName = 'tree' | 'edit-tree' | 'phase' | 'node' | 'edit-node' | 'parallel' | 'outcome' | null;

type Props = {
  abilityStorage?: StorageLike;
  taskStorage?: StorageLike;
  initialTreeId?: string | null;
  onTreeChange?: (treeId: string, mode: 'push' | 'replace') => void;
};

export function AbilityModule({ abilityStorage, taskStorage, initialTreeId = null, onTreeChange }: Props) {
  const ability = useAbilitySystem({ storage: abilityStorage });
  const tasks = useTaskSystem({ storage: taskStorage });
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(() => {
    const requested = initialTreeId ? ability.state.trees.find((tree) => tree.id === initialTreeId && tree.status === 'active') : null;
    return requested?.id ?? selectDefaultTree(ability.state)?.id ?? null;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedPhaseIds, setCollapsedPhaseIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<TreeNodeFilter>('all');
  const [form, setForm] = useState<FormName>(null);
  const handledRouteTreeId = useRef<string | null | undefined>(undefined);
  const [routeNotice, setRouteNotice] = useState(() => {
    if (!initialTreeId) return '';
    return ability.state.trees.some((tree) => tree.id === initialTreeId && tree.status === 'active')
      ? ''
      : '技能树不存在，已返回能力首页';
  });

  const currentTree = ability.state.trees.find((tree) => tree.id === currentTreeId && tree.status === 'active') ?? null;
  const phases = ability.state.phases.filter((phase) => phase.skillTreeId === currentTreeId).sort((a, b) => a.order - b.order);
  const nodes = ability.state.nodes.filter((node) => node.skillTreeId === currentTreeId);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const focusedTrees = ability.state.trees.filter((tree) => tree.status === 'active' && tree.focusedRank !== null).sort((a, b) => (a.focusedRank as number) - (b.focusedRank as number));
  const availableTasks = tasks.state.tasks.filter((task) => task.status !== 'archived');

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
    setCollapsedPhaseIds(new Set());
    ability.visitTree(treeId);
    setRouteNotice('');
    onTreeChange?.(treeId, 'push');
  };

  const progress = currentTree ? getTreeProgress(ability.state, currentTree.id) : null;
  const currentPhase = phases.find((phase) => nodes.some((node) => node.phaseId === phase.id && node.progress !== 'mastered')) ?? phases[phases.length - 1];
  const selectedCriteria = selectedNode ? ability.state.masteryCriteria.filter((item) => item.skillNodeId === selectedNode.id) : [];
  const selectedLinks = selectedNode ? ability.state.taskLinks.filter((item) => item.skillNodeId === selectedNode.id) : [];
  const selectedOutcomes = selectedNode ? ability.state.outcomes.filter((item) => item.skillNodeId === selectedNode.id) : [];
  const displayState = selectedNode ? getNodeDisplayState(selectedNode, ability.state) : null;
  const focusedIds = focusedTrees.map((tree) => tree.id);
  const filterOptions: Array<{ value: TreeNodeFilter; label: string }> = [
    { value: 'all', label: '全部路线' },
    { value: 'current_phase', label: '当前阶段' },
    { value: 'in_progress', label: '成长中' },
    { value: 'locked', label: '未解锁' },
    { value: 'mastered', label: '已掌握' }
  ];

  return <section className="ability-module" aria-label="能力属性模块">
    <header className="ability-hero">
      <div><p className="eyebrow"><Sparkles size={17} /> Ability Tree · Manual First</p><h1>能力技能树</h1><p>把主技能与副技能变成可以持续生长的路线，用掌握标准、行动任务和真实成果证明进步。</p></div>
      <button className="ability-primary" type="button" onClick={() => setForm('tree')}><Plus size={18} />新建技能树</button>
    </header>

    {ability.persistenceError ? <div className="ability-error-banner" role="alert"><span>{ability.persistenceError}</span><button type="button" onClick={ability.clearPersistenceError}>关闭</button></div> : null}
    {routeNotice ? <div className="ability-route-notice" role="status">{routeNotice}</div> : null}

    {!currentTree ? <section className="ability-empty-state"><Route size={48} /><small>YOUR FIRST SKILL TREE</small><h2>从一项真正想成长的技能开始</h2><p>先由你创建技能树、阶段和节点。AI 辅助会在后续版本通过统一草案接口接入。</p><button className="ability-primary" type="button" onClick={() => setForm('tree')}>创建第一棵技能树</button></section> : <>
      <nav className="ability-focus-switcher" aria-label="重点技能快速切换"><span>重点技能</span>{focusedTrees.map((tree) => <button className={tree.id === currentTree.id ? 'active' : ''} type="button" aria-label={`打开技能树 ${tree.name}`} onClick={() => openTree(tree.id)} key={tree.id}>{tree.name}</button>)}</nav>

      <section className="ability-current-header" aria-label="当前技能树概览">
        <div><span>{SKILL_ROLE_LABELS[currentTree.role]}</span><h2>{currentTree.name}</h2><p>{currentTree.description || '为这棵技能树补充一句成长方向。'}</p></div>
        <div className="ability-current-stats"><strong>{progress?.percent ?? 0}%</strong><span>{progress?.mastered ?? 0}/{progress?.total ?? 0} 已掌握</span><small>当前：{currentPhase?.name ?? '等待添加阶段'}</small></div>
        <div className="ability-current-actions"><button type="button" onClick={() => setForm('edit-tree')}>编辑当前技能树</button><button type="button" onClick={() => setForm('phase')}><Layers3 size={16} />添加阶段</button><button type="button" onClick={() => setForm('node')} disabled={!phases.length}><Plus size={16} />添加技能节点</button><button type="button" onClick={() => setForm('parallel')} disabled={!nodes.length}>设置并行组</button><button type="button" onClick={() => setForm('outcome')}><Medal size={16} />记录成果</button></div>
      </section>

      <div className="ability-tree-toolbar" aria-label="技能树显示筛选">{filterOptions.map((option) => <button className={filter === option.value ? 'active' : ''} type="button" onClick={() => setFilter(option.value)} key={option.value}>{option.label}</button>)}</div>

      <div className="ability-workbench">
        <AbilityTreeStage state={ability.state} tree={currentTree} selectedNodeId={selectedNodeId} collapsedPhaseIds={collapsedPhaseIds} stateFilter={filter} onSelectNode={setSelectedNodeId} onSelectOutcome={(outcomeId) => { const outcome = ability.state.outcomes.find((item) => item.id === outcomeId); setSelectedNodeId(outcome?.skillNodeId ?? null); }} onTogglePhase={(phaseId) => setCollapsedPhaseIds((current) => { const next = new Set(current); next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId); return next; })} />
        <AbilityNodePanel node={selectedNode} displayState={displayState} prerequisiteWarning={selectedNode ? hasPrerequisiteWarning(selectedNode, ability.state) : false} criteria={selectedCriteria} taskLinks={selectedLinks} tasks={availableTasks} outcomes={selectedOutcomes} onStart={() => selectedNode && ability.startNode(selectedNode.id)} onAddCriterion={(description) => selectedNode && ability.addCriterion(selectedNode.id, description)} onToggleCriterion={ability.toggleCriterion} onConfirmMastery={(note) => selectedNode && ability.masterNode(selectedNode.id, note)} onDemote={() => selectedNode && ability.demoteNode(selectedNode.id)} onLinkTask={(taskId) => selectedNode && ability.linkTask(selectedNode.id, taskId)} onUnlinkTask={ability.unlinkTask} onRequestOutcome={() => setForm('outcome')} onToggleOutcomeVisibility={ability.setOutcomeTreeVisibility} onEdit={() => setForm('edit-node')} onArchive={() => { if (!selectedNode) return; ability.archiveNode(selectedNode.id); setSelectedNodeId(null); }} />
      </div>
    </>}

    <SkillLibrary state={ability.state} currentTreeId={currentTreeId} onOpenTree={openTree} onCreateTree={() => setForm('tree')} onArchiveTree={ability.archiveTree} onRestoreTree={ability.restoreTree} onChangeFocus={(treeId, focused) => ability.reorderFocusedTrees(focused ? [...focusedIds, treeId] : focusedIds.filter((id) => id !== treeId))} onReorderFocused={ability.reorderFocusedTrees} />

    {form === 'tree' ? <TreeFormDialog onClose={() => setForm(null)} onSave={(value) => { const focusedRank = value.focused ? focusedTrees.length + 1 : null; ability.applyTreeDraft({ tree: { name: value.name, description: value.description, role: value.role, status: 'active', focusedRank }, phases: [], nodes: [], dependencies: [], parallelGroups: [], masteryCriteria: [] }); setForm(null); }} /> : null}
    {form === 'edit-tree' && currentTree ? <TreeFormDialog initial={{ name: currentTree.name, description: currentTree.description, role: currentTree.role, focused: currentTree.focusedRank !== null }} onClose={() => setForm(null)} onSave={(value) => { ability.updateTree(currentTree.id, { name: value.name, description: value.description, role: value.role }); const isFocused = currentTree.focusedRank !== null; if (value.focused !== isFocused) ability.reorderFocusedTrees(value.focused ? [...focusedIds, currentTree.id] : focusedIds.filter((id) => id !== currentTree.id)); setForm(null); }} /> : null}
    {form === 'phase' && currentTree ? <PhaseFormDialog onClose={() => setForm(null)} onSave={(value) => { ability.addPhase({ skillTreeId: currentTree.id, ...value }); setForm(null); }} /> : null}
    {form === 'node' && currentTree ? <NodeFormDialog phases={phases} nodes={nodes} onClose={() => setForm(null)} onSave={(value) => { const id = ability.addNode({ skillTreeId: currentTree.id, phaseId: value.phaseId, name: value.name, description: value.description, progress: 'available', masteryNote: '' }, value.prerequisiteNodeIds); setSelectedNodeId(id); setForm(null); }} /> : null}
    {form === 'edit-node' && currentTree && selectedNode ? <NodeFormDialog initial={{ nodeId: selectedNode.id, name: selectedNode.name, description: selectedNode.description, phaseId: selectedNode.phaseId, prerequisiteNodeIds: ability.state.dependencies.filter((edge) => edge.dependentNodeId === selectedNode.id).map((edge) => edge.prerequisiteNodeId) }} phases={phases} nodes={nodes} onClose={() => setForm(null)} onSave={(value) => { ability.updateNode(selectedNode.id, { name: value.name, description: value.description, phaseId: value.phaseId }); ability.replaceNodeDependencies(selectedNode.id, value.prerequisiteNodeIds); setForm(null); }} /> : null}
    {form === 'parallel' && currentTree ? <ParallelGroupDialog phases={phases} nodes={nodes} onClose={() => setForm(null)} onSave={(value) => { ability.upsertParallelGroup({ skillTreeId: currentTree.id, ...value }); setForm(null); }} /> : null}
    {form === 'outcome' && currentTree ? <OutcomeFormDialog nodes={nodes} defaultNodeId={selectedNodeId} onClose={() => setForm(null)} onSave={(value) => { ability.addOutcome({ skillTreeId: currentTree.id, ...value }); setForm(null); }} /> : null}
  </section>;
}
