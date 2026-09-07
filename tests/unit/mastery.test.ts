import { describe, expect, it } from 'vitest'
import {
  BUILD_SPEED_BONUS,
  CRITICAL_DEFAULT_DURATION_HOURS,
  HALVING_THRESHOLD_HOURS,
  calcDurationForWork,
  calcPhaseWork,
  formatHoursAsHm,
  getRequiredWork,
  getRequiredWorkBase,
  planCriticalCompanionStage,
  suggestStagePlans,
} from '../../app/utils/mastery'
import type { MasteryStageCandidates } from '../../app/types/mastery'

// 2026-09-06 公式修正（見 docs/domain/arknights_tools_init.md 第 3、5、7 節）：
// 5% 基地加成（BUILD_SPEED_BONUS）不再單獨套用在 RequiredWorkBase，
// 改成跟陪同幹員效率加成相加後，一起套用在 phase.work 的換算上。

describe('常數', () => {
  it('對照領域文件第 1、4 節', () => {
    expect(BUILD_SPEED_BONUS).toBe(0.05)
    expect(HALVING_THRESHOLD_HOURS).toBe(5)
    // critical 幹員預設陪同時長＝門檻 5hr 另加 5 分鐘操作緩衝
    expect(CRITICAL_DEFAULT_DURATION_HOURS).toBeCloseTo(5 + 5 / 60, 6)
  })
})

describe('getRequiredWorkBase', () => {
  it('依領域文件第 3 節：RequiredWorkBase(N) = Tbase(N)，不再除以 1.05', () => {
    expect(getRequiredWorkBase(1)).toBe(8)
    expect(getRequiredWorkBase(2)).toBe(16)
    expect(getRequiredWorkBase(3)).toBe(24)
  })
})

describe('getRequiredWork', () => {
  it('專精一永遠不減半（沒有上一階段）', () => {
    expect(getRequiredWork(1, true)).toBe(8)
    expect(getRequiredWork(1, false)).toBe(8)
  })

  it('上一階段觸發減半時，本階段所需工作量減半', () => {
    expect(getRequiredWork(2, true)).toBe(8)
    expect(getRequiredWork(3, true)).toBe(12)
  })

  it('上一階段未觸發減半時，維持原始所需工作量', () => {
    expect(getRequiredWork(2, false)).toBe(16)
    expect(getRequiredWork(3, false)).toBe(24)
  })
})

describe('calcPhaseWork', () => {
  it('對照領域文件第 7 節真實截圖驗算：水陳 95% 加成陪同 33 分 9 秒', () => {
    // rate = 1 + BuildSpeedBonus(0.05) + 0.95 = 2.00
    expect(calcPhaseWork(33.15 / 60, 95)).toBeCloseTo(66.3 / 60, 4)
  })

  it('沒有陪同幹員加成時，仍套用 5% 基地加成', () => {
    expect(calcPhaseWork(1, 0)).toBeCloseTo(1.05, 6)
  })

  it('依當下效率加成與基地加成相加換算 phase 工作量', () => {
    expect(calcPhaseWork(2, 50)).toBeCloseTo(3.1, 6)
  })
})

describe('calcDurationForWork', () => {
  it('是 calcPhaseWork 的反函式', () => {
    const duration = 2.5
    const efficiencyPercent = 30
    const work = calcPhaseWork(duration, efficiencyPercent)
    expect(calcDurationForWork(work, efficiencyPercent)).toBeCloseTo(duration, 6)
  })

  it('對照領域文件第 7 節：RequiredWorkBase(1) 除以水陳 rate(2.00) 得到畫面顯示的倒數 4hr', () => {
    expect(calcDurationForWork(getRequiredWorkBase(1), 95)).toBeCloseTo(4, 6)
  })
})

describe('planCriticalCompanionStage', () => {
  it('critical 幹員陪滿預設時長，另一位陪練幹員補滿剩餘工作量', () => {
    const plan = planCriticalCompanionStage(8, CRITICAL_DEFAULT_DURATION_HOURS, 0, 60)

    expect(plan.criticalWork).toBeCloseTo(5.3375, 4)
    expect(plan.otherOperatorDurationHours).toBeCloseTo(2.6625 / 1.65, 6)
    expect(plan.triggersNextHalving).toBe(true)
    expect(plan.maxCriticalDurationHours).toBeCloseTo(8 / 1.05, 6)
  })

  it('critical 幹員單獨已補滿（甚至超過）所需工作量時，另一位陪練幹員回傳 null', () => {
    const plan = planCriticalCompanionStage(4, CRITICAL_DEFAULT_DURATION_HOURS, 0, 60)

    expect(plan.otherOperatorDurationHours).toBeNull()
    // 即使已經超過所需工作量，只要陪滿 5hr 門檻，下一階段減半依然成立
    expect(plan.triggersNextHalving).toBe(true)
  })

  it('critical 幹員陪同時長未達 5hr 門檻時，不觸發下一階段減半', () => {
    const plan = planCriticalCompanionStage(8, 4, 0, 60)

    expect(plan.triggersNextHalving).toBe(false)
    expect(plan.otherOperatorDurationHours).toBeCloseTo(3.8 / 1.65, 6)
  })
})

