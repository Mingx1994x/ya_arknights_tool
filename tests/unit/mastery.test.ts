import { describe, expect, it } from 'vitest'
import {
  calcCompletedWork,
  calcCriticalHours,
  calcPhaseWork,
  evaluateStages,
  formatHoursAsHm,
  getRequiredWork,
  getRequiredWorkBase,
  suggestStagePlans,
  type MasteryPhaseSegment,
} from '../../app/utils/mastery'

// 對照 docs/domain/arknights_tools_init.md 第 7 節：
// 專精一、專精二都陪同 Logos 滿 5hr 5min（= 305 分鐘），因此專精二、專精三都套用減半。
const PHASE_1_SEGMENTS: MasteryPhaseSegment[] = [
  { durationHours: 95.08 / 60, efficiencyBonusPercent: 60, isCritical: false },
  { durationHours: 305.0 / 60, efficiencyBonusPercent: 0, isCritical: true },
]
const PHASE_2_SEGMENTS: MasteryPhaseSegment[] = [
  { durationHours: 86.93 / 60, efficiencyBonusPercent: 75, isCritical: false },
  { durationHours: 305.0 / 60, efficiencyBonusPercent: 0, isCritical: true },
]
const PHASE_3_SEGMENTS: MasteryPhaseSegment[] = [
  { durationHours: 428.57 / 60, efficiencyBonusPercent: 60, isCritical: false },
]

describe('getRequiredWorkBase', () => {
  it('依領域文件第 3 節：Tbase(N) / 1.05', () => {
    expect(getRequiredWorkBase(1)).toBeCloseTo(457.14 / 60, 3)
    expect(getRequiredWorkBase(2)).toBeCloseTo(914.29 / 60, 3)
    expect(getRequiredWorkBase(3)).toBeCloseTo(1371.43 / 60, 3)
  })
})

describe('getRequiredWork', () => {
  it('專精一永遠不減半（沒有上一階段）', () => {
    expect(getRequiredWork(1, true)).toBe(getRequiredWorkBase(1))
    expect(getRequiredWork(1, false)).toBe(getRequiredWorkBase(1))
  })

  it('上一階段觸發減半時，本階段所需工作量減半', () => {
    expect(getRequiredWork(2, true)).toBeCloseTo(getRequiredWorkBase(2) / 2, 6)
    expect(getRequiredWork(3, true)).toBeCloseTo(getRequiredWorkBase(3) / 2, 6)
  })

  it('上一階段未觸發減半時，維持原始所需工作量', () => {
    expect(getRequiredWork(2, false)).toBe(getRequiredWorkBase(2))
    expect(getRequiredWork(3, false)).toBe(getRequiredWorkBase(3))
  })
})

describe('calcPhaseWork', () => {
  it('依當下效率加成換算 phase 工作量', () => {
    // 對照 docs/domain/arknights_tools_init.md 第 7 節，專精一範例
    expect(calcPhaseWork(95.08 / 60, 60)).toBeCloseTo(152.14 / 60, 2)
  })
})

describe('calcCompletedWork／calcCriticalHours（第 7 節範例驗算）', () => {
  it('專精一：CompletedWork 接近 RequiredWork，且陪滿 5hr 觸發下一階段減半', () => {
    expect(calcCompletedWork(PHASE_1_SEGMENTS)).toBeCloseTo(457.14 / 60, 2)
    expect(calcCriticalHours(PHASE_1_SEGMENTS)).toBeCloseTo(305 / 60, 2)
    expect(calcCriticalHours(PHASE_1_SEGMENTS)).toBeGreaterThanOrEqual(5)
  })

  it('專精二：套用減半後的 RequiredWork 與 CompletedWork 接近，且陪滿 5hr', () => {
    expect(getRequiredWork(2, true)).toBeCloseTo(457.14 / 60, 2)
    expect(calcCompletedWork(PHASE_2_SEGMENTS)).toBeCloseTo(457.13 / 60, 2)
    expect(calcCriticalHours(PHASE_2_SEGMENTS)).toBeGreaterThanOrEqual(5)
  })

  it('專精三：套用減半後的 RequiredWork 與 CompletedWork 接近，且未陪同 Logos／艾麗妮', () => {
    expect(getRequiredWork(3, true)).toBeCloseTo(685.71 / 60, 2)
    expect(calcCompletedWork(PHASE_3_SEGMENTS)).toBeCloseTo(685.71 / 60, 2)
    expect(calcCriticalHours(PHASE_3_SEGMENTS)).toBe(0)
  })
})

describe('evaluateStages', () => {
  it('依序串接跨階段減半，且減半不會累加（第 4 節）', () => {
    const segmentsByPhase = { 1: PHASE_1_SEGMENTS, 2: PHASE_2_SEGMENTS, 3: PHASE_3_SEGMENTS } as const
    const results = evaluateStages([1, 2, 3], false, (phase) => [...segmentsByPhase[phase]])

    expect(results[0].triggersNextHalving).toBe(true)
    expect(results[1].requiredWork).toBeCloseTo(results[1].requiredWorkBase / 2, 6)
    expect(results[1].triggersNextHalving).toBe(true)
    expect(results[2].requiredWork).toBeCloseTo(results[2].requiredWorkBase / 2, 6)
    // 專精三沒有陪同 Logos／艾麗妮，不會再觸發（減半不累加，即使前兩階段都觸發過）
    expect(results[2].triggersNextHalving).toBe(false)
  })

  it('isComplete：CompletedWork 達到 RequiredWork 才算完成', () => {
    const [result] = evaluateStages([1], false, () => [
      { durationHours: 10, efficiencyBonusPercent: 0, isCritical: false },
    ])
    expect(result.isComplete).toBe(true)

    const [incomplete] = evaluateStages([1], false, () => [
      { durationHours: 1, efficiencyBonusPercent: 0, isCritical: false },
    ])
    expect(incomplete.isComplete).toBe(false)
  })
})

describe('suggestStagePlans', () => {
  it('反推建議陪同時長，並在達到減半門檻時帶入下一階段', () => {
    const results = suggestStagePlans([1, 2], false, (phase) =>
      phase === 1 ? { efficiencyBonusPercent: 0, isCritical: true } : { efficiencyBonusPercent: 60, isCritical: false },
    )

    // 專精一用 0% 加成的 critical 候選人陪滿整個階段，時長等於 RequiredWork 本身
    expect(results[0].suggestedDurationHours).toBeCloseTo(getRequiredWorkBase(1), 6)
    expect(results[0].triggersNextHalving).toBe(true)
    // 專精二因此套用減半
    expect(results[1].requiredWork).toBeCloseTo(getRequiredWorkBase(2) / 2, 6)
  })

  it('沒有候選幹員時建議時長為 null', () => {
    const [result] = suggestStagePlans([1], false, () => undefined)
    expect(result.suggestedDurationHours).toBeNull()
    expect(result.triggersNextHalving).toBe(false)
  })
})

describe('formatHoursAsHm', () => {
  it('對照領域文件第 3 節「約略時間」欄位', () => {
    expect(formatHoursAsHm(getRequiredWorkBase(1))).toBe('7 小時 37 分')
    expect(formatHoursAsHm(getRequiredWorkBase(2))).toBe('15 小時 14 分')
    expect(formatHoursAsHm(getRequiredWorkBase(3))).toBe('22 小時 51 分')
  })
})
