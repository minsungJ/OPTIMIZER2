/**
 * Character Resolution Engine
 * Implements strict resolution hierarchy:
 * 1. explicit character name
 * 2. known alias (e.g. 검성, 마도성, 살성, 수호성, 치유성, 호법성, 궁성, 정령성)
 * 3. previously registered identity
 * 4. recent conversation context
 * 5. active character context
 */

import { CharacterState } from '../src/types.js';
import { ProjectStateRepository } from './repository.js';

export interface ResolutionResult {
  characterId: string;
  characterState: CharacterState;
  isConfirmed: boolean;
  matchedBy: 'explicit' | 'alias' | 'recent_context' | 'active_default' | 'unresolved';
}

const CLASS_ALIASES: Record<string, string[]> = {
  검성: ['검성', '대검', '창', 'gladiator'],
  수호성: ['수호', '수호성', '방패', '한손검', 'templar'],
  살성: ['살성', '단도', '장검', '단검', 'assassin'],
  궁성: ['궁성', '활', '장궁', 'ranger'],
  마도성: ['마도', '마도성', '보주', '법서', 'sorcerer'],
  정령성: ['정령', '정령성', 'spiritmaster'],
  치유성: ['치유', '치유성', '전래', '사제', 'cleric'],
  호법성: ['호법', '호법성', '지팡이', 'chanter'],
};

export function resolveCharacter(
  userText: string,
  recentMessages: Array<{ role: string; content: string }>,
  repository: ProjectStateRepository
): ResolutionResult {
  const characters = repository.getCharacters();
  const lowerText = userText.toLowerCase();

  // 1. Explicit character name match
  for (const char of characters) {
    if (char.identity.name && lowerText.includes(char.identity.name.toLowerCase())) {
      return {
        characterId: char.characterId,
        characterState: char,
        isConfirmed: true,
        matchedBy: 'explicit',
      };
    }
  }

  // 2. Known alias / class match
  for (const char of characters) {
    const aliases = [...(char.identity.aliases || []), char.identity.className];
    const registeredClassAliases = CLASS_ALIASES[char.identity.className] || [];
    const allAliases = [...aliases, ...registeredClassAliases];

    for (const alias of allAliases) {
      if (alias && lowerText.includes(alias.toLowerCase())) {
        return {
          characterId: char.characterId,
          characterState: char,
          isConfirmed: true,
          matchedBy: 'alias',
        };
      }
    }
  }

  // 3. Check if user mentioned another known class that exists in repository
  for (const [className, aliases] of Object.entries(CLASS_ALIASES)) {
    if (aliases.some((a) => lowerText.includes(a))) {
      const match = characters.find((c) => c.identity.className === className);
      if (match) {
        return {
          characterId: match.characterId,
          characterState: match,
          isConfirmed: true,
          matchedBy: 'alias',
        };
      }
    }
  }

  // 4. Recent conversation context
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const content = msg.content.toLowerCase();
    for (const char of characters) {
      const aliases = [...(char.identity.aliases || []), char.identity.className];
      if (aliases.some((a) => content.includes(a.toLowerCase()))) {
        return {
          characterId: char.characterId,
          characterState: char,
          isConfirmed: false,
          matchedBy: 'recent_context',
        };
      }
    }
  }

  // 5. Active default character context
  const defaultChar = repository.getDefaultCharacter();
  return {
    characterId: defaultChar.characterId,
    characterState: defaultChar,
    isConfirmed: false,
    matchedBy: 'active_default',
  };
}