describe('suggestStagePlans', () => {
  it('專精一、二各安排 critical 幹員＋陪練幹員，皆觸發下一階段減半', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [1, { criticalCandidate: { efficiencyPercent: 0 }, otherCandidate: { efficiencyPercent: 60 } }],
      [2, { criticalCandidate: { efficiencyPercent: 0 }, otherCandidate: { efficiencyPercent: 75 } }],
    ])
    const [phase1, phase2] = suggestStagePlans([1, 2], candidatesByPhase)

    expect(phase1.requiredWork).toBe(8)
    expect(phase1.criticalWork).toBeCloseTo(5.3375, 4)
    expect(phase1.otherOperatorDurationHours).toBeCloseTo(2.6625 / 1.65, 6)
    expect(phase1.triggersNextHalving).toBe(true)

    // 專精二因專精一視為已觸發減半，RequiredWork 減半為 8
    expect(phase2.requiredWork).toBe(8)
    expect(phase2.otherOperatorDurationHours).toBeCloseTo(2.6625 / 1.8, 6)
    expect(phase2.triggersNextHalving).toBe(true)
  })

  it('專精三沒有下一階段可減半，不安排 critical 幹員（即使候選資料中有 criticalCandidate）', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [3, { criticalCandidate: { efficiencyPercent: 0 }, otherCandidate: { efficiencyPercent: 60 } }],
    ])
    const [phase3] = suggestStagePlans([3], candidatesByPhase)

    expect(phase3.criticalWork).toBeNull()
    expect(phase3.otherOperatorDurationHours).toBeCloseTo(24 / 1.65, 6)
    expect(phase3.triggersNextHalving).toBe(false)
  })

  it('該階段查無 critical 候選幹員時，直接反推單一陪練幹員的所需時長', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [1, { otherCandidate: { efficiencyPercent: 60 } }],
    ])
    const [phase1] = suggestStagePlans([1], candidatesByPhase)

    expect(phase1.criticalWork).toBeNull()
    expect(phase1.otherOperatorDurationHours).toBeCloseTo(8 / 1.65, 6)
    expect(phase1.triggersNextHalving).toBe(false)
  })

  it('該階段完全查無候選資料時，建議時長為 null', () => {
    const [phase2] = suggestStagePlans([2], new Map())

    expect(phase2.criticalWork).toBeNull()
    expect(phase2.otherOperatorDurationHours).toBeNull()
    expect(phase2.triggersNextHalving).toBe(false)
  })

  it('起始階段是宣告式假設：選擇的起始階段本身視為未減半，之後階段依序視為已減半', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [2, { otherCandidate: { efficiencyPercent: 60 } }],
      [3, { otherCandidate: { efficiencyPercent: 60 } }],
    ])
    const [phase2, phase3] = suggestStagePlans([2, 3], candidatesByPhase)

    // 起始階段選專精二：專精二視為未減半，維持完整 RequiredWorkBase(2)
    expect(phase2.requiredWork).toBe(16)
    // 專精三視為專精二已觸發減半
    expect(phase3.requiredWork).toBe(12)
  })
})

describe('formatHoursAsHm', () => {
  it('對照領域文件第 3 節三個階段的 RequiredWorkBase', () => {
    expect(formatHoursAsHm(getRequiredWorkBase(1))).toBe('8 小時 0 分')
    expect(formatHoursAsHm(getRequiredWorkBase(2))).toBe('16 小時 0 分')
    expect(formatHoursAsHm(getRequiredWorkBase(3))).toBe('24 小時 0 分')
  })

  it('critical 幹員預設陪同時長（5hr 另加 5 分鐘操作緩衝）', () => {
    expect(formatHoursAsHm(CRITICAL_DEFAULT_DURATION_HOURS)).toBe('5 小時 5 分')
  })
})
