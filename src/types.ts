/**
 * Types for AION 2 OPTIMIZER
 */

export type IntentType =
  | 'RECORD'
  | 'STATUS'
  | 'SUMMARY'
  | 'OPTIMIZE'
  | 'COMPARE'
  | 'DIAGNOSE'
  | 'PLAN'
  | 'EXPERIMENT'
  | 'REBUILD'
  | 'MAINTENANCE';

export type FactConfidence =
  | 'CONFIRMED'
  | 'INFERRED'
  | 'ESTIMATED'
  | 'UNCONFIRMED'
  | 'UNKNOWN'
  | 'CONFLICTED';

export interface Account {
  id: string; // e.g. ACCOUNT_001, ACCOUNT_002
  name: string; // "첫번째 계정", "두번째 계정"
  characterIds: string[];
}

export interface CharacterIdentity {
  id: string; // e.g. CHAR_001
  name: string;
  className: string; // e.g. "검성", "마도성", "살성", "수호성", "궁성", "치유성", "호법성", "정령성", "권성"
  level: number;
  aliases: string[];
  accountId?: string;
  isMain?: boolean;
  isDefault?: boolean;
}

export interface EquipmentItem {
  name: string;
  enhanceLevel: number;
  grade?: string; // e.g. "유일", "영웅", "신화"
  slot: string; // "weapon", "armor_chest", "armor_legs", "arcana", etc.
  notes?: string;
  updatedAt?: string;
}

export interface ArcanaItem {
  name: string;
  enhanceLevel: number;
  tier?: number;
  updatedAt?: string;
}

export type ArcanaPieceType = 'parchment' | 'compass' | 'chalice' | 'scale';

export interface ArcanaPieceState {
  pieceType: ArcanaPieceType;
  name: string;
  enhanceLevel: number; // 0 to 5
  skills: Record<string, number>; // e.g. { '승천타': 4, '폭주': 2, '연환권': 2, '연격': 1 }
  status: 'LOCKED' | 'ENDGAME' | 'IN_PROGRESS' | 'PLACEHOLDER';
  isLocked: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface DetailedArcanaState {
  growthPhase?: 'FRESH_MAX_LEVEL' | 'GROWTH' | 'ENDGAME' | string;
  pieces: {
    parchment?: ArcanaPieceState;
    compass?: ArcanaPieceState;
    chalice?: ArcanaPieceState;
    scale?: ArcanaPieceState;
  };
  protectedPieces: string[]; // e.g. ['parchment']
  missingRequiredSkills: string[]; // e.g. ['폭주', '연환권']
  targetRequiredSkills: number; // e.g. 4
  requiredSkillTargetLevel: number; // 20
  notes?: string[];
  lastUpdated?: string;
}

export interface GlobalOptimizationPolicy {
  arcanaGoal: 'MAXIMUM_ENDGAME' | string;
  compromiseAllowed: boolean;
  priority: string[]; // ['PARCHMENT', 'COMPASS', 'CHALICE', 'SCALE']
  fixedSkillPiecesFirst: boolean;
  parchmentTarget: string; // '422_OR_332_FOR_REQUIRED_SKILLS'
  compassTarget: string; // 'ONE_REQUIRED_SKILL_LEVEL_4'
  chaliceInitialLevel: number; // 1
  scaleInitialLevel: number; // 1
  endgameOrder: string[]; // ['CHALICE', 'SCALE']
  policyNotes?: string[];
  lastUpdated?: string;
}

export interface CharacterState {
  characterId: string;
  identity: CharacterIdentity;
  coreStats: {
    physicalAttack?: number;
    magicAttack?: number;
    critRate?: number;
    accuracy?: number;
    defense?: number;
    hp?: number;
    [key: string]: number | undefined;
  };
  equipment: Record<string, EquipmentItem>;
  arcana: Record<string, ArcanaItem>;
  detailedArcana?: DetailedArcanaState;
  skills: Record<string, { name: string; level: number; rank?: string }>;
  currency: {
    kinah: number;
    ap: number; // Abyss points
    [key: string]: number;
  };
  inventory: Record<string, { quantity: number; unit?: string }>;
  farmingHistory: {
    totalEarnedKinah: number;
    lastFarmingDate?: string;
    farmingRecords: Array<{ date: string; amount: number; location?: string; hours?: number }>;
  };
  activeGoals: string[];
  openProblems: string[];
  currentRecommendations: string[];
  uncertainty: string[];
  lastUpdated: string;
}

export interface AionEvent {
  id: string; // e.g. EVT_...
  datetime: string;
  characterId: string;
  type:
    | 'enhancement'
    | 'acquisition'
    | 'expenditure'
    | 'equipment'
    | 'arcana'
    | 'skill'
    | 'combat_test'
    | 'farming'
    | 'sale'
    | 'purchase'
    | 'status_change'
    | 'correction'
    | 'note';
  summary: string;
  facts: Record<string, any>;
  stateChanges: Record<string, any>;
  relatedIds?: string[];
  confidence: FactConfidence;
  notes?: string;
}

export interface LedgerEntry {
  id: string; // e.g. LEDGER_...
  datetime: string;
  characterId: string;
  currency: string; // default "kinah"
  direction: 'income' | 'expense' | 'transfer' | 'correction';
  amount: number;
  category: string; // "enhancement", "farming", "trade", "consumable", etc.
  balanceBefore?: number;
  balanceAfter?: number;
  sourceEventId?: string;
  confidence: FactConfidence;
  note?: string;
}

export interface DecisionRecord {
  id: string; // e.g. DEC_...
  datetime: string;
  scope: string;
  problem: string;
  goal: string;
  constraints: string[];
  knownFacts: string[];
  unknowns: string[];
  hypotheses: string[];
  options: Array<{
    name: string;
    cost?: string;
    risk?: string;
    immediateBenefit?: string;
    longTermValue?: string;
  }>;
  recommendation: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  recheckTriggers: string[];
  result: 'pending' | 'executed' | 'invalidated' | 'superseded';
}

export interface ExperimentRecord {
  id: string;
  datetime: string;
  characterId: string;
  hypothesis: string;
  conditions: string;
  method: string;
  expectedResult: string;
  observedResult: string;
  conclusion: 'supported' | 'rejected' | 'inconclusive';
  confidenceDelta: string;
  nextAction: string;
}

export interface MasterState {
  snapshotTimestamp: string;
  dataCutoff: string;
  characterCount: number;
  unresolvedInformation: string[];
  knownConflicts: string[];
  majorCurrentObjectives: string[];
  characterSummaries: Record<
    string,
    {
      name: string;
      className: string;
      mainWeapon?: string;
      mainArcana?: string;
      kinah: number;
      accountId?: string;
      isMain?: boolean;
      keyStats?: string;
    }
  >;
  accountSummaries?: Record<
    string,
    {
      id: string;
      name: string;
      characterIds: string[];
      totalKinah: number;
    }
  >;
  economySummary: {
    totalKinah: number;
    weeklyIncome: number;
    weeklyExpense: number;
    netWeekly: number;
  };
  activeDecisions: string[];
  recheckTriggers: string[];
  globalPolicy?: GlobalOptimizationPolicy;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  metadata?: {
    intents?: IntentType[];
    characterId?: string;
    characterName?: string;
    stateChanges?: string[];
    decisionId?: string;
    eventSummary?: string;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface ChatApiResponse {
  answer: string;
  intents: IntentType[];
  characterId: string;
  stateChanges: string[];
  metadata: {
    decisionId?: string;
    eventId?: string;
    recheckTriggers?: string[];
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}
