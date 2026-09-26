import { describe, expect, it } from 'vitest'
import { matchesTargetProfession, resolveCandidatesByPhase } from '../../server/utils/support-operator-candidates'
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
    id: 'cN-03',
    codeName: '烏爾比安',
    category: 'specific',
    targetProfession: ['近衛', '輔助'],
    targetPhase: 0,
    baseEfficiency: 50,
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

describe('matchesTargetProfession', () => {
  const operator = OPERATORS.find((o) => o.codeName === '烏爾比安')! // targetProfession: 近衛/輔助

  it('targetClass 命中 targetProfession 時回傳 true', () => {
    expect(matchesTargetProfession(operator, '近衛')).toBe(true)
    expect(matchesTargetProfession(operator, '輔助')).toBe(true)
  })

  it('targetClass 未命中 targetProfession 時回傳 false', () => {
    expect(matchesTargetProfession(operator, '狙擊')).toBe(false)
  })

  it('targetClass 為 undefined 時視為不命中', () => {
    expect(matchesTargetProfession(operator, undefined)).toBe(false)
  })
})

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

// 對照 docs/domain/arknights_tools_init.md 第 9 節新增的篩選規則：
// specific 類別（例如烏爾比安）不受 targetClass 篩選排除，一律列入候選；但跟 critical
// 一樣，conditionEfficiency 只在職業命中 targetProfession 時才計入 realEfficiency，
// 未命中則只有 baseEfficiency（烏爾比安基礎 50%，命中近衛/輔助才加到 80%）；
// general／skill 仍受 targetClass 篩選（未帶 targetClass 時不篩），但 realEfficiency
// 同樣改用職業命中才計入 conditionEfficiency 的規則，未帶 targetClass 時退回只剩
// baseEfficiency，四個類別的計算規則一致；所有類別的階段資格統一用 targetPhase
// 通用判斷（0 = 不限階段）。
describe('resolveCandidatesByPhase 的職業／階段篩選規則', () => {
  it('specific 類別不受職業篩選，職業不符時仍列入候選，但 realEfficiency 只剩 baseEfficiency', () => {
    // 烏爾比安 targetProfession 是 近衛/輔助，這裡選狙擊（不命中）
    const [group] = resolveCandidatesByPhase(OPERATORS, '狙擊', 1)

    const ulpianus = group.candidates.find((c) => c.codeName === '烏爾比安')
    expect(ulpianus).toBeDefined()
    expect(ulpianus?.realEfficiency).toBe(50) // conditionEfficiency(30) 未計入，只剩 baseEfficiency(50)
  })

  it('specific 類別職業命中時，realEfficiency 計入 conditionEfficiency', () => {
    // 烏爾比安 targetProfession 是 近衛/輔助，這裡選近衛（命中）
    const [group] = resolveCandidatesByPhase(OPERATORS, '近衛', 1)

    const ulpianus = group.candidates.find((c) => c.codeName === '烏爾比安')
    expect(ulpianus?.realEfficiency).toBe(80) // baseEfficiency(50) + conditionEfficiency(30)
  })

  it('未帶 targetClass 時，specific 類別依然列入候選，但 realEfficiency 只剩 baseEfficiency（跟 critical 一致）', () => {
    const [group] = resolveCandidatesByPhase(OPERATORS, undefined, 1)

    const ulpianus = group.candidates.find((c) => c.codeName === '烏爾比安')
    expect(ulpianus).toBeDefined()
    expect(ulpianus?.realEfficiency).toBe(50)
  })

  it('general 類別仍受職業篩選，職業不符時被排除（迴歸測試）', () => {
    // 黑 targetProfession 是 狙擊，這裡選醫療（不命中）
    const [group] = resolveCandidatesByPhase(OPERATORS, '醫療', 1)

    expect(group.candidates.some((c) => c.codeName === '黑')).toBe(false)
  })

  it('未帶 targetClass 時，skill 類別依然列入候選，但 realEfficiency 只剩 baseEfficiency（跟 critical/specific 一致）', () => {
    // 假日威龍陳 baseEfficiency 30／conditionEfficiency 65，未帶職業時 conditionEfficiency 不應計入
    const [group] = resolveCandidatesByPhase(OPERATORS, undefined, 1)

    const skillOperator = group.candidates.find((c) => c.codeName === '假日威龍陳')
    expect(skillOperator).toBeDefined()
    expect(skillOperator?.realEfficiency).toBe(30)
  })

  it('skill 類別的 targetPhase 篩選行為不變：只在對應 phase 的那組出現', () => {
    const groups = resolveCandidatesByPhase(OPERATORS, '狙擊', 1)

    // 假日威龍陳 targetPhase 是 1，只應出現在 phase 1 的那組
    const phase1 = groups.find((g) => g.phase === 1)
    const phase2 = groups.find((g) => g.phase === 2)
    expect(phase1?.candidates.some((c) => c.codeName === '假日威龍陳')).toBe(true)
    expect(phase2?.candidates.some((c) => c.codeName === '假日威龍陳')).toBe(false)
  })
})
