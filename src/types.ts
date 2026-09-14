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

export interface CharacterIdentity {
  id: string; // e.g. CHAR_001
  name: string;
  className: string; // e.g. "검성", "마도성", "살성", "수호성", "궁성", "치유성", "호법성", "정령성"
  level: number;
  aliases: string[];
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
      keyStats?: string;
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
