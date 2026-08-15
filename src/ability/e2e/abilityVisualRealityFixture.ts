const stamp = '2026-08-15T00:00:00.000Z';

export function abilityVisualRealityState() {
  const nodes = [
    ['audience', 'foundation', '用户画像与内容定位', '明确 25—34 岁职场人的真实困扰', 'mastered', true],
    ['promise', 'foundation', '账号价值主张与差异化', '用一句话说清关注理由', 'mastered', true],
    ['pillars', 'foundation', '三条内容支柱设计', '形成可持续的选题边界', 'in_progress', true],
    ['backlog', 'foundation', '建立 30 条真实选题库', '从评论、搜索和访谈中收集问题', 'available', false],
    ['script', 'production', '叙事型长视频脚本', '完成冲突—转折—结论的完整结构', 'in_progress', true],
    ['hook', 'production', '短视频前三秒钩子', '用结果、冲突或反常识建立注意力', 'available', true],
    ['shooting', 'production', '手机拍摄构图与收音', '在普通房间完成稳定可用的画面', 'available', true],
    ['editing', 'production', '剪辑节奏与信息密度', '删掉停顿并保持重点可感知', 'available', true],
    ['cover', 'production', '封面标题与发布文案', '让标题准确承诺内容价值', 'available', false],
    ['experiment', 'growth', '连续四周发布 A/B 实验', '每周发布两条并只改变一个变量', 'available', true],
    ['review', 'growth', '周度数据复盘与迭代', '根据完播、收藏和评论调整下一周', 'available', true],
    ['pricing', 'growth', '商业合作报价与交付边界', '形成可复用的报价单和验收清单', 'available', false]
  ] as const;

  return {
    schemaVersion: 2,
    trees: [{
      id: 'creator-system',
      name: '个人品牌内容增长系统',
      description: '从找到真实受众，到稳定创作、复盘增长并建立可持续收入',
      role: 'main',
      status: 'active',
      focusedRank: 1,
      createdAt: stamp,
      updatedAt: stamp
    }],
    phases: [
      { id: 'foundation', skillTreeId: 'creator-system', name: '定位与内容基础', description: '先知道为谁解决什么问题', estimatedDuration: '2 周', requiredNodePolicy: 'all_required', order: 0 },
      { id: 'production', skillTreeId: 'creator-system', name: '创作生产系统', description: '把选题稳定变成可发布作品', estimatedDuration: '4 周', requiredNodePolicy: 'all_required', order: 1 },
      { id: 'growth', skillTreeId: 'creator-system', name: '增长与商业验证', description: '用真实反馈迭代并验证价值', estimatedDuration: '6 周', requiredNodePolicy: 'all_required', order: 2 }
    ],
    nodes: nodes.map(([id, phaseId, name, description, progress, requiredForPhase], index) => ({
      id,
      skillTreeId: 'creator-system',
      phaseId,
      name,
      description,
      progress,
      requiredForPhase,
      masteryNote: id === 'audience' ? '完成 8 次用户访谈并整理高频问题' : '',
      archivedAt: null,
      createdAt: `${stamp}-${String(index).padStart(2, '0')}`,
      updatedAt: stamp
    })),
    dependencies: [
      ['audience-promise', 'audience', 'promise'],
      ['audience-pillars', 'audience', 'pillars'],
      ['pillars-backlog', 'pillars', 'backlog'],
      ['promise-script', 'promise', 'script'],
      ['pillars-hook', 'pillars', 'hook'],
      ['pillars-shooting', 'pillars', 'shooting'],
      ['script-editing', 'script', 'editing'],
      ['hook-editing', 'hook', 'editing', 'auxiliary'],
      ['shooting-editing', 'shooting', 'editing', 'auxiliary'],
      ['editing-cover', 'editing', 'cover'],
      ['editing-experiment', 'editing', 'experiment'],
      ['cover-experiment', 'cover', 'experiment', 'auxiliary'],
      ['experiment-review', 'experiment', 'review'],
      ['review-pricing', 'review', 'pricing']
    ].map(([id, prerequisiteNodeId, dependentNodeId, kind = 'primary']) => ({ id, skillTreeId: 'creator-system', prerequisiteNodeId, dependentNodeId, kind })),
    parallelGroups: [{
      id: 'production-parallel',
      skillTreeId: 'creator-system',
      phaseId: 'production',
      name: '脚本、表达与拍摄并行练习',
      nodeIds: ['script', 'hook', 'shooting'],
      parentNodeId: 'pillars',
      continuationNodeId: 'editing'
    }],
    masteryCriteria: [
      { id: 'criterion-pillars', skillNodeId: 'pillars', description: '三条内容支柱各能列出至少 10 个不重复选题', satisfied: false, source: 'manual' },
      { id: 'criterion-script-1', skillNodeId: 'script', description: '完成 3 篇 1200 字以上可拍摄脚本', satisfied: true, source: 'manual' },
      { id: 'criterion-script-2', skillNodeId: 'script', description: '邀请 2 位目标受众复述视频核心观点', satisfied: false, source: 'manual' },
      { id: 'criterion-experiment', skillNodeId: 'experiment', description: '连续四周每周发布两条作品并记录变量', satisfied: false, source: 'manual' }
    ],
    taskLinks: [{ id: 'legacy-task-link', skillNodeId: 'script', taskId: 'legacy-script-task' }],
    outcomes: [
      { id: 'outcome-interviews', skillTreeId: 'creator-system', skillNodeId: 'audience', title: '完成 8 次目标用户访谈', description: '整理出 23 个高频困扰和原话', occurredOn: '2026-07-18', showOnTree: true, createdAt: stamp, updatedAt: stamp },
      { id: 'outcome-video', skillTreeId: 'creator-system', skillNodeId: 'script', title: '首条叙事视频获得 1,286 次收藏', description: '发布 7 天累计 18,420 次播放', occurredOn: '2026-08-09', showOnTree: true, createdAt: stamp, updatedAt: stamp }
    ],
    resources: [
      { id: 'resource-research', url: 'https://trends.google.com/trends/', normalizedUrl: 'https://trends.google.com/trends', title: 'Google Trends：验证问题是否持续被搜索', type: 'tool', sourceDomain: 'trends.google.com', note: '用于选题库，不用热度代替用户访谈', source: 'manual', createdAt: stamp, updatedAt: stamp },
      { id: 'resource-youtube', url: 'https://support.google.com/youtube/answer/141805', normalizedUrl: 'https://support.google.com/youtube/answer/141805', title: 'YouTube 官方：理解视频表现数据', type: 'article', sourceDomain: 'support.google.com', note: '重点看留存与观众反馈', source: 'manual', createdAt: stamp, updatedAt: stamp },
      { id: 'resource-canva', url: 'https://www.canva.com/learn/youtube-thumbnails/', normalizedUrl: 'https://www.canva.com/learn/youtube-thumbnails', title: 'Canva：缩略图信息层级指南', type: 'article', sourceDomain: 'canva.com', note: '只借鉴层级，不套模板', source: 'manual', createdAt: stamp, updatedAt: stamp },
      { id: 'resource-obs', url: 'https://obsproject.com/kb/quick-start-guide', normalizedUrl: 'https://obsproject.com/kb/quick-start-guide', title: 'OBS 官方快速开始', type: 'document', sourceDomain: 'obsproject.com', note: '桌面录制备选方案', source: 'manual', createdAt: stamp, updatedAt: stamp }
    ],
    resourceLinks: [
      { id: 'link-research-pillars', skillNodeId: 'pillars', resourceId: 'resource-research', createdAt: stamp },
      { id: 'link-research-backlog', skillNodeId: 'backlog', resourceId: 'resource-research', createdAt: stamp },
      { id: 'link-youtube-review', skillNodeId: 'review', resourceId: 'resource-youtube', createdAt: stamp },
      { id: 'link-canva-cover', skillNodeId: 'cover', resourceId: 'resource-canva', createdAt: stamp },
      { id: 'link-obs-shooting', skillNodeId: 'shooting', resourceId: 'resource-obs', createdAt: stamp }
    ],
    lastVisitedTreeId: 'creator-system'
  };
}
