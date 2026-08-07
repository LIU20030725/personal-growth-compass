export const V0_1_MAPS = [
  { id: 'map-sunny-trail', title: '晴日林径', titleEn: 'SUNNY TRAIL', chapter: 1 },
  { id: 'map-wind-valley', title: '风过山谷', titleEn: 'WIND VALLEY', chapter: 2 }
] as const;

export const V0_1_TARGETS = [
  { targetType: 'route', targetId: 'route-wind-valley', title: '通往风过山谷', price: 30 },
  { targetType: 'home-item', targetId: 'home-field-desk', title: '田野书桌', price: 6 },
  { targetType: 'home-item', targetId: 'home-memory-shelf', title: '记忆陈列架', price: 12 }
] as const;
