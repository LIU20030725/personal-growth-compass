import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialAbilityState, saveAbilityState } from './abilityStorage';
import { AbilityModule } from './AbilityModule';
import type { AbilityState } from './types';

const stamp = '2026-08-02T00:00:00.000Z';

function seededState(): AbilityState {
  return {
    ...createInitialAbilityState(),
    trees: [
      { id: 'frontend', name: 'React 全栈', description: '从网页基础到独立上线', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp },
      { id: 'writing', name: '自媒体写作', description: '稳定创作', role: 'side', status: 'active', focusedRank: 2, createdAt: stamp, updatedAt: stamp }
    ],
    phases: [
      { id: 'base', skillTreeId: 'frontend', name: '基础认知', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 },
      { id: 'practice', skillTreeId: 'frontend', name: '独立实践', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 1 },
      { id: 'writing-base', skillTreeId: 'writing', name: '写作基础', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 }
    ],
    nodes: [
      { id: 'html', skillTreeId: 'frontend', phaseId: 'base', name: 'HTML 基础', description: '语义化页面', progress: 'mastered', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'react', skillTreeId: 'frontend', phaseId: 'practice', name: 'React 状态管理', description: '管理复杂状态', progress: 'in_progress', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'deploy', skillTreeId: 'frontend', phaseId: 'practice', name: '部署网站', description: '公开访问', progress: 'available', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'article', skillTreeId: 'writing', phaseId: 'writing-base', name: '文章结构', description: '', progress: 'available', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp }
    ],
    dependencies: [
      { id: 'html-react', skillTreeId: 'frontend', prerequisiteNodeId: 'html', dependentNodeId: 'react' },
      { id: 'react-deploy', skillTreeId: 'frontend', prerequisiteNodeId: 'react', dependentNodeId: 'deploy' }
    ],
    masteryCriteria: [{ id: 'criterion', skillNodeId: 'react', description: '完成状态管理项目', satisfied: false, source: 'manual' }],
    outcomes: [{ id: 'site', skillTreeId: 'frontend', skillNodeId: 'react', title: '个人网站', description: '已经上线', occurredOn: '2026-08-01', showOnTree: true, createdAt: stamp, updatedAt: stamp }],
    lastVisitedTreeId: 'frontend'
  };
}

