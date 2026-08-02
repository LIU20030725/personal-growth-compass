export type MoodGroup = 'uplifted' | 'steady' | 'low-energy' | 'high-pressure';

export interface MoodPreset {
  id: string;
  label: string;
  group: MoodGroup;
  color: string;
  face: 'smile' | 'spark' | 'soft' | 'sleepy' | 'flat' | 'sad' | 'worried' | 'angry';
}

export interface ActivityPreset {
  id: string;
  label: string;
  group: 'work-study' | 'daily' | 'health' | 'relationship' | 'leisure';
}

export const moodGroups: Array<{ id: MoodGroup; label: string }> = [
  { id: 'uplifted', label: '愉悦' },
  { id: 'steady', label: '平稳' },
  { id: 'low-energy', label: '低能量' },
  { id: 'high-pressure', label: '高压力' }
];

export const moodPresets: MoodPreset[] = [
  { id: 'happy', label: '开心', group: 'uplifted', color: '#ffd85c', face: 'smile' },
  { id: 'excited', label: '兴奋', group: 'uplifted', color: '#ffbf47', face: 'spark' },
  { id: 'grateful', label: '感激', group: 'uplifted', color: '#ffcf70', face: 'soft' },
  { id: 'satisfied', label: '满足', group: 'uplifted', color: '#f3c653', face: 'smile' },
  { id: 'calm', label: '平静', group: 'steady', color: '#a9dfca', face: 'soft' },
  { id: 'relaxed', label: '放松', group: 'steady', color: '#98d8c1', face: 'smile' },
  { id: 'focused', label: '专注', group: 'steady', color: '#a8d9d0', face: 'flat' },
  { id: 'tired', label: '疲惫', group: 'low-energy', color: '#c9c2e8', face: 'sleepy' },
  { id: 'bored', label: '无聊', group: 'low-energy', color: '#d5cfdf', face: 'flat' },
  { id: 'down', label: '低落', group: 'low-energy', color: '#bfc5dd', face: 'sad' },
  { id: 'lonely', label: '孤独', group: 'low-energy', color: '#b5c2d8', face: 'sad' },
  { id: 'anxious', label: '焦虑', group: 'high-pressure', color: '#f1b7a8', face: 'worried' },
  { id: 'stressed', label: '压力', group: 'high-pressure', color: '#efaa9d', face: 'worried' },
  { id: 'angry', label: '生气', group: 'high-pressure', color: '#ee9b88', face: 'angry' },
  { id: 'confused', label: '迷茫', group: 'high-pressure', color: '#d9b5cd', face: 'worried' },
  { id: 'sad', label: '悲伤', group: 'high-pressure', color: '#aebbd7', face: 'sad' },
  { id: 'overwhelmed', label: '撑不住', group: 'high-pressure', color: '#c6acc7', face: 'sad' }
];

export const activityGroups = [
  { id: 'work-study', label: '工作与学习' },
  { id: 'daily', label: '日常生活' },
  { id: 'health', label: '身体状态' },
  { id: 'relationship', label: '关系陪伴' },
  { id: 'leisure', label: '兴趣放松' }
] as const;

export const activityPresets: ActivityPreset[] = [
  ...['工作', '会议', '学习', '上课', '通勤'].map((label, index) => ({ id: ['work', 'meeting', 'studying', 'class', 'commute'][index], label, group: 'work-study' as const })),
  ...['吃饭', '做饭', '家务', '购物', '旅行'].map((label, index) => ({ id: ['meal', 'cooking', 'chores', 'shopping', 'travel'][index], label, group: 'daily' as const })),
  ...['睡眠', '休息', '散步', '运动', '生病'].map((label, index) => ({ id: ['sleep', 'rest', 'walking', 'exercise', 'unwell'][index], label, group: 'health' as const })),
  ...['独处', '家人', '朋友', '伴侣', '社交'].map((label, index) => ({ id: ['alone', 'family', 'friends', 'partner', 'social'][index], label, group: 'relationship' as const })),
  ...['阅读', '电影', '游戏', '音乐', '创作'].map((label, index) => ({ id: ['reading', 'movie', 'gaming', 'music', 'creating'][index], label, group: 'leisure' as const }))
];

export const moodById = new Map(moodPresets.map((mood) => [mood.id, mood]));
export const activityById = new Map(activityPresets.map((activity) => [activity.id, activity]));

