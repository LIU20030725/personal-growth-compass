import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ExternalLink, MoreHorizontal, Plus, X } from 'lucide-react';
import { inferResourceType, normalizeResourceUrl } from '../abilityResources';
import type { ResourceType, SkillResource, SkillResourceLink } from '../types';
import type { SkillResourceInput } from '../abilityEngine';

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  video: '视频',
  article: '文章',
  document: '文档',
  course: '课程',
  tool: '工具',
  other: '其他'
};

type Props = {
  nodeId: string;
  resources: SkillResource[];
  resourceLinks: SkillResourceLink[];
  onAdd: (input: SkillResourceInput) => void;
  onLink: (resourceId: string) => void;
  onUpdate: (resourceId: string, patch: { title: string; note: string }) => void;
  onUnlink: (linkId: string) => void;
  onDelete: (resourceId: string) => void;
};

export function AbilityResourceSection(props: Props) {
  const [composer, setComposer] = useState<'new' | 'existing' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('article');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [managedResourceId, setManagedResourceId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [error, setError] = useState('');
  const managedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const errorId = `ability-resource-error-${props.nodeId}`;

  useEffect(() => {
    if (!managedResourceId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (managedTriggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setManagedResourceId(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [managedResourceId]);

  const closeMenu = () => {
    setManagedResourceId(null);
    window.setTimeout(() => managedTriggerRef.current?.focus(), 0);
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !items.length) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
  };

  const nodeLinks = props.resourceLinks.filter((link) => link.skillNodeId === props.nodeId);
  const linkedIds = new Set(nodeLinks.map((link) => link.resourceId));
  const linkedResources = nodeLinks
    .map((link) => props.resources.find((resource) => resource.id === link.resourceId))
    .filter((resource): resource is SkillResource => Boolean(resource));
  const libraryResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return props.resources.filter((resource) => !linkedIds.has(resource.id) && (!normalizedQuery ||
      resource.title.toLowerCase().includes(normalizedQuery) ||
      resource.sourceDomain.toLowerCase().includes(normalizedQuery) ||
      resource.note.toLowerCase().includes(normalizedQuery)));
  }, [linkedIds, props.resources, query]);
  const shownResources = expanded ? linkedResources : linkedResources.slice(0, 3);

  const saveNew = (event: FormEvent) => {
    event.preventDefault();
    try {
      normalizeResourceUrl(url);
      if (!title.trim()) throw new Error('请填写资源标题');
      props.onAdd({ url: url.trim(), title: title.trim(), type, note: note.trim() });
      setUrl('');
      setTitle('');
      setType('article');
      setNote('');
      setError('');
      setComposer(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '资源保存失败');
    }
  };

  return <section className="ability-detail-section ability-resource-section">
    <div className="ability-detail-heading">
      <h3>学习资源<span>{linkedResources.length}</span></h3>
      <button type="button" aria-label="收藏资源" onClick={() => { setComposer((current) => current === 'new' ? null : 'new'); setError(''); }}><Plus size={15} />收藏</button>
    </div>

    {composer === 'new' ? <form className="ability-resource-composer" onSubmit={saveNew}>
      <div className="ability-resource-composer-title"><strong>粘贴新链接</strong><button type="button" aria-label="关闭资源表单" onClick={() => setComposer(null)}><X size={15} /></button></div>
      <label><span>链接</span><input autoFocus aria-label="资源链接" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} inputMode="url" value={url} onBlur={() => { if (url.trim()) { try { setType(inferResourceType(url)); } catch { /* Show the validation on submit. */ } } }} onChange={(event) => { setUrl(event.target.value); setError(''); }} placeholder="https://" /></label>
      <label><span>标题</span><input aria-label="资源标题" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>类型</span><select aria-label="资源类型" value={type} onChange={(event) => setType(event.target.value as ResourceType)}>{Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>学习备注</span><textarea aria-label="资源学习备注" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {error ? <p id={errorId} className="ability-form-error" role="alert">{error}</p> : null}
      <div className="ability-resource-composer-actions"><button type="button" onClick={() => setComposer('existing')}>从资源库选择</button><button className="ability-primary" type="submit">保存资源</button></div>
    </form> : null}

    {composer === 'existing' ? <div className="ability-resource-composer">
      <div className="ability-resource-composer-title"><strong>从资源库选择</strong><button type="button" aria-label="关闭资源库" onClick={() => setComposer(null)}><X size={15} /></button></div>
      <input aria-label="搜索资源库" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、域名或备注" />
      <select aria-label="选择学习资源" value={selectedResourceId} onChange={(event) => setSelectedResourceId(event.target.value)}><option value="">选择资源</option>{libraryResources.map((resource) => <option value={resource.id} key={resource.id}>{resource.title} · {resource.sourceDomain}</option>)}</select>
      <div className="ability-resource-composer-actions"><button type="button" onClick={() => setComposer('new')}>粘贴新链接</button><button className="ability-primary" type="button" disabled={!selectedResourceId} onClick={() => { props.onLink(selectedResourceId); setSelectedResourceId(''); setComposer(null); }}>关联到节点</button></div>
    </div> : null}

    {linkedResources.length ? <ul className="ability-resource-list">{shownResources.map((resource) => {
      const currentLink = nodeLinks.find((link) => link.resourceId === resource.id);
      const otherLinkCount = props.resourceLinks.filter((link) => link.resourceId === resource.id && link.skillNodeId !== props.nodeId).length;
      const editing = editingResourceId === resource.id;
      return <li key={resource.id}>
        {editing ? <form onSubmit={(event) => { event.preventDefault(); props.onUpdate(resource.id, { title: editTitle, note: editNote }); setEditingResourceId(null); }}>
          <input aria-label={`编辑资源标题 ${resource.title}`} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
          <textarea aria-label={`编辑资源备注 ${resource.title}`} value={editNote} onChange={(event) => setEditNote(event.target.value)} />
          <div><button type="button" onClick={() => setEditingResourceId(null)}>取消</button><button type="submit">保存</button></div>
        </form> : <>
          <div className="ability-resource-main"><a href={resource.url} target="_blank" rel="noreferrer">{resource.title}<ExternalLink size={13} /></a><span>{RESOURCE_TYPE_LABELS[resource.type]} · {resource.sourceDomain}</span>{resource.note ? <p>{resource.note}</p> : null}</div>
          <button type="button" aria-haspopup="menu" aria-expanded={managedResourceId === resource.id} aria-label={`管理资源 ${resource.title}`} onClick={(event) => { managedTriggerRef.current = event.currentTarget; setManagedResourceId((current) => { const next = current === resource.id ? null : resource.id; if (next) window.setTimeout(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus(), 0); return next; }); }}><MoreHorizontal size={17} /></button>
          {managedResourceId === resource.id ? <div ref={menuRef} className="ability-resource-menu" role="menu" onKeyDown={handleMenuKeyDown}>
            <button role="menuitem" type="button" onClick={() => { setEditTitle(resource.title); setEditNote(resource.note); setEditingResourceId(resource.id); setManagedResourceId(null); }}>编辑标题与备注</button>
            <button role="menuitem" type="button" onClick={() => currentLink && props.onUnlink(currentLink.id)}>从当前节点移除</button>
            <button role="menuitem" type="button" disabled={otherLinkCount > 0} title={otherLinkCount > 0 ? `仍被 ${otherLinkCount} 个节点使用` : undefined} onClick={() => {
              if (!window.confirm('删除后无法恢复，确定删除该资源吗？')) return;
              if (currentLink) props.onUnlink(currentLink.id);
              props.onDelete(resource.id);
            }}>删除资源</button>
          </div> : null}
        </>}
      </li>;
    })}</ul> : <p className="ability-muted">还没有收藏学习资源。</p>}
    {linkedResources.length > 3 ? <button className="ability-resource-expand" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? '收起' : '查看全部'}</button> : null}
  </section>;
}
