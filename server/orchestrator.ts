/**
 * AION2 Agent Orchestration Layer (Multi-Character / Multi-Account Aware)
 * Implements:
 * RECEIVE -> ROUTE -> IDENTIFY -> EXTRACT -> REGISTER -> UPDATE -> ANALYZE -> DECIDE -> VALIDATE -> REPORT
 */

import {
  AionEvent,
  ChatApiResponse,
  DecisionRecord,
  FactConfidence,
  IntentType,
  LedgerEntry,
} from '../src/types.js';
import { resolveCharacter } from './characterResolver.js';
import { getGeminiClient } from './gemini.js';
import { ProjectStateRepository } from './repository.js';

interface PipelineContext {
  userMessage: string;
  conversation: Array<{ role: 'user' | 'assistant'; content: string; metadata?: any }>;
  repository: ProjectStateRepository;
}

export class AionAgentOrchestrator {
  private repository: ProjectStateRepository;

  constructor(repository: ProjectStateRepository) {
    this.repository = repository;
  }

  public parseEnhanceLevel(text: string): number | null {
    // Matches "+15", "+ 15", "15강", "+15강", "15 강"
    const plusMatch = text.match(/\+\s*([0-9]{1,2})/);
    if (plusMatch) {
      return parseInt(plusMatch[1], 10);
    }
    const gangMatch = text.match(/([0-9]{1,2})\s*강/);
    if (gangMatch) {
      return parseInt(gangMatch[1], 10);
    }
    return null;
  }

  // Parse Korean monetary and quantity expressions deterministically
  public parseKoreanKinah(text: string): number | null {
    // Check for explicit zero or out of money
    const zeroMatch = text.match(
      /(?:키나\s*(?:는|도|가)?\s*0|0\s*(?:키나|원)|키나\s*(?:전액\s*)?소진|키나\s*없)/i
    );
    if (zeroMatch) {
      return 0;
    }

    // Examples: "8천만", "8000만", "1억 2천만", "1억 5000만", "5000만", "8천만 키나", "80,000,000", "2.5억"
    let total = 0;
    let found = false;

    // Pattern for "X억" or "X.Y억"
    const eokMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*억/);
    if (eokMatch) {
      total += parseFloat(eokMatch[1]) * 100000000;
      found = true;
    }

