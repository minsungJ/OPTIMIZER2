/**
 * Storage Abstraction: ProjectStateRepository
 * Provides persistent state, event log, economy ledger, decision history,
 * and persistent chat history.
 */

import fs from 'fs';
import path from 'path';
import {
  AionEvent,
  CharacterIdentity,
  CharacterState,
  ChatMessage,
  DecisionRecord,
  ExperimentRecord,
  LedgerEntry,
  MasterState,
} from '../src/types.js';

interface DatabaseSchema {
  characters: Record<string, CharacterState>;
  events: AionEvent[];
  ledger: LedgerEntry[];
  decisions: DecisionRecord[];
  experiments: ExperimentRecord[];
  masterState: MasterState;
  chatMessages: ChatMessage[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

export class ProjectStateRepository {
  private db!: DatabaseSchema;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data dir:', err);
      }
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Backward compatibility:
        // 기존 state.json에 chatMessages가 없어도 정상적으로 시작되도록 처리
        this.db = {
          ...parsed,
          chatMessages: Array.isArray(parsed.chatMessages)
            ? parsed.chatMessages
            : [],
        };

        return;
      } catch (err) {
        console.error(
          'Failed to read state file, initializing defaults:',
          err
        );
      }
    }

    this.db = this.generateSeedData();
    this.persist();
  }

  private generateSeedData(): DatabaseSchema {
    const now = new Date();
    const isoNow = now.toISOString();

    const defaultCharIdentity: CharacterIdentity = {
      id: 'CHAR_001',
      name: '검성',
      className: '검성',
      level: 55,
      aliases: ['검성', '대검', '창', '본캐', 'gladiator'],
      isDefault: true,
    };

    const defaultCharState: CharacterState = {
      characterId: 'CHAR_001',
      identity: defaultCharIdentity,
      coreStats: {},
      equipment: {},
      arcana: {},
      skills: {},
      currency: {
        kinah: 0,
        ap: 0,
      },
      inventory: {},
      farmingHistory: {
        totalEarnedKinah: 0,
        farmingRecords: [],
      },
      activeGoals: [],
      openProblems: [],
      currentRecommendations: [],
      uncertainty: [],
      lastUpdated: isoNow,
    };

    const masterState: MasterState = {
      snapshotTimestamp: isoNow,
      dataCutoff: isoNow,
      characterCount: 1,
      unresolvedInformation: [],
      knownConflicts: [],
      majorCurrentObjectives: [],
      characterSummaries: {
        CHAR_001: {
          name: '검성',
          className: '검성',
          kinah: 0,
        },
      },
      economySummary: {
        totalKinah: 0,
        weeklyIncome: 0,
        weeklyExpense: 0,
        netWeekly: 0,
      },
      activeDecisions: [],
      recheckTriggers: [],
    };

    return {
      characters: {
        CHAR_001: defaultCharState,
      },
      events: [],
      ledger: [],
      decisions: [],
      experiments: [],
      masterState,
      chatMessages: [],
    };
  }

  private persist() {
    try {
      // 혹시 런타임 시작 직후 .data가 없어도 다시 생성
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(this.db, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('Failed to write state file:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Character / State Operations
  // ---------------------------------------------------------------------------

  public getCharacters(): CharacterState[] {
    return Object.values(this.db.characters);
  }

  public getCharacter(characterId: string): CharacterState | undefined {
    return this.db.characters[characterId];
  }

  public getDefaultCharacter(): CharacterState {
    const chars = this.getCharacters();
    const found = chars.find((c) => c.identity.isDefault);
    return found || chars[0];
  }

  public getMasterState(): MasterState {
    return this.db.masterState;
  }

  public getEvents(characterId?: string, limit = 20): AionEvent[] {
    const evts = characterId
      ? this.db.events.filter((e) => e.characterId === characterId)
      : this.db.events;

    return evts.slice(-limit);
  }

  public getLedger(characterId?: string, limit = 30): LedgerEntry[] {
    const entries = characterId
      ? this.db.ledger.filter((l) => l.characterId === characterId)
      : this.db.ledger;

    return entries.slice(-limit);
  }

  public getDecisions(limit = 10): DecisionRecord[] {
    return this.db.decisions.slice(-limit);
  }

  public getLatestDecision(): DecisionRecord | undefined {
    return this.db.decisions[this.db.decisions.length - 1];
  }

  public getExperiments(): ExperimentRecord[] {
    return this.db.experiments;
  }

  // ---------------------------------------------------------------------------
  // Persistent Chat History
  // ---------------------------------------------------------------------------

  public getChatMessages(limit?: number): ChatMessage[] {
    if (!limit || limit <= 0) {
      return [...this.db.chatMessages];
    }

    return this.db.chatMessages.slice(-limit);
  }

  public saveChatMessage(message: ChatMessage): void {
    this.db.chatMessages.push(message);
    this.persist();
  }

  public saveChatMessages(messages: ChatMessage[]): void {
    if (!messages.length) return;

    this.db.chatMessages.push(...messages);
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Event / Ledger / Decision Operations
  // ---------------------------------------------------------------------------

  public saveEvent(event: AionEvent): void {
    this.db.events.push(event);
    this.persist();
  }

  public saveLedgerEntry(entry: LedgerEntry): void {
    this.db.ledger.push(entry);
    this.persist();
  }

  public saveDecision(decision: DecisionRecord): void {
    this.db.decisions.push(decision);

    if (!this.db.masterState.activeDecisions.includes(decision.id)) {
      this.db.masterState.activeDecisions.push(decision.id);
    }

    this.persist();
  }

  public saveExperiment(experiment: ExperimentRecord): void {
    this.db.experiments.push(experiment);
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Character State Mutation
  // ---------------------------------------------------------------------------

  public updateCharacterState(
    characterId: string,
    updater: (current: CharacterState) => CharacterState
  ): CharacterState {
    let char = this.db.characters[characterId];

    if (!char) {
      // Create if needed
      char = {
        characterId,
        identity: {
          id: characterId,
          name: characterId,
          className: '기타',
          level: 55,
          aliases: [],
        },
        coreStats: {},
        equipment: {},
        arcana: {},
        skills: {},
        currency: {
          kinah: 0,
          ap: 0,
        },
        inventory: {},
        farmingHistory: {
          totalEarnedKinah: 0,
          farmingRecords: [],
        },
        activeGoals: [],
        openProblems: [],
        currentRecommendations: [],
        uncertainty: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    const updated = updater(char);
    updated.lastUpdated = new Date().toISOString();

    this.db.characters[characterId] = updated;

    this.rebuildMasterState();
    this.persist();

    return updated;
  }

  public rebuildMasterState(): MasterState {
    const now = new Date();
    const oneWeekAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    let totalKinah = 0;
    const summaries: MasterState['characterSummaries'] = {};

    for (const char of Object.values(this.db.characters)) {
      const kinah = char.currency.kinah || 0;
      totalKinah += kinah;

      const weapon = char.equipment.weapon
        ? `${char.equipment.weapon.name} +${char.equipment.weapon.enhanceLevel}`
        : undefined;

      const arcana = char.arcana.mainArcana
        ? `${char.arcana.mainArcana.name} +${char.arcana.mainArcana.enhanceLevel}`
        : undefined;

      summaries[char.characterId] = {
        name: char.identity.name,
        className: char.identity.className,
        mainWeapon: weapon,
        mainArcana: arcana,
        kinah,
        keyStats: char.coreStats.physicalAttack
          ? `물공 ${char.coreStats.physicalAttack}`
          : undefined,
      };
    }

    // Calculate weekly ledger totals
    let weeklyIncome = 0;
    let weeklyExpense = 0;

    for (const entry of this.db.ledger) {
      const d = new Date(entry.datetime);

      if (d >= oneWeekAgo) {
        if (entry.direction === 'income') {
          weeklyIncome += entry.amount;
        } else if (entry.direction === 'expense') {
          weeklyExpense += entry.amount;
        }
      }
    }

    const netWeekly = weeklyIncome - weeklyExpense;

    const latestDecision = this.getLatestDecision();
    const recheckTriggers = latestDecision
      ? latestDecision.recheckTriggers
      : [];

    this.db.masterState = {
      snapshotTimestamp: now.toISOString(),
      dataCutoff: now.toISOString(),
      characterCount: Object.keys(this.db.characters).length,
      unresolvedInformation: [],
      knownConflicts: [],
      majorCurrentObjectives: Object.values(this.db.characters).flatMap(
        (c) => c.activeGoals
      ),
      characterSummaries: summaries,
      economySummary: {
        totalKinah,
        weeklyIncome,
        weeklyExpense,
        netWeekly,
      },
      activeDecisions: latestDecision ? [latestDecision.id] : [],
      recheckTriggers,
    };

    return this.db.masterState;
  }

  public resetState(): void {
    this.db = this.generateSeedData();
    this.persist();
  }
}

export const repository = new ProjectStateRepository();
