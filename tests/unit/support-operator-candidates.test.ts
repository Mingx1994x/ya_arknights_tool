import { describe, expect, it } from 'vitest'
import { resolveCandidatesByPhase } from '../../server/utils/support-operator-candidates'
import type { SupportOperatorRecord } from '../../shared/types/support-operator'

// 對照 docs/plans/draft（歸檔後見 docs/plans/archive）
// 2026-09-10-support-operator-critical-candidates-field.md：
// criticalCandidates 是新增的便利欄位，candidates 本身仍是 4 類混合、不排除 critical。
const OPERATORS: SupportOperatorRecord[] = [
  {
    id: 'cN-01',
    codeName: 'Logos',
    category: 'critical',
    targetProfession: ['術師', '輔助'],
    targetPhase: 0,
    baseEfficiency: 0,
    conditionEfficiency: 30,
  },
  {
    id: 'cN-02',
    codeName: '艾麗妮',
    category: 'critical',
    targetProfession: ['近衛', '狙擊'],
    targetPhase: 0,
    baseEfficiency: 0,
    conditionEfficiency: 30,
  },
  {
    id: 'cN-05',
    codeName: '黑',
    category: 'general',
    targetProfession: ['狙擊'],
    targetPhase: 0,
    baseEfficiency: 60,
    conditionEfficiency: 0,
  },
  {
    id: 'cN-12',
    codeName: '假日威龍陳',
    category: 'skill',
    targetProfession: ['狙擊'],
    targetPhase: 1,
    baseEfficiency: 30,
    conditionEfficiency: 65,
  },
]

describe('resolveCandidatesByPhase 的 criticalCandidates 欄位', () => {
  it('只含 category === critical，且依 realEfficiency 排序', () => {
    const [group] = resolveCandidatesByPhase(OPERATORS, '狙擊', 1)

    expect(group.criticalCandidates.every((c) => c.category === 'critical')).toBe(true)
    // 艾麗妮命中 class=狙擊，conditionEfficiency 計入；Logos 目標職業是術師/輔助，未命中，
    // realEfficiency 退回只剩 baseEfficiency（0），因此排在後面。
    expect(group.criticalCandidates.map((c) => c.codeName)).toEqual(['艾麗妮', 'Logos'])
    expect(group.criticalCandidates.map((c) => c.realEfficiency)).toEqual([30, 0])
  })

  it('等於 candidates.filter(c => c.category === critical)', () => {
    for (const group of resolveCandidatesByPhase(OPERATORS, '狙擊', 1)) {
      expect(group.criticalCandidates).toEqual(
        group.candidates.filter((c) => c.category === 'critical'),
      )
    }
  })

  it('candidates 本身仍包含 critical，不因新增便利欄位而被排除', () => {
    const [group] = resolveCandidatesByPhase(OPERATORS, '狙擊', 1)

    expect(group.candidates.some((c) => c.category === 'critical')).toBe(true)
    expect(group.candidates).toHaveLength(OPERATORS.length)
  })
})