    const cheonmanMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*천\s*만/);
    if (cheonmanMatch) {
      total += parseFloat(cheonmanMatch[1]) * 10000000;
      found = true;
    } else {
      // Pattern for "X만" (works even if 억 exists, e.g. "1억 5000만")
      const manMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*만(?!\s*원)/);
      if (manMatch) {
        total += parseFloat(manMatch[1]) * 10000;
        found = true;
      }
    }

    if (!found) {
      const plainNumMatch = text.match(
        /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})\s*(?:키나|골드)?/
      );
      if (plainNumMatch) {
        const raw = plainNumMatch[1].replace(/,/g, '');
        total = parseInt(raw, 10);
        found = true;
      }
    }

    return found ? Math.round(total) : null;
  }

  public formatKinah(amount: number): string {
    const isNegative = amount < 0;
    const abs = Math.abs(amount);

    let formatted = '';
    if (abs >= 100000000) {
      const eok = Math.floor(abs / 100000000);
      const remainder = abs % 100000000;
      const cheonman = Math.round(remainder / 10000000);
      formatted =
        cheonman > 0 ? `${eok}억 ${cheonman * 1000}만 키나` : `${eok}억 키나`;
    } else if (abs >= 10000) {
      const man = Math.round(abs / 10000);
      formatted = `${man.toLocaleString()}만 키나`;
    } else {
      formatted = `${abs.toLocaleString()} 키나`;
    }

    return isNegative ? `-${formatted}` : formatted;
  }

  // 1. Intent Classification
  public routeIntents(text: string): IntentType[] {
    const intents: IntentType[] = [];
    const lower = text.toLowerCase();

    // RECORD & STATE MUTATION (including direct overwrite & baseline setting)
    if (
      lower.includes('성공') ||
      lower.includes('실패') ||
      lower.includes('강화했') ||
      lower.includes('강화') ||
      lower.includes('썼어') ||
      lower.includes('소모') ||
      lower.includes('들었어') ||
      lower.includes('지출') ||
      lower.includes('먹었') ||
      lower.includes('얻었') ||
      lower.includes('구입') ||
      lower.includes('구매') ||
      lower.includes('팔았') ||
      lower.includes('등록') ||
      lower.includes('기록') ||
      lower.includes('있어') ||
      lower.includes('보유') ||
      lower.includes('현재') ||
      lower.includes('변경') ||
      lower.includes('수정') ||
      lower.includes('바꿨') ||
      lower.includes('설정') ||
      lower.includes('세팅') ||
      lower.includes('입력') ||
      lower.includes('직업') ||
      lower.includes('레벨') ||
      lower.includes('스펙') ||
      lower.includes('아니야') ||
      (lower.includes('벌었') && !lower.includes('얼마나')) ||
      lower.includes('획득')
    ) {
      intents.push('RECORD');
    }

    // SUMMARY
    if (
      lower.includes('얼마나 벌었') ||
      lower.includes('얼마나') ||
      lower.includes('정리해') ||
      lower.includes('요약') ||
      lower.includes('수익') ||
      lower.includes('결산') ||
      lower.includes('이번 주') ||
      lower.includes('이번주')
    ) {
      intents.push('SUMMARY');
    }

    // COMPARE & OPTIMIZE
    if (
      lower.includes('vs') ||
      lower.includes('비교') ||
      lower.includes('누구') ||
      lower.includes('어떤 캐릭') ||
      lower.includes('어느 캐릭') ||
      lower.includes('어느 쪽') ||
      lower.includes('뭐가 나') ||
      lower.includes('뭐가 더') ||
      lower.includes('뭘 먼저') ||
      lower.includes('누굴 먼저') ||
      lower.includes('전체 캐릭터') ||
      lower.includes('어디에 투자')
    ) {
      intents.push('COMPARE');
      intents.push('OPTIMIZE');
    }

    if (
      lower.includes('어떻게 할까') ||
      lower.includes('추천') ||
      lower.includes('도전할까') ||
      lower.includes('멈출까') ||
      lower.includes('눌러야') ||
      lower.includes('효율') ||
      lower.includes('진로') ||
      lower.includes('목표')
    ) {
      intents.push('OPTIMIZE');
    }

    // DIAGNOSE
    if (
      lower.includes('판단') ||
      lower.includes('진단') ||
      lower.includes('평가') ||
      lower.includes('지난번') ||
      lower.includes('이전 추천') ||
      lower.includes('다시 봐줘') ||
      lower.includes('재평가')
    ) {
      intents.push('DIAGNOSE');
    }

    // STATUS
    if (
      lower.includes('현재 상태') ||
      lower.includes('스펙') ||
      lower.includes('장비 현황') ||
      lower.includes('내 정보')
    ) {
      intents.push('STATUS');
    }

    // Default fallback if empty
    if (intents.length === 0) {
      if (lower.includes('?')) {
        intents.push('OPTIMIZE');
      } else {
        intents.push('RECORD');
      }
    }

    return Array.from(new Set(intents));
  }

  // 2. Process Request
  public async handleMessage(ctx: PipelineContext): Promise<ChatApiResponse> {
    const { userMessage, conversation, repository } = ctx;

    // A. ROUTE INTENT
    const intents = this.routeIntents(userMessage);

    // B. IDENTIFY CHARACTER (Multi-character aware hierarchy)
    const charResolution = resolveCharacter(userMessage, conversation, repository);
    const targetCharId = charResolution.characterId;
    let charState = targetCharId ? repository.getCharacter(targetCharId) : undefined;

    const stateChanges: string[] = [];
    let registeredEventId: string | undefined;
    let registeredDecisionId: string | undefined;
    let registeredConfidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';

    const nowIso = new Date().toISOString();
    const isCorrection =
      userMessage.includes('아니야') ||
      userMessage.includes('잘못') ||
      userMessage.includes('수정') ||
      userMessage.includes('변경');

    // C. FACT EXTRACTION & MUTATION (Only when a specific character is identified)
    if (targetCharId && charState) {
      const enhanceLevel = this.parseEnhanceLevel(userMessage);
      const isSuccess = userMessage.includes('성공');
      const kinahAmount = this.parseKoreanKinah(userMessage);
      const isFarming =
        userMessage.includes('사냥') ||
        userMessage.includes('벌었') ||
        userMessage.includes('파밍');
      const isEnhanceAction =
        userMessage.includes('강화했') ||
        (userMessage.includes('강화') &&
          (userMessage.includes('성공') ||
            userMessage.includes('실패') ||
            userMessage.includes('시도') ||
            userMessage.includes('했어') ||
            userMessage.includes('눌렀'))) ||
        userMessage.includes('성공했') ||
        userMessage.includes('실패했');
      const isExpense =
        userMessage.includes('썼어') ||
        userMessage.includes('소모') ||
        userMessage.includes('들었어') ||
        userMessage.includes('지출') ||
        userMessage.includes('비용');

      // 1. Check for Class & Level update (Note: NEVER overwrite character name with class name!)
      const classNames = [
        '권성',
        '치유성',
        '호법성',
        '수호성',
        '검성',
        '살성',
        '궁성',
        '마도성',
        '정령성',
      ];
      const matchedClass = classNames.find((c) => userMessage.includes(c));
      const levelMatch = userMessage.match(/([0-9]{1,2})\s*(?:레벨|렙|lv)/i);
      const matchedLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;

      if (matchedClass || matchedLevel) {
        charState = repository.updateCharacterState(targetCharId, (draft) => {
          if (matchedClass) {
            draft.identity.className = matchedClass;
            // Preserving original draft.identity.name! Do not overwrite name!
            draft.identity.aliases = Array.from(
              new Set([...(draft.identity.aliases || []), matchedClass])
            );
            stateChanges.push(`[${draft.identity.name}] 직업: ${matchedClass} 설정`);
          }
          if (matchedLevel) {
            draft.identity.level = matchedLevel;
            stateChanges.push(`[${draft.identity.name}] 레벨: Lv.${matchedLevel} 설정`);
          }
          return draft;
        });
      }

      // 2. Check for Combat Stats update
      const atkMatch = userMessage.match(/(?:공격력|물공|마공)\s*[:=]?\s*([0-9]{3,5})/);
      const critMatch = userMessage.match(/(?:치명타|물치|마치)\s*[:=]?\s*([0-9]{2,4})/);
      const accMatch = userMessage.match(/(?:명중)\s*[:=]?\s*([0-9]{3,5})/);
      const defMatch = userMessage.match(/(?:방어|물방)\s*[:=]?\s*([0-9]{3,5})/);
      const hpMatch = userMessage.match(/(?:생명력|hp)\s*[:=]?\s*([0-9]{4,6})/i);
      const healMatch = userMessage.match(/(?:치유력|증폭|마증)\s*[:=]?\s*([0-9]{3,5})/);

      if (atkMatch || critMatch || accMatch || defMatch || hpMatch || healMatch) {
        charState = repository.updateCharacterState(targetCharId, (draft) => {
          if (!draft.coreStats) {
            draft.coreStats = {
              physicalAttack: 0,
              critRate: 0,
              accuracy: 0,
              defense: 0,
              hp: 0,
            };
          }
          if (atkMatch) {
            draft.coreStats.physicalAttack = parseInt(atkMatch[1], 10);
            stateChanges.push(
              `[${draft.identity.name}] 공격력: ${draft.coreStats.physicalAttack}`
            );
          }
          if (critMatch) {
            draft.coreStats.critRate = parseInt(critMatch[1], 10);
            stateChanges.push(
              `[${draft.identity.name}] 치명타: ${draft.coreStats.critRate}`
            );
          }
          if (accMatch) {
            draft.coreStats.accuracy = parseInt(accMatch[1], 10);
            stateChanges.push(
              `[${draft.identity.name}] 명중: ${draft.coreStats.accuracy}`
            );
          }
          if (defMatch) {
            draft.coreStats.defense = parseInt(defMatch[1], 10);
            stateChanges.push(
              `[${draft.identity.name}] 방어력: ${draft.coreStats.defense}`
            );
          }
          if (hpMatch) {
            draft.coreStats.hp = parseInt(hpMatch[1], 10);
            stateChanges.push(
              `[${draft.identity.name}] 생명력: ${draft.coreStats.hp}`
            );
          }
          if (healMatch) {
            draft.coreStats.magicBoost = parseInt(healMatch[1], 10);
            stateChanges.push(
              `[${draft.identity.name}] 치유력/증폭: ${draft.coreStats.magicBoost}`
            );
          }
          return draft;
        });
      }

      // 3. Enhancement Action Event vs Direct Equipment Setting
      if (isEnhanceAction && enhanceLevel !== null) {
        const eventId = `EVT_${Date.now()}`;
        const targetLevel = enhanceLevel;

        const isArcana = userMessage.includes('아르카나');
        const isArmor =
          userMessage.includes('방어구') ||
          userMessage.includes('흉갑') ||
          userMessage.includes('판금') ||
          userMessage.includes('사슬') ||
          userMessage.includes('가죽') ||
          userMessage.includes('로브');
        const targetItemName = isArcana
          ? '파괴의 아르카나'
          : isArmor
          ? charState.equipment.chest?.name || '판금 흉갑'
          : charState.equipment.weapon?.name ||
            (charState.identity.className === '호법성'
              ? '지팡이'
              : charState.identity.className === '수호성'
              ? '한손검'
              : charState.identity.className === '권성'
              ? '권갑'
              : charState.identity.className === '치유성'
              ? '전래봉'
              : '대검');

        const spentKinah = isExpense && kinahAmount ? kinahAmount : 0;

        const newEvent: AionEvent = {
          id: eventId,
          datetime: nowIso,
          characterId: targetCharId,
          type: 'enhancement',
          summary: `${charState.identity.name} (${charState.identity.className}) ${targetItemName} ${targetLevel}강 ${isSuccess ? '성공' : '시도'} (${spentKinah > 0 ? this.formatKinah(spentKinah) + ' 소모' : '비용 미입력'})`,
          facts: {
            item: targetItemName,
            targetLevel,
            success: isSuccess,
            spentKinah,
          },
          stateChanges: {},
          confidence: 'CONFIRMED',
        };

        charState = repository.updateCharacterState(targetCharId, (draft) => {
          if (isArcana) {
            draft.arcana.mainArcana = {
              name: targetItemName,
              enhanceLevel: targetLevel,
            };
            stateChanges.push(
              `[${draft.identity.name}] 아르카나 강화 수치 +${targetLevel} 반영`
            );
          } else if (isArmor) {
            draft.equipment.chest = {
              name: targetItemName,
              enhanceLevel: targetLevel,
              slot: 'chest',
            };
            stateChanges.push(
              `[${draft.identity.name}] 방어구 강화 수치 +${targetLevel} 반영`
            );
          } else {
            draft.equipment.weapon = {
              name: targetItemName,
              enhanceLevel: targetLevel,
              slot: 'weapon',
            };
            stateChanges.push(
              `[${draft.identity.name}] 주무기 강화 수치 +${targetLevel} 반영`
            );
          }

          if (spentKinah > 0) {
            const before = draft.currency.kinah || 0;
            const after = Math.max(0, before - spentKinah);
            draft.currency.kinah = after;
            stateChanges.push(
              `[${draft.identity.name}] 보유 키나: ${this.formatKinah(before)} -> ${this.formatKinah(after)}`
            );

            const ledgerId = `LEDGER_${Date.now()}`;
            repository.saveLedgerEntry({
              id: ledgerId,
              datetime: nowIso,
              characterId: targetCharId,
              currency: 'kinah',
              direction: 'expense',
              amount: spentKinah,
              category: 'enhancement',
              balanceBefore: before,
              balanceAfter: after,
              sourceEventId: eventId,
              confidence: 'CONFIRMED',
              note: `${targetItemName} ${targetLevel}강 시도 비용`,
            });
          }
          return draft;
        });

        newEvent.stateChanges = { stateChanges };
        repository.saveEvent(newEvent);
        registeredEventId = eventId;
      } else if (
        enhanceLevel !== null &&
        !intents.includes('COMPARE') &&
        !userMessage.includes('?')
      ) {
        // Direct Equipment / Weapon / Arcana Setting (e.g. "무기 15강이야", "햐음 아르카나 +15")
        const level = enhanceLevel;
        const isArcana = userMessage.includes('아르카나');
        const isArmor =
          userMessage.includes('방어구') ||
          userMessage.includes('흉갑') ||
          userMessage.includes('판금') ||
          userMessage.includes('사슬') ||
          userMessage.includes('가죽') ||
          userMessage.includes('로브');
        const isWeapon =
          userMessage.includes('무기') ||
          userMessage.includes('대검') ||
          userMessage.includes('창') ||
          userMessage.includes('단검') ||
          userMessage.includes('장검') ||
          userMessage.includes('활') ||
          userMessage.includes('지팡이') ||
          userMessage.includes('권갑') ||
          (!isArcana && !isArmor);

        charState = repository.updateCharacterState(targetCharId, (draft) => {
          if (isArcana) {
            draft.arcana.mainArcana = {
              name: draft.arcana.mainArcana?.name || '파괴의 아르카나',
              enhanceLevel: level,
            };
            stateChanges.push(
              `[${draft.identity.name}] 아르카나: +${level}강 설정 완료`
            );
          } else if (isArmor) {
            draft.equipment.chest = {
              name: draft.equipment.chest?.name || '판금 흉갑',
              enhanceLevel: level,
              slot: 'chest',
            };
            stateChanges.push(
              `[${draft.identity.name}] 방어구: +${level}강 설정 완료`
            );
          } else if (isWeapon) {
            const defaultWeapon =
              draft.identity.className === '호법성'
                ? '지팡이'
                : draft.identity.className === '수호성'
                ? '한손검'
                : draft.identity.className === '권성'
                ? '권갑'
                : draft.identity.className === '치유성'
                ? '전래봉'
                : '대검';
            draft.equipment.weapon = {
              name: draft.equipment.weapon?.name || defaultWeapon,
              enhanceLevel: level,
              slot: 'weapon',
            };
            stateChanges.push(
              `[${draft.identity.name}] 주무기: ${draft.equipment.weapon.name} +${level}강 설정 완료`
            );
          }
          return draft;
        });
      }

      // 4. Kinah: Farming Income vs Expense vs Baseline / Correction Overwrite
      if (isFarming && kinahAmount !== null && kinahAmount > 0) {
        const eventId = `EVT_${Date.now()}`;
        const earned = kinahAmount;

        charState = repository.updateCharacterState(targetCharId, (draft) => {
          const before = draft.currency.kinah || 0;
          const after = before + earned;
          draft.currency.kinah = after;
          draft.farmingHistory.totalEarnedKinah =
            (draft.farmingHistory.totalEarnedKinah || 0) + earned;
          draft.farmingHistory.farmingRecords.push({
            date: nowIso,
            amount: earned,
            location: '사냥 및 파밍',
          });
          stateChanges.push(
            `[${draft.identity.name}] 파밍 수익 +${this.formatKinah(earned)} 반영 (잔액: ${this.formatKinah(after)})`
          );

          const ledgerId = `LEDGER_${Date.now()}`;
          repository.saveLedgerEntry({
            id: ledgerId,
            datetime: nowIso,
            characterId: targetCharId,
            currency: 'kinah',
            direction: 'income',
            amount: earned,
            category: 'farming',
            balanceBefore: before,
            balanceAfter: after,
            sourceEventId: eventId,
            confidence: 'CONFIRMED',
            note: '사냥 및 파밍 수익',
          });
          return draft;
        });

        repository.saveEvent({
          id: eventId,
          datetime: nowIso,
          characterId: targetCharId,
          type: 'farming',
          summary: `사냥 파밍 정산 (+${this.formatKinah(earned)})`,
          facts: { amount: earned },
          stateChanges: { 'currency.kinah': `+${earned}` },
          confidence: 'CONFIRMED',
        });
        registeredEventId = eventId;
      } else if (
        isExpense &&
        kinahAmount !== null &&
        kinahAmount > 0 &&
        !isEnhanceAction
      ) {
        // Standalone expenditure
        const eventId = `EVT_${Date.now()}`;
        const spent = kinahAmount;

        charState = repository.updateCharacterState(targetCharId, (draft) => {
          const before = draft.currency.kinah || 0;
          const after = Math.max(0, before - spent);
          draft.currency.kinah = after;
          stateChanges.push(
            `[${draft.identity.name}] 지출 반영: -${this.formatKinah(spent)} (잔액: ${this.formatKinah(after)})`
          );

          const ledgerId = `LEDGER_${Date.now()}`;
          repository.saveLedgerEntry({
            id: ledgerId,
            datetime: nowIso,
            characterId: targetCharId,
            currency: 'kinah',
            direction: 'expense',
            amount: spent,
            category: 'expenditure',
            balanceBefore: before,
            balanceAfter: after,
            sourceEventId: eventId,
            confidence: 'CONFIRMED',
            note: '일반 지출',
          });
          return draft;
        });

        repository.saveEvent({
          id: eventId,
          datetime: nowIso,
          characterId: targetCharId,
          type: 'expenditure',
          summary: `지출 기록 (${this.formatKinah(spent)} 소모)`,
          facts: { spentKinah: spent },
          stateChanges: { 'currency.kinah': `-${spent}` },
          confidence: 'CONFIRMED',
        });
        registeredEventId = eventId;
      } else if (
        !isExpense &&
        !isFarming &&
        kinahAmount !== null &&
        !isEnhanceAction &&
        !intents.includes('SUMMARY') &&
        !userMessage.includes('?')
      ) {
        // Direct Kinah Baseline / Correction Overwrite (e.g. "햐음 키나 5천만", "아니야 햐음 키나 8천만")
        const newKinah = kinahAmount;
        charState = repository.updateCharacterState(targetCharId, (draft) => {
          const before = draft.currency.kinah || 0;
          draft.currency.kinah = newKinah;
          stateChanges.push(
            `[${draft.identity.name}] 보유 키나: ${this.formatKinah(before)} -> ${this.formatKinah(newKinah)} (${isCorrection ? '정정 반영' : '기준 잔액 설정'})`
          );

          const ledgerId = `LEDGER_${Date.now()}`;
          repository.saveLedgerEntry({
            id: ledgerId,
            datetime: nowIso,
            characterId: targetCharId,
            currency: 'kinah',
            direction: isCorrection
              ? 'correction'
              : newKinah >= before
              ? 'income'
              : 'expense',
            amount: Math.abs(newKinah - before),
            category: 'adjustment',
            balanceBefore: before,
            balanceAfter: newKinah,
            confidence: 'CONFIRMED',
            note: `[${draft.identity.name}] 보유 키나 ${isCorrection ? '정정' : '기준 잔액 설정'} (${this.formatKinah(newKinah)})`,
          });
          return draft;
        });

        const eventId = `EVT_${Date.now()}`;
        repository.saveEvent({
          id: eventId,
          datetime: nowIso,
          characterId: targetCharId,
          type: isCorrection ? 'correction' : 'status_change',
          summary: `[${charState.identity.name}] 보유 키나 ${isCorrection ? '정정' : '기준 잔액 설정'} (${this.formatKinah(newKinah)})`,
          facts: { newKinah, isCorrection },
          stateChanges: { 'currency.kinah': this.formatKinah(newKinah) },
          confidence: 'CONFIRMED',
        });
        registeredEventId = eventId;
      }
    } else if (charResolution.matchedBy === 'unresolved') {
      // User tried to input numbers/levels, but character was not specified
      const kinahAmount = this.parseKoreanKinah(userMessage);
      const enhanceLvl = this.parseEnhanceLevel(userMessage);
      if (
        (kinahAmount !== null || enhanceLvl !== null) &&
        !userMessage.includes('?') &&
        !intents.includes('COMPARE')
      ) {
        stateChanges.push(
          '캐릭터 미식별: 5개 캐릭터(질풍호법, 격앙수호, 지켈검성, 햐음, 쩡은) 중 대상을 지정해주세요.'
        );
      }
    }

    // D. BUILD RELEVANT CONTEXT FOR GEMINI REASONING (5-Character & 2-Account Aware)
    const masterState = repository.getMasterState();
    const allCharacters = repository.getCharacters();
    const allAccounts = repository.getAccounts();
    const latestDecision = repository.getLatestDecision();

    // Roster summary for multi-character reasoning
    const rosterSummary = allCharacters.map((c) => ({
      id: c.characterId,
      name: c.identity.name,
      className: c.identity.className,
      level: c.identity.level,
      accountId: c.identity.accountId,
      accountName: allAccounts[c.identity.accountId || '']?.name || '계정 미지정',
      isMain: c.identity.isMain ?? false,
      kinah: c.currency.kinah || 0,
      formattedKinah: this.formatKinah(c.currency.kinah || 0),
      weapon: c.equipment.weapon
        ? `${c.equipment.weapon.name} +${c.equipment.weapon.enhanceLevel}`
        : '무기 정보 없음',
      arcana: c.arcana.mainArcana
        ? `${c.arcana.mainArcana.name} +${c.arcana.mainArcana.enhanceLevel}`
        : '아르카나 정보 없음',
      coreStats: c.coreStats,
    }));

    const accountSummaries = Object.entries(allAccounts).map(([accId, acc]) => {
      const charsInAcc = allCharacters.filter(
        (c) => c.identity.accountId === accId
      );
      const totalKinah = charsInAcc.reduce(
        (sum, c) => sum + (c.currency.kinah || 0),
        0
      );
      return {
        id: accId,
        name: acc.name,
        totalKinahFormatted: this.formatKinah(totalKinah),
        totalKinah,
        characters: charsInAcc.map(
          (c) => `${c.identity.name}(${c.identity.className}${c.identity.isMain ? '/본캐' : ''})`
        ),
      };
    });

    const contextPrompt = {
      userMessage,
      intents,
      characterResolution: {
        matchedBy: charResolution.matchedBy,
        targetCharacterId: targetCharId || null,
        targetCharacterName: charState?.identity.name || null,
      },
      targetCharacter: charState
        ? {
            id: charState.characterId,
            name: charState.identity.name,
            className: charState.identity.className,
            level: charState.identity.level,
            accountId: charState.identity.accountId,
            isMain: charState.identity.isMain ?? false,
            weapon: charState.equipment.weapon,
            arcana: charState.arcana.mainArcana,
            currentKinah: charState.currency.kinah,
            formattedKinah: this.formatKinah(charState.currency.kinah),
            coreStats: charState.coreStats,
          }
        : null,
      allCharacters: rosterSummary,
      accountSummaries,
      totalEconomy: {
        totalKinah: masterState.economySummary.totalKinah,
        formattedTotalKinah: this.formatKinah(masterState.economySummary.totalKinah),
        weeklyIncome: masterState.economySummary.weeklyIncome,
        weeklyExpense: masterState.economySummary.weeklyExpense,
        netWeekly: masterState.economySummary.netWeekly,
      },
      previousDecision: latestDecision
        ? {
            id: latestDecision.id,
            recommendation: latestDecision.recommendation,
            recheckTriggers: latestDecision.recheckTriggers,
            result: latestDecision.result,
          }
        : null,
      stateChangesMade: stateChanges,
    };

    // E. GEMINI REASONING LAYER
    let aiAnswer = '';
    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.0-flash'];
    try {
      const gemini = getGeminiClient();
      const systemInstruction = `당신은 AION 2 OPTIMIZER의 5개 캐릭터/2개 계정 통합 추론 엔진입니다.
당신은 한국어 자연어를 완벽히 이해하며, 군더더기 없는 냉정하고 체계적인 "AION 2 최적화 전문 오퍼레이터" 톤으로 답변합니다.

[시스템 및 캐릭터 구조]
1. 계정 1 (첫번째 계정):
   - 질풍호법: 호법성 / 본캐
   - 격앙수호: 수호성
   - 지켈검성: 검성
2. 계정 2 (두번째 계정):
   - 햐음: 권성 / 본캐
   - 쩡은: 치유성

[원칙]
1. '본캐'는 육성 우선순위 가중치일 뿐 시스템 기본(default) 선택 캐릭터가 아닙니다.
2. 특정 캐릭터(예: 햐음, 질풍호법, 쩡은 등)가 명시되거나 지칭된 경우 절대로 다른 캐릭터(검성 등)와 혼동하거나 직업명을 캐릭터 이름으로 덮어쓰지 마십시오.
3. 사용자가 "전체 캐릭터 중 누구를 먼저 강화할까?", "햐음이랑 쩡은 중 누구부터?", "전체적으로 뭘 먼저 해야 돼?" 등 다중 캐릭터/계정 비교 질문을 한 경우:
   - 5개 캐릭터(질풍호법, 격앙수호, 지켈검성, 햐음, 쩡은)의 현재 스펙, 무기/아르카나 단계, 계정별 키나 보유액, 본캐 가중치를 모두 대조 분석하십시오.
   - 단기 이득, 위험도, 기회비용, 계정별 자원 배분을 고려해 명확한 강화/육성 순위를 제시하십시오.
4. 사용자 입력에 캐릭터가 명시되지 않은 단순 수치 설정 시, 섣불리 특정 캐릭터로 단정하지 않고 어느 캐릭터의 정보인지 명확히 안내하십시오.
5. 제공된 최신 상태(contextPrompt.targetCharacter 및 stateChangesMade)를 절대적인 사실(Authoritative)로 간주하십시오.
6. 응답 형식:
   - 비교/최적화 질문:
     **결론** (명확한 우선순위)
     **근거** (스펙 및 자원 비교)
     **대안 비교** (자원 보존 및 단계별 투자)
     **실행 순서** (즉시 실행할 액션)
     **뒤집는 조건** (이 결정이 무효화되는 트리거)
   - 기록(RECORD) 및 정정 질문:
     **기록 결과**
     **상태 변화**
     (필요시 다음 권장 조치 1줄)
   - 요약(SUMMARY) 질문:
     **계정 및 캐릭터별 요약**
     **총 자산 현황**
     **해석 및 제언**
7. 질문을 불필요하게 되묻지 말고(No-question default), 최선의 결론을 먼저 제시하십시오.`;

      for (const modelName of modelsToTry) {
        try {
          const response = await gemini.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${systemInstruction}\n\n[현재 시스템 상태 및 사용자 입력 데이터]\n${JSON.stringify(
                      contextPrompt,
                      null,
                      2
                    )}\n\n사용자 메시지: "${userMessage}"`,
                  },
                ],
              },
            ],
          });

          if (response.text) {
            aiAnswer = response.text;
            break;
          }
        } catch (modelErr) {
          console.warn(`Model ${modelName} failed:`, modelErr);
        }
      }
    } catch (err) {
      console.error('Gemini call error:', err);
    }

    if (!aiAnswer) {
      // Deterministic Local Fallback if AI unavailable
      if (stateChanges.length > 0) {
        aiAnswer = `**기록 결과**\n${stateChanges.map((sc) => `- ${sc}`).join('\n')}\n\n최신 상태가 정상적으로 영속 저장되었습니다.`;
      } else if (intents.includes('COMPARE') || intents.includes('OPTIMIZE')) {
        aiAnswer = `**결론**\n현재 등록된 5개 캐릭터(질풍호법, 격앙수호, 지켈검성, 햐음, 쩡은)의 데이터를 비교합니다.\n\n**현황**\n` +
          rosterSummary
            .map(
              (r) =>
                `- **${r.name}** (${r.className}${r.isMain ? ' / 본캐' : ''}): ${r.formattedKinah}, 주무기 ${r.weapon}, 아르카나 ${r.arcana}`
            )
            .join('\n') +
          `\n\n총 보유 자산: ${this.formatKinah(masterState.economySummary.totalKinah)}`;
      } else {
        aiAnswer = `데이터가 처리되었습니다.`;
      }
    }

    // F. SAVE DECISION IF OPTIMIZE/COMPARE
    if (intents.includes('OPTIMIZE') || intents.includes('COMPARE')) {
      const decId = `DEC_${Date.now()}`;
      const newDecision: DecisionRecord = {
        id: decId,
        datetime: nowIso,
        scope: targetCharId
          ? `${charState?.identity.name || targetCharId} 최적화`
          : '전체 5캐릭터 통합 최적화',
        problem: userMessage,
        goal: '스펙 향상 및 자원 기회비용 최적화',
        constraints: [
          `총 보유 자산: ${this.formatKinah(masterState.economySummary.totalKinah)}`,
          '본캐: 질풍호법, 햐음',
        ],
        knownFacts: [
          `타겟 캐릭터: ${charState ? `${charState.identity.name} (${charState.identity.className})` : '전체 5캐릭터'}`,
          ...stateChanges,
        ],
        unknowns: [],
        hypotheses: [],
        options: [],
        recommendation: aiAnswer.slice(0, 300),
        confidence: registeredConfidence,
        recheckTriggers: ['키나 변동', '강화 단계 변경', '신규 장비 획득'],
        result: 'executed',
      };
      repository.saveDecision(newDecision);
      registeredDecisionId = decId;
    }

    return {
      answer: aiAnswer,
      intents,
      characterId: targetCharId || (charResolution.matchedBy === 'all_characters' ? 'ALL' : 'UNRESOLVED'),
      stateChanges,
      metadata: {
        decisionId: registeredDecisionId,
        eventId: registeredEventId,
        recheckTriggers: ['키나 변동', '강화 단계 변경'],
        confidence: registeredConfidence,
      },
    };
  }
}
