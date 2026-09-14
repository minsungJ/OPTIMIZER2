/**
 * Storage Abstraction: ProjectStateRepository
 * Provides persistent state, event log, economy ledger, decision history,
 * and persistent chat history.
 */

import fs from 'fs';
import path from 'path';
import {
  Account,
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
  accounts: Record<string, Account>;
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
        this.db = this.migrateDatabase(parsed);
        this.persist();
        return;
      } catch (err) {
        console.error('Failed to read state file, initializing defaults:', err);
      }
    }

    this.db = this.generateSeedData();
    this.persist();
  }

  private createDefaultCharacterState(
    id: string,
    name: string,
    className: string,
    accountId: string,
    isMain: boolean,
    aliases: string[],
    isoNow: string
  ): CharacterState {
    return {
      characterId: id,
      identity: {
        id,
        name,
        className,
        level: 55,
        aliases,
        accountId,
        isMain,
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
      lastUpdated: isoNow,
    };
  }

  private generateSeedData(): DatabaseSchema {
    const now = new Date();
    const isoNow = now.toISOString();

    const accounts: Record<string, Account> = {
      ACCOUNT_001: {
        id: 'ACCOUNT_001',
        name: '첫번째 계정',
        characterIds: ['CHAR_001', 'CHAR_002', 'CHAR_003'],
      },
      ACCOUNT_002: {
        id: 'ACCOUNT_002',
        name: '두번째 계정',
        characterIds: ['CHAR_004', 'CHAR_005'],
      },
    };

    const characters: Record<string, CharacterState> = {
      CHAR_001: this.createDefaultCharacterState(
        'CHAR_001',
        '질풍호법',
        '호법성',
        'ACCOUNT_001',
        true,
        ['질풍호법', '질풍', '호법성', '호법'],
        isoNow
      ),
      CHAR_002: this.createDefaultCharacterState(
        'CHAR_002',
        '격앙수호',
        '수호성',
        'ACCOUNT_001',
        false,
        ['격앙수호', '격앙', '수호성', '수호'],
        isoNow
      ),
      CHAR_003: this.createDefaultCharacterState(
        'CHAR_003',
        '지켈검성',
        '검성',
        'ACCOUNT_001',
        false,
        ['지켈검성', '지켈', '검성'],
        isoNow
      ),
      CHAR_004: this.createDefaultCharacterState(
        'CHAR_004',
        '햐음',
        '권성',
        'ACCOUNT_002',
        true,
        ['햐음', '권성', '권사', '격투'],
        isoNow
      ),
      CHAR_005: this.createDefaultCharacterState(
        'CHAR_005',
        '쩡은',
        '치유성',
        'ACCOUNT_002',
        false,
        ['쩡은', '치유성', '치유'],
        isoNow
      ),
    };

    const db: DatabaseSchema = {
      accounts,
      characters,
      events: [],
      ledger: [],
      decisions: [],
      experiments: [],
      masterState: {
        snapshotTimestamp: isoNow,
        dataCutoff: isoNow,
        characterCount: 5,
        unresolvedInformation: [],
        knownConflicts: [],
        majorCurrentObjectives: [],
        characterSummaries: {},
        accountSummaries: {},
        economySummary: {
          totalKinah: 0,
          weeklyIncome: 0,
          weeklyExpense: 0,
          netWeekly: 0,
        },
        activeDecisions: [],
        recheckTriggers: [],
      },
      chatMessages: [],
    };

    return db;
  }

  private migrateDatabase(parsed: any): DatabaseSchema {
    const seed = this.generateSeedData();
    const now = new Date().toISOString();

    const accounts: Record<string, Account> = parsed.accounts || seed.accounts;
    const rawChars: Record<string, CharacterState> = parsed.characters || {};
    const characters: Record<string, CharacterState> = { ...seed.characters };

    // Standard 5-character roster definitions
    const definitions: Record<
      string,
      { name: string; className: string; accountId: string; isMain: boolean; aliases: string[] }
    > = {
      CHAR_001: {
        name: '질풍호법',
        className: '호법성',
        accountId: 'ACCOUNT_001',
        isMain: true,
        aliases: ['질풍호법', '질풍', '호법성', '호법'],
      },
      CHAR_002: {
        name: '격앙수호',
        className: '수호성',
        accountId: 'ACCOUNT_001',
        isMain: false,
        aliases: ['격앙수호', '격앙', '수호성', '수호'],
      },
      CHAR_003: {
        name: '지켈검성',
        className: '검성',
        accountId: 'ACCOUNT_001',
        isMain: false,
        aliases: ['지켈검성', '지켈', '검성'],
      },
      CHAR_004: {
        name: '햐음',
        className: '권성',
        accountId: 'ACCOUNT_002',
        isMain: true,
        aliases: ['햐음', '권성', '권사', '격투'],
      },
      CHAR_005: {
        name: '쩡은',
        className: '치유성',
        accountId: 'ACCOUNT_002',
        isMain: false,
        aliases: ['쩡은', '치유성', '치유'],
      },
    };

    // If there was an old CHAR_001 that had custom data (like 검성 with kinah), preserve it
    for (const [id, def] of Object.entries(definitions)) {
      const existing = rawChars[id];
      if (existing) {
        // Keep user data (currency, equipment, arcana, coreStats, etc.)
        characters[id] = {
          ...existing,
          identity: {
            ...existing.identity,
            id,
            name: def.name,
            className: def.className,
            accountId: def.accountId,
            isMain: def.isMain,
            aliases: Array.from(new Set([...(existing.identity?.aliases || []), ...def.aliases])),
          },
        };
      }
    }

    // Check if user had created custom character key like '햐음' directly
    for (const [key, char] of Object.entries(rawChars)) {
      if (!['CHAR_001', 'CHAR_002', 'CHAR_003', 'CHAR_004', 'CHAR_005'].includes(key)) {
        if (key.includes('햐음') || char.identity?.name?.includes('햐음')) {
          characters['CHAR_004'] = {
            ...characters['CHAR_004'],
            currency: char.currency || characters['CHAR_004'].currency,
            equipment: char.equipment || characters['CHAR_004'].equipment,
            arcana: char.arcana || characters['CHAR_004'].arcana,
            coreStats: char.coreStats || characters['CHAR_004'].coreStats,
          };
        } else if (key.includes('쩡은') || char.identity?.name?.includes('쩡은')) {
          characters['CHAR_005'] = {
            ...characters['CHAR_005'],
            currency: char.currency || characters['CHAR_005'].currency,
            equipment: char.equipment || characters['CHAR_005'].equipment,
            arcana: char.arcana || characters['CHAR_005'].arcana,
            coreStats: char.coreStats || characters['CHAR_005'].coreStats,
          };
        }
      }
    }

    const migrated: DatabaseSchema = {
      accounts,
      characters,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      masterState: parsed.masterState || seed.masterState,
    };

    this.db = migrated;
    this.rebuildMasterState();
    return this.db;
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
  // Account / Character / State Operations
  // ---------------------------------------------------------------------------

  public getAccounts(): Record<string, Account> {
    return this.db.accounts || {};
  }

  public getAccount(accountId: string): Account | undefined {
    return (this.db.accounts || {})[accountId];
  }

  public getCharacters(): CharacterState[] {
    return Object.values(this.db.characters);
  }

  public getCharacter(characterId: string): CharacterState | undefined {
    return this.db.characters[characterId];
  }

  public getCharacterByName(nameOrAlias: string): CharacterState | undefined {
    const lower = nameOrAlias.trim().toLowerCase();
    return this.getCharacters().find((c) => {
      if (c.identity.name.toLowerCase() === lower) return true;
      if (c.characterId.toLowerCase() === lower) return true;
      if (c.identity.aliases?.some((a) => a.toLowerCase() === lower)) return true;
      return false;
    });
  }

  public getDefaultCharacter(): CharacterState {
    const chars = this.getCharacters();
    return chars[0];
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
    const accountKinahMap: Record<string, number> = {};

    for (const char of Object.values(this.db.characters)) {
      const kinah = char.currency.kinah || 0;
      totalKinah += kinah;

      const accId = char.identity.accountId || 'ACCOUNT_001';
      accountKinahMap[accId] = (accountKinahMap[accId] || 0) + kinah;

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
        accountId: char.identity.accountId,
        isMain: char.identity.isMain,
        keyStats: char.coreStats.physicalAttack
          ? `물공 ${char.coreStats.physicalAttack}`
          : undefined,
      };
    }

    const accountSummaries: MasterState['accountSummaries'] = {};
    for (const [accId, acc] of Object.entries(this.db.accounts || {})) {
      accountSummaries[accId] = {
        id: accId,
        name: acc.name,
        characterIds: acc.characterIds,
        totalKinah: accountKinahMap[accId] || 0,
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
      accountSummaries,
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
