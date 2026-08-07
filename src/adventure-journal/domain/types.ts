export type InvestmentTargetType = 'route' | 'home-item' | 'gear';
export type InvestmentStatus = 'available' | 'building' | 'ready' | 'unlocked';
export type OperationStatus = 'pending' | 'applied' | 'failed';

export type InvestmentProgress = {
  targetType: InvestmentTargetType;
  targetId: string;
  price: number;
  invested: number;
  status: InvestmentStatus;
  unlockedAt: string | null;
};

export type InvestmentOperation = {
  id: string;
  targetType: InvestmentTargetType;
  targetId: string;
  amount: number;
  status: OperationStatus;
  createdAt: string;
  appliedAt: string | null;
  error: string;
};

export type JournalPreferences = {
  reducedMotion: boolean;
  musicEnabled: boolean;
  ambientSoundEnabled: boolean;
  interfaceSoundEnabled: boolean;
};

export type AdventureJournalState = {
  schemaVersion: 1;
  contentVersion: string;
  currentChapterId: string;
  viewingMapId: string;
  unlockedMapIds: string[];
  routeInvestments: InvestmentProgress[];
  homeInvestments: InvestmentProgress[];
  gearInvestments: InvestmentProgress[];
  operations: InvestmentOperation[];
  preferences: JournalPreferences;
};

export type InvestmentInput = {
  operationId: string;
  targetType: InvestmentTargetType;
  targetId: string;
  amount: number;
  createdAt: string;
};
