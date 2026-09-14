/**
 * Character Resolution Engine (Multi-Character / Multi-Account Aware)
 * Strict Resolution Hierarchy:
 * 1. Explicit character name match (질풍호법, 격앙수호, 지켈검성, 햐음, 쩡은 등)
 * 2. Character-specific aliases (질풍, 격앙, 지켈 등)
 * 3. Class name / role aliases (호법성, 수호성, 검성, 권성, 치유성 등)
 * 4. Multi-character / Account-wide comparison detection ("전체", "모든 캐릭터", "누구부터" 등)
 * 5. Recent conversation context (most recently confirmed character in chat history)
 * 6. Unresolved (DO NOT fall back to any default character)
 */

import { CharacterState } from '../src/types.js';
import { ProjectStateRepository } from './repository.js';

export interface ResolutionResult {
  characterId?: string;
  characterState?: CharacterState;
  isConfirmed: boolean;
  matchedBy: 'explicit' | 'alias' | 'class' | 'recent_context' | 'all_characters' | 'unresolved';
  candidateCharacters?: CharacterState[];
}

export const CLASS_ALIASES: Record<string, string[]> = {
  권성: ['권성', '격투', '주먹', '권사', 'pugilist'],
  치유성: ['치유', '치유성', '사제', '전래', 'cleric'],
  호법성: ['호법', '호법성', '지팡이', 'chanter'],
  수호성: ['수호', '수호성', '방패', '한손검', 'templar'],
  검성: ['지켈검성', '검성', '대검', '창', 'gladiator'],
  살성: ['살성', '단도', '장검', '단검', 'assassin'],
  궁성: ['궁성', '활', '장궁', 'ranger'],
  마도성: ['마도', '마도성', '보주', '법서', 'sorcerer'],
  정령성: ['정령', '정령성', 'spiritmaster'],
};

export function resolveCharacter(
  userText: string,
  recentMessages: Array<{ role: string; content: string; metadata?: any }>,
  repository: ProjectStateRepository
): ResolutionResult {
  const characters = repository.getCharacters();
  const lowerText = userText.toLowerCase().trim();

  // 1. Explicit character name match (sorted by name length descending to avoid partial collision)
  const sortedByNameLength = [...characters].sort(
    (a, b) => b.identity.name.length - a.identity.name.length
  );
  for (const char of sortedByNameLength) {
    const name = char.identity.name.toLowerCase();
    if (name && lowerText.includes(name)) {
      return {
        characterId: char.characterId,
        characterState: char,
        isConfirmed: true,
        matchedBy: 'explicit',
      };
    }
  }

  // 2. Character-specific aliases match
  for (const char of characters) {
    const aliases = char.identity.aliases || [];
    for (const alias of aliases) {
      if (alias && alias.length >= 2 && lowerText.includes(alias.toLowerCase())) {
        return {
          characterId: char.characterId,
          characterState: char,
          isConfirmed: true,
          matchedBy: 'alias',
        };
      }
    }
  }

  // 3. Class name / role aliases match
  for (const [className, aliases] of Object.entries(CLASS_ALIASES)) {
    if (aliases.some((a) => lowerText.includes(a.toLowerCase()))) {
      const match = characters.find((c) => c.identity.className === className);
      if (match) {
        return {
          characterId: match.characterId,
          characterState: match,
          isConfirmed: true,
          matchedBy: 'class',
        };
      }
    }
  }

  // 4. Check for multi-character or account-wide inquiry
  const isMultiQuery =
    lowerText.includes('전체') ||
    lowerText.includes('모든') ||
    lowerText.includes('누구') ||
    lowerText.includes('어떤 캐릭') ||
    lowerText.includes('어느 캐릭') ||
    lowerText.includes('계정') ||
    lowerText.includes('본캐') ||
    lowerText.includes('다섯') ||
    lowerText.includes('비교');

  if (isMultiQuery) {
    return {
      characterId: undefined,
      characterState: undefined,
      isConfirmed: false,
      matchedBy: 'all_characters',
      candidateCharacters: characters,
    };
  }

  // 5. Recent conversation context (check backwards in messages)
  if (recentMessages && recentMessages.length > 0) {
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];

      // Check metadata characterId if present
      if (msg.metadata?.characterId) {
        const char = repository.getCharacter(msg.metadata.characterId);
        if (char) {
          return {
            characterId: char.characterId,
            characterState: char,
            isConfirmed: false,
            matchedBy: 'recent_context',
          };
        }
      }

      // Check text in recent message
      const content = msg.content?.toLowerCase() || '';
      for (const char of sortedByNameLength) {
        const name = char.identity.name.toLowerCase();
        if (name && content.includes(name)) {
          return {
            characterId: char.characterId,
            characterState: char,
            isConfirmed: false,
            matchedBy: 'recent_context',
          };
        }
      }

      for (const [className, aliases] of Object.entries(CLASS_ALIASES)) {
        if (aliases.some((a) => content.includes(a.toLowerCase()))) {
          const match = characters.find((c) => c.identity.className === className);
          if (match) {
            return {
              characterId: match.characterId,
              characterState: match,
              isConfirmed: false,
              matchedBy: 'recent_context',
            };
          }
        }
      }
    }
  }

  // 6. Unresolved: DO NOT fallback to any default character
  return {
    characterId: undefined,
    characterState: undefined,
    isConfirmed: false,
    matchedBy: 'unresolved',
  };
}