describe('AbilityModule', () => {
  beforeEach(() => localStorage.clear());

  it('renders a visible tree stage and opens node details on demand', async () => {
    saveAbilityState(localStorage, seededState());
    const { container } = render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    expect(screen.getByRole('heading', { name: '能力技能树' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'React 全栈交互画布' })).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: /HTML 基础 已掌握/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /React 状态管理 成长中/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /部署网站 可开始/ })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /个人网站 成果/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(2);
      expect(container.querySelectorAll('.react-flow__edge.ability-edge-aligned')).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('group', { name: /React 状态管理/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态管理/ }));
    const panel = screen.getByLabelText('技能节点详情');
    expect(within(panel).getByRole('heading', { name: 'React 状态管理' })).toBeInTheDocument();
    expect(within(panel).getByText('完成状态管理项目')).toBeInTheDocument();
  });

  it('keeps learning resources inside node details and removes task and rationale UI', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(await screen.findByRole('group', { name: /React 状态管理/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态管理/ }));
    const panel = screen.getByLabelText('技能节点详情');

    expect(within(panel).queryByText('关联任务')).not.toBeInTheDocument();
    expect(within(panel).queryByLabelText('掌握判断依据')).not.toBeInTheDocument();
    expect(within(panel).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      '掌握标准',
      '学习资源0',
      '真实成果'
    ]);

    fireEvent.click(within(panel).getByRole('button', { name: '收藏资源' }));
    fireEvent.change(within(panel).getByLabelText('资源链接'), { target: { value: 'https://example.com/react-course' } });
    fireEvent.change(within(panel).getByLabelText('资源标题'), { target: { value: 'React 实战课程' } });
    fireEvent.click(within(panel).getByRole('button', { name: '保存资源' }));

    expect(await within(panel).findByRole('link', { name: 'React 实战课程' })).toHaveAttribute('target', '_blank');
    expect(within(panel).getByText(/example\.com/)).toBeInTheDocument();
  });

  it('creates a tree, phase, and dependent node manually', async () => {
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    expect(screen.queryByText(/AI/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '创建第一棵技能树' }));
    fireEvent.change(screen.getByLabelText('技能树名称'), { target: { value: '摄影' } });
    fireEvent.change(screen.getByLabelText('技能角色'), { target: { value: 'side' } });
    fireEvent.click(screen.getByRole('button', { name: '保存技能树' }));
    expect(within(screen.getByLabelText('当前技能树概览')).getByRole('heading', { name: '摄影' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '编辑技能树' }));
    fireEvent.click(screen.getByRole('button', { name: '添加下一阶段' }));
    fireEvent.change(screen.getByLabelText('阶段名称'), { target: { value: '基础认知' } });
    fireEvent.click(screen.getByRole('button', { name: '保存阶段' }));
    expect(screen.getByRole('group', { name: '阶段 基础认知' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '在 基础认知 添加第一个节点' }));
    expect((screen.getByLabelText('所属阶段') as HTMLSelectElement).value).toMatch(/^phase-/);
    fireEvent.change(screen.getByLabelText('节点名称'), { target: { value: '曝光三要素' } });
    fireEvent.click(screen.getByRole('button', { name: '保存节点' }));
    expect(await screen.findByRole('group', { name: /曝光三要素 可开始/ })).toBeInTheDocument();
  });

  it('keeps mastery confirmation manual after all criteria are satisfied', async () => {
    const ability = seededState();
    saveAbilityState(localStorage, ability);
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(await screen.findByRole('group', { name: /React 状态管理/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态管理/ }));
    const panel = screen.getByLabelText('技能节点详情');
    fireEvent.click(within(panel).getByRole('checkbox', { name: '完成状态管理项目' }));
    expect(within(panel).getByText('标准已满足，仍需你确认掌握')).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: '确认已掌握' }));
    expect(await screen.findByRole('group', { name: /React 状态管理 已掌握/ })).toBeInTheDocument();
  });

  it('switches trees and filters the skill library', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(screen.getByRole('button', { name: '从技能库打开技能树 自媒体写作' }));
    expect(screen.getByRole('group', { name: '自媒体写作交互画布' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索技能树或节点'), { target: { value: 'React' } });
    const library = screen.getByLabelText('技能库');
    expect(within(library).getByText('React 全栈')).toBeInTheDocument();
    expect(within(library).queryByText('自媒体写作')).not.toBeInTheDocument();
    fireEvent.click(within(library).getByRole('button', { name: '从技能库打开技能树 React 全栈' }));
    fireEvent.click(await screen.findByRole('group', { name: /React 状态管理/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态管理/ }));
    expect(within(screen.getByLabelText('技能节点详情')).getByRole('heading', { name: 'React 状态管理' })).toBeInTheDocument();
  });

  it('opens a node from a cross-tree library search without losing selection or details', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} initialTreeId="writing" />);
    fireEvent.change(screen.getByLabelText('搜索技能树或节点'), { target: { value: 'React 状态管理' } });
    const library = screen.getByLabelText('技能库');
    fireEvent.click(within(library).getByRole('button', { name: '从技能库打开技能树 React 全栈' }));

    const panel = await screen.findByLabelText('技能节点详情');
    expect(within(panel).getByRole('heading', { name: 'React 状态管理' })).toBeInTheDocument();
  });

  it('does not run tree shortcuts from the header, detail controls, or an open dialog', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(await screen.findByRole('group', { name: /HTML 基础/ }));
    const initialNodes = JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}').nodes.length;

    const hero = screen.getByRole('heading', { name: '能力技能树' }).closest('header');
    expect(hero).not.toBeNull();
    const createTree = within(hero as HTMLElement).getByRole('button', { name: '新建技能树' });
    createTree.focus();
    fireEvent.keyDown(createTree, { key: 'Tab' });
    fireEvent.keyDown(createTree, { key: 'Enter' });
    expect(JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}').nodes).toHaveLength(initialNodes);

    fireEvent.click(await screen.findByRole('button', { name: /查看详情 HTML 基础/ }));
    const criterionInput = within(screen.getByLabelText('技能节点详情')).getByLabelText('新增掌握标准');
    criterionInput.focus();
    fireEvent.keyDown(criterionInput, { key: 'Delete' });
    expect(JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}').nodes.find((node: { id: string }) => node.id === 'html').archivedAt).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '更多技能树操作' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '编辑技能树资料' }));
    const dialog = screen.getByRole('dialog', { name: '编辑技能树' });
    const cancel = within(dialog).getByRole('button', { name: '取消' });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Delete' });
    expect(JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}').nodes.find((node: { id: string }) => node.id === 'html').archivedAt).toBeNull();
  });

  it('runs discoverable structural shortcuts only while the interactive canvas is focused', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(screen.getByRole('button', { name: '编辑技能树' }));
    fireEvent.click(await screen.findByRole('group', { name: /HTML 基础/ }));
    const canvas = screen.getByRole('group', { name: 'React 全栈交互画布' });
    canvas.focus();
    fireEvent.keyDown(canvas, { key: 'Enter', ctrlKey: true });

    const saved = JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}');
    const children = saved.dependencies.filter((edge: { prerequisiteNodeId: string; kind?: string }) => edge.prerequisiteNodeId === 'html' && (edge.kind ?? 'primary') === 'primary');
    expect(children).toHaveLength(2);
  });

  it('traps focus in every ability dialog, closes on Escape, and restores the trigger', async () => {
    const { container } = render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    const trigger = screen.getByRole('button', { name: '创建第一棵技能树' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '创建技能树' });
    const close = within(dialog).getByRole('button', { name: '关闭创建技能树' });
    const save = within(dialog).getByRole('button', { name: '保存技能树' });
    await waitFor(() => expect(screen.getByLabelText('技能树名称')).toHaveFocus());
    expect(container).toHaveAttribute('inert');

    close.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '创建技能树' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(container).not.toHaveAttribute('inert');
  });

  it('disables mastery and explains what evidence is missing', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} initialTreeId="writing" />);
    fireEvent.click(await screen.findByRole('group', { name: /文章结构/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 文章结构/ }));
    const panel = screen.getByLabelText('技能节点详情');
    fireEvent.click(within(panel).getByRole('button', { name: '开始学习' }));
    expect(within(panel).getByRole('button', { name: '确认已掌握' })).toBeDisabled();
    expect(within(panel).getByText('请先添加掌握标准或记录一项成果')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /文章结构 成长中/ })).toBeInTheDocument();
  });

  it('offers an operable linear route for a 40-node skill tree', async () => {
    const large = seededState();
    large.nodes = Array.from({ length: 40 }, (_, index) => ({
      id: `node-${index}`,
      skillTreeId: 'frontend',
      phaseId: index < 20 ? 'base' : 'practice',
      name: `技能 ${index + 1}`,
      description: '',
      progress: index < 3 ? 'mastered' as const : 'available' as const,
      requiredForPhase: true,
      masteryNote: '',
      archivedAt: null,
      createdAt: `${stamp}-${String(index).padStart(2, '0')}`,
      updatedAt: stamp
    }));
    large.dependencies = Array.from({ length: 39 }, (_, index) => ({
      id: `edge-${index}`,
      skillTreeId: 'frontend',
      prerequisiteNodeId: `node-${index}`,
      dependentNodeId: `node-${index + 1}`,
      kind: 'primary' as const
    }));
    large.masteryCriteria = [];
    large.outcomes = [];
    saveAbilityState(localStorage, large);
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);

    fireEvent.click(screen.getByRole('button', { name: '切换到线性路线' }));
    const route = screen.getByRole('region', { name: 'React 全栈线性技能路线' });
    expect(route).toHaveClass('ability-linear-route--compact');
    expect(route).toHaveAttribute('data-testid', 'ability-linear-route');
    expect(within(route).getAllByTestId('linear-skill-node')).toHaveLength(40);
    expect(within(route).getAllByRole('button', { name: /技能 \d+/ })).toHaveLength(40);
    fireEvent.click(within(route).getByRole('button', { name: /技能 40/ }));
    const detail = await screen.findByLabelText('技能节点详情');
    expect(within(detail).getByRole('heading', { name: '技能 40' })).toBeInTheDocument();
    fireEvent.click(within(detail).getByRole('button', { name: '关闭技能详情' }));
    expect(screen.queryByLabelText('技能节点详情')).not.toBeInTheDocument();
  });

  it('uses a compact skill library and exposes only the core tree actions and filters', async () => {
    saveAbilityState(localStorage, seededState());
    const { container } = render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    const library = screen.getByLabelText('技能库');
    const summary = screen.getByLabelText('当前技能树概览');
    expect(library.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(library).getAllByTestId('compact-skill-card').length).toBeLessThanOrEqual(6);
    expect(screen.queryByText('重点技能')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '记录成果' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑技能树' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '更多技能树操作' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '设置并行组' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '专注当前阶段' })).not.toBeInTheDocument();
    expect(within(container.querySelector('.ability-tree-toolbar') as HTMLElement).getAllByRole('button').map((button) => button.textContent)).toEqual(['全部', '下一步', '已掌握']);
  });

  it('keeps empty stages visible in the linear route', async () => {
    const ability = seededState();
    ability.phases.push({ id: 'empty-phase', skillTreeId: 'frontend', name: '发布复盘', description: '整理经验', estimatedDuration: '1 周', requiredNodePolicy: 'all_required', order: 2 });
    saveAbilityState(localStorage, ability);
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);

    fireEvent.click(screen.getByRole('button', { name: '切换到线性路线' }));

    const route = screen.getByRole('region', { name: 'React 全栈线性技能路线' });
    expect(within(route).getByRole('heading', { name: '发布复盘' })).toBeInTheDocument();
    expect(within(route).getByText('这个阶段还没有技能节点')).toBeInTheDocument();
  });

  it('sets whether a node is required for its stage from the edit dialog', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(screen.getByRole('button', { name: '编辑技能树' }));
    fireEvent.click(await screen.findByRole('group', { name: /React 状态管理/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态管理/ }));
    fireEvent.click(within(screen.getByLabelText('技能节点详情')).getByRole('button', { name: '编辑技能节点' }));

    const required = screen.getByRole('checkbox', { name: '作为阶段必修节点' });
    expect(required).toBeChecked();
    fireEvent.click(required);
    fireEvent.click(screen.getByRole('button', { name: '保存节点' }));

    const saved = JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}');
    expect(saved.nodes.find((node: { id: string }) => node.id === 'react').requiredForPhase).toBe(false);
  });

  it('prevents deleting a non-empty stage and removes an empty stage from its edit dialog', async () => {
    const ability = seededState();
    ability.phases.push({ id: 'empty-phase', skillTreeId: 'frontend', name: '发布复盘', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 2 });
    saveAbilityState(localStorage, ability);
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(screen.getByRole('button', { name: '编辑技能树' }));

    fireEvent.click(await screen.findByRole('button', { name: '编辑阶段 基础认知' }));
    expect(screen.getByRole('button', { name: '删除阶段' })).toBeDisabled();
    expect(screen.getByText('请先移动或归档阶段内的技能节点')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog', { name: '编辑学习阶段' }), { key: 'Escape' });

    fireEvent.click(await screen.findByRole('button', { name: '编辑阶段 发布复盘' }));
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: '删除阶段' }));
    expect(screen.queryByRole('group', { name: '阶段 发布复盘' })).not.toBeInTheDocument();
  });

  it('operates the tree action menu with focus and Escape semantics', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    const trigger = screen.getByRole('button', { name: '更多技能树操作' });
    fireEvent.click(trigger);
    const item = screen.getByRole('menuitem', { name: '编辑技能树资料' });
    await waitFor(() => expect(item).toHaveFocus());
    fireEvent.keyDown(item, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('edits the current tree and archives a related skill node without deleting history', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(screen.getByRole('button', { name: '更多技能树操作' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '编辑技能树资料' }));
    fireEvent.change(screen.getByLabelText('技能树名称'), { target: { value: 'React 产品开发' } });
    fireEvent.click(screen.getByRole('button', { name: '保存技能树' }));
    expect(within(screen.getByLabelText('当前技能树概览')).getByRole('heading', { name: 'React 产品开发' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '编辑技能树' }));
    fireEvent.click(await screen.findByRole('group', { name: /React 状态管理/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态管理/ }));
    const panel = screen.getByLabelText('技能节点详情');
    fireEvent.click(within(panel).getByRole('button', { name: '编辑技能节点' }));
    fireEvent.change(screen.getByLabelText('节点名称'), { target: { value: 'React 状态架构' } });
    fireEvent.click(screen.getByRole('button', { name: '保存节点' }));
    expect(await screen.findByRole('group', { name: /React 状态架构 成长中/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('group', { name: /React 状态架构/ }));
    fireEvent.click(await screen.findByRole('button', { name: /查看详情 React 状态架构/ }));
    fireEvent.click(within(screen.getByLabelText('技能节点详情')).getByRole('button', { name: '归档技能节点' }));
    expect(screen.queryByRole('group', { name: /React 状态架构/ })).not.toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}');
    expect(saved.nodes.find((node: { id: string }) => node.id === 'react').archivedAt).not.toBeNull();
    expect(saved.outcomes).toHaveLength(1);
  });

  it('adds repeated child nodes from the same selected plus button', async () => {
    saveAbilityState(localStorage, seededState());
    render(<AbilityModule abilityStorage={localStorage} taskStorage={localStorage} />);
    fireEvent.click(screen.getByRole('button', { name: '编辑技能树' }));
    fireEvent.click(await screen.findByRole('group', { name: /HTML 基础/ }));
    const addChild = await screen.findByRole('button', { name: '为 HTML 基础 添加子节点' });

    fireEvent.click(addChild);
    fireEvent.click(await screen.findByRole('button', { name: '为 HTML 基础 添加子节点' }));

    const saved = JSON.parse(localStorage.getItem('dice-life.ability.v1') ?? '{}');
    const children = saved.dependencies.filter((edge: { prerequisiteNodeId: string; kind?: string }) => edge.prerequisiteNodeId === 'html' && (edge.kind ?? 'primary') === 'primary');
    expect(children).toHaveLength(3);
    await waitFor(() => expect(screen.getAllByRole('group', { name: /新技能 可开始/ })).toHaveLength(2));
  });
});
