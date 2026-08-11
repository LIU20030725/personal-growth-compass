import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Archive, ArrowDown, ArrowUp, Ellipsis, Pin, PinOff, Plus, RotateCcw, Search } from 'lucide-react';
import { getCurrentPhase, getTreeProgress } from '../abilityGraph';
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

const roleFilters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部技能' },
  { value: 'main', label: '主技能' },
  { value: 'side', label: '副技能' },
  { value: 'exploring', label: '探索技能' },
  { value: 'archived', label: '已归档' }
];

export function SkillLibrary(props: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('updated');
  const [managedTreeId, setManagedTreeId] = useState<string | null>(null);
  const managedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (event.key === 'Escape') {
      event.preventDefault();
      setManagedTreeId(null);
      window.setTimeout(() => managedTriggerRef.current?.focus(), 0);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !items.length) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
  };
  const focusedIds = props.state.trees
    .filter((tree) => tree.status === 'active' && tree.focusedRank !== null)
    .sort((a, b) => (a.focusedRank as number) - (b.focusedRank as number))
    .map((tree) => tree.id);
  const trees = useMemo(() => props.state.trees.filter((tree) => {
    if (filter === 'archived' ? tree.status !== 'archived' : tree.status !== 'active') return false;
    if (filter !== 'all' && filter !== 'archived' && tree.role !== filter) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLocaleLowerCase();
    return tree.name.toLocaleLowerCase().includes(needle)
      || props.state.nodes.some((node) => node.skillTreeId === tree.id && node.name.toLocaleLowerCase().includes(needle));
  }).sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'zh-CN');
    if (sort === 'custom') return (a.focusedRank ?? Number.MAX_SAFE_INTEGER) - (b.focusedRank ?? Number.MAX_SAFE_INTEGER)
      || a.name.localeCompare(b.name, 'zh-CN');
    return (a.focusedRank === null ? 1 : 0) - (b.focusedRank === null ? 1 : 0)
      || b.updatedAt.localeCompare(a.updatedAt)
      || a.name.localeCompare(b.name, 'zh-CN');
  }), [filter, props.state.nodes, props.state.trees, query, sort]);
  const visibleTrees = expanded || query.trim() || filter !== 'all' ? trees : trees.slice(0, 6);

  const moveFocused = (treeId: string, direction: -1 | 1) => {
    const index = focusedIds.indexOf(treeId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= focusedIds.length) return;
    const next = [...focusedIds];
    [next[index], next[target]] = [next[target], next[index]];
    props.onReorderFocused(next);
  };

  return <section className={`ability-library-rail ${expanded ? 'is-expanded' : ''}`} aria-label="技能库">
    <header className="ability-library-rail-header">
      <div><small>SKILL LIBRARY</small><strong>技能库</strong></div>
      <label className="ability-library-search"><Search size={15} /><input aria-label="搜索技能树或节点" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索技能或节点" /></label>
      <div className="ability-library-rail-actions">
        <button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? '收起' : '查看全部'}</button>
        <button className="ability-primary" type="button" onClick={props.onCreateTree}><Plus size={15} />新建</button>
      </div>
    </header>
    {expanded ? <div className="ability-library-filters">
      <select aria-label="技能树角色筛选" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>{roleFilters.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
      <select aria-label="技能树排序" value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="updated">最近更新</option><option value="custom">置顶顺序</option><option value="name">名称排序</option></select>
    </div> : null}
    {visibleTrees.length ? <div className="ability-library-strip">{visibleTrees.map((tree) => {
      const progress = getTreeProgress(props.state, tree.id);
      const currentPhase = getCurrentPhase(props.state, tree.id);
      const needle = query.trim().toLocaleLowerCase();
      const matchedNode = needle ? props.state.nodes.find((node) => node.skillTreeId === tree.id && node.name.toLocaleLowerCase().includes(needle)) : undefined;
      return <article className={`ability-library-compact ${props.currentTreeId === tree.id ? 'current' : ''}`} key={tree.id}>
        <button
          className="ability-library-compact-card"
          data-testid="compact-skill-card"
          type="button"
          aria-label={`从技能库打开技能树 ${tree.name}`}
          onClick={() => props.onOpenTree(tree.id, matchedNode?.id)}
        >
          <span><strong>{tree.name}</strong><small>{progress.percent}%</small></span>
          <span className="ability-library-phase">{currentPhase?.name ?? (progress.total ? '路线完成' : '等待添加阶段')}</span>
          <i><b style={{ width: `${progress.percent}%` }} /></i>
        </button>
        <button className="ability-library-more" type="button" aria-haspopup="menu" aria-expanded={managedTreeId === tree.id} aria-label={`管理技能树 ${tree.name}`} onClick={(event) => { managedTriggerRef.current = event.currentTarget; setManagedTreeId((value) => { const next = value === tree.id ? null : tree.id; if (next) window.setTimeout(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus(), 0); return next; }); }}><Ellipsis size={17} /></button>
        {managedTreeId === tree.id ? <div ref={menuRef} className="ability-library-menu" role="menu" onKeyDown={handleMenuKeyDown}>
          {tree.status === 'archived' ? <button role="menuitem" type="button" onClick={() => { props.onRestoreTree(tree.id); setManagedTreeId(null); }}><RotateCcw size={14} />恢复</button> : <>
            <button role="menuitem" type="button" onClick={() => { props.onChangeFocus(tree.id, tree.focusedRank === null); setManagedTreeId(null); }}>{tree.focusedRank === null ? <><Pin size={14} />置顶</> : <><PinOff size={14} />取消置顶</>}</button>
            {tree.focusedRank !== null ? <><button role="menuitem" type="button" onClick={() => moveFocused(tree.id, -1)}><ArrowUp size={14} />上移</button><button role="menuitem" type="button" onClick={() => moveFocused(tree.id, 1)}><ArrowDown size={14} />下移</button></> : null}
            <button role="menuitem" type="button" onClick={() => { props.onArchiveTree(tree.id); setManagedTreeId(null); }}><Archive size={14} />归档</button>
          </>}
        </div> : null}
      </article>;
    })}</div> : <div className="ability-library-empty"><p>没有符合条件的技能树。</p><button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>清除筛选</button></div>}
  </section>;
}
