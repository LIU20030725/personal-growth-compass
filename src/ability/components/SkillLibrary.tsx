import { useMemo, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Pin, PinOff, RotateCcw, Search } from 'lucide-react';
import { SKILL_ROLE_LABELS } from '../abilityConfig';
import { getTreeProgress } from '../abilityGraph';
import type { AbilityState, SkillRole } from '../types';

type Filter = 'all' | SkillRole | 'archived';
type Sort = 'updated' | 'custom' | 'name';

type Props = {
  state: AbilityState;
  currentTreeId: string | null;
  onOpenTree: (treeId: string, nodeId?: string) => void;
  onCreateTree: () => void;
  onArchiveTree: (treeId: string) => void;
  onRestoreTree: (treeId: string) => void;
  onChangeFocus: (treeId: string, focused: boolean) => void;
  onReorderFocused: (orderedIds: string[]) => void;
};

export function SkillLibrary(props: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('updated');
  const focusedIds = props.state.trees.filter((tree) => tree.status === 'active' && tree.focusedRank !== null).sort((a, b) => (a.focusedRank as number) - (b.focusedRank as number)).map((tree) => tree.id);
  const trees = useMemo(() => props.state.trees.filter((tree) => {
    if (filter === 'archived' ? tree.status !== 'archived' : tree.status !== 'active') return false;
    if (filter !== 'all' && filter !== 'archived' && tree.role !== filter) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLocaleLowerCase();
    return tree.name.toLocaleLowerCase().includes(needle) || props.state.nodes.some((node) => node.skillTreeId === tree.id && node.name.toLocaleLowerCase().includes(needle));
  }).sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'zh-CN');
    if (sort === 'custom') return (a.focusedRank ?? Number.MAX_SAFE_INTEGER) - (b.focusedRank ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'zh-CN');
    return b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'zh-CN');
  }), [filter, props.state.nodes, props.state.trees, query, sort]);

  const moveFocused = (treeId: string, direction: -1 | 1) => {
    const index = focusedIds.indexOf(treeId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= focusedIds.length) return;
    const next = [...focusedIds];
    [next[index], next[target]] = [next[target], next[index]];
    props.onReorderFocused(next);
  };

  return <section className="ability-library" aria-label="完整技能库">
    <header className="ability-library-header"><div><small>Skill Library</small><h2>完整技能库</h2></div><button className="ability-primary" type="button" onClick={props.onCreateTree}>新建技能树</button></header>
    <div className="ability-library-tools">
      <label className="ability-search"><Search size={17} /><input aria-label="搜索技能树或节点" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索技能树或节点" /></label>
      <select aria-label="技能树角色筛选" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="all">全部技能</option><option value="main">主技能</option><option value="side">副技能</option><option value="exploring">探索技能</option><option value="archived">已归档</option></select>
      <select aria-label="技能树排序" value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="updated">最近更新</option><option value="custom">用户排序</option><option value="name">名称排序</option></select>
    </div>
    {trees.length ? <div className="ability-library-grid">{trees.map((tree) => {
      const progress = getTreeProgress(props.state, tree.id);
      const latestOutcome = props.state.outcomes.filter((item) => item.skillTreeId === tree.id).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0];
      const currentPhase = props.state.phases.filter((phase) => phase.skillTreeId === tree.id).sort((a, b) => a.order - b.order).find((phase) => props.state.nodes.some((node) => node.phaseId === phase.id && node.progress !== 'mastered'));
      return <article className={`ability-library-card ${props.currentTreeId === tree.id ? 'current' : ''}`} key={tree.id}>
        <button className="ability-library-open" type="button" aria-label={`从技能库打开技能树 ${tree.name}`} onClick={() => { const needle = query.trim().toLocaleLowerCase(); const matchedNode = needle ? props.state.nodes.find((node) => node.skillTreeId === tree.id && node.name.toLocaleLowerCase().includes(needle)) : undefined; props.onOpenTree(tree.id, matchedNode?.id); }}><span>{SKILL_ROLE_LABELS[tree.role]}</span><h3>{tree.name}</h3><p>{tree.description || '还没有填写技能说明'}</p><div className="ability-card-progress"><i style={{ width: `${progress.percent}%` }} /><small>{progress.mastered}/{progress.total} 已掌握</small></div><dl><div><dt>当前阶段</dt><dd>{currentPhase?.name ?? '路线完成'}</dd></div><div><dt>最新成果</dt><dd>{latestOutcome?.title ?? '尚未记录'}</dd></div></dl></button>
        <footer>{tree.status === 'archived' ? <button type="button" onClick={() => props.onRestoreTree(tree.id)}><RotateCcw size={15} />恢复</button> : <><button type="button" onClick={() => props.onChangeFocus(tree.id, tree.focusedRank === null)}>{tree.focusedRank === null ? <><Pin size={15} />置顶</> : <><PinOff size={15} />取消置顶</>}</button>{tree.focusedRank !== null ? <><button type="button" aria-label={`上移重点技能 ${tree.name}`} onClick={() => moveFocused(tree.id, -1)}><ArrowUp size={15} /></button><button type="button" aria-label={`下移重点技能 ${tree.name}`} onClick={() => moveFocused(tree.id, 1)}><ArrowDown size={15} /></button></> : null}<button type="button" onClick={() => props.onArchiveTree(tree.id)}><Archive size={15} />归档</button></>}</footer>
      </article>;
    })}</div> : <div className="ability-library-empty"><p>没有符合条件的技能树。</p><button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>清除筛选</button></div>}
  </section>;
}
