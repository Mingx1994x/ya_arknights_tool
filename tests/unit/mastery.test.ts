import { describe, expect, it } from 'vitest'
import {
  BUILD_SPEED_BONUS,
  CRITICAL_DEFAULT_DURATION_MINUTES,
  HALVING_THRESHOLD_MINUTES,
  baseCompanionStage,
  calcDurationForWork,
  calcPhaseWork,
  criticalCompanionStage,
  formatMinutesAsHm,
  generalCompanionStage,
  getRequiredWork,
  getRequiredWorkBase,
  normalizeCriticalDurationInput,
  suggestStagePlans,
} from '../../app/utils/mastery'
import type { MasteryStageCandidates } from '../../app/types/mastery'

// 2026-09-06 公式修正（見 docs/domain/arknights_tools_init.md 第 3、5、7 節）：
// 5% 基地加成（BUILD_SPEED_BONUS）不再單獨套用在 RequiredWorkBase，
// 改成跟陪同幹員效率加成相加後，一起套用在 phase.work 的換算上。
//
// 2026-09-16 單位修正（見領域文件第 2 節）：內部計算改以「分鐘」為基礎單位，取代「小時的小數」，
// 避免 `5 + 5/60` 這類無限循環小數造成的浮點數誤差。

describe('常數', () => {
  it('對照領域文件第 1、4 節', () => {
    expect(BUILD_SPEED_BONUS).toBe(0.05)
    expect(HALVING_THRESHOLD_MINUTES).toBe(300)
    // critical 幹員預設陪同時長＝門檻 300 分鐘另加 5 分鐘操作緩衝；分鐘制下是精確整數，不再需要 toBeCloseTo
    expect(CRITICAL_DEFAULT_DURATION_MINUTES).toBe(305)
  })
})

describe('getRequiredWorkBase', () => {
  it('依領域文件第 3 節：RequiredWorkBase(N) = Tbase(N)，不再除以 1.05', () => {
    expect(getRequiredWorkBase(1)).toBe(480)
    expect(getRequiredWorkBase(2)).toBe(960)
    expect(getRequiredWorkBase(3)).toBe(1440)
  })
})

describe('getRequiredWork', () => {
  it('專精一永遠不減半（沒有上一階段）', () => {
    expect(getRequiredWork(1, true)).toBe(480)
    expect(getRequiredWork(1, false)).toBe(480)
  })

  it('本階段已套用減半時，所需工作量減半', () => {
    expect(getRequiredWork(2, true)).toBe(480)
    expect(getRequiredWork(3, true)).toBe(720)
  })

  it('本階段未套用減半時，維持原始所需工作量', () => {
    expect(getRequiredWork(2, false)).toBe(960)
    expect(getRequiredWork(3, false)).toBe(1440)
  })
})

describe('calcPhaseWork', () => {
  it('對照領域文件第 7 節真實截圖驗算：水陳 95% 加成陪同 33 分 9 秒', () => {
    // rate = 1 + BuildSpeedBonus(0.05) + 0.95 = 2.00
    expect(calcPhaseWork(33.15, 95)).toBeCloseTo(66.3, 4)
  })

  it('沒有陪同幹員加成時，仍套用 5% 基地加成', () => {
    expect(calcPhaseWork(60, 0)).toBeCloseTo(63, 6)
  })

  it('依當下效率加成與基地加成相加換算 phase 工作量', () => {
    expect(calcPhaseWork(120, 50)).toBeCloseTo(186, 6)
  })
})

describe('calcDurationForWork', () => {
  it('是 calcPhaseWork 的反函式', () => {
    const duration = 150
    const efficiencyPercent = 30
    const work = calcPhaseWork(duration, efficiencyPercent)
    expect(calcDurationForWork(work, efficiencyPercent)).toBeCloseTo(duration, 6)
  })

  it('對照領域文件第 7 節：RequiredWorkBase(1) 除以水陳 rate(2.00) 得到畫面顯示的倒數 4hr（240 分鐘）', () => {
    expect(calcDurationForWork(getRequiredWorkBase(1), 95)).toBeCloseTo(240, 6)
  })
})

describe('normalizeCriticalDurationInput', () => {
  it('合法輸入直接相加成分鐘，不視為 invalid', () => {
    const result = normalizeCriticalDurationInput(5, 5)

    expect(result.minutes).toBe(305)
    expect(result.isInvalid).toBe(false)
  })

  it('分鐘超過 59 時鉗制為 59，並標記為 invalid（例如「4 小時 70 分」不會被當成 4 小時 70 分疊加）', () => {
    const result = normalizeCriticalDurationInput(4, 70)

    expect(result.minutes).toBe(4 * 60 + 59)
    expect(result.isInvalid).toBe(true)
  })

  it('時或分為負數時視為 0，並標記為 invalid', () => {
    expect(normalizeCriticalDurationInput(-1, 5)).toEqual({ minutes: 5, isInvalid: true })
    expect(normalizeCriticalDurationInput(5, -1)).toEqual({ minutes: 300, isInvalid: true })
  })

  it('輸入框清空時（對應 Vue v-model.number 的空字串）視為 0，不標記為 invalid', () => {
    const result = normalizeCriticalDurationInput(Number(''), Number(''))

    expect(result.minutes).toBe(0)
    expect(result.isInvalid).toBe(false)
  })

  it('分鐘恰為 59 時仍是合法邊界值，不標記為 invalid', () => {
    const result = normalizeCriticalDurationInput(4, 59)

    expect(result.minutes).toBe(4 * 60 + 59)
    expect(result.isInvalid).toBe(false)
  })
})

describe('baseCompanionStage', () => {
  it('單一陪練幹員直接反推所需陪同時長，沒有 critical 分攤', () => {
    const plan = baseCompanionStage(1440, 60)

    expect(plan.operatorDurationMinutes).toBeCloseTo(1440 / 1.65, 6)
  })
})

describe('criticalCompanionStage', () => {
  it('critical 幹員獨自補滿所需工作量，反推陪同時長 ≥ 5hr 時觸發下一階段減半', () => {
    const plan = criticalCompanionStage(480, 0)

    expect(plan.operatorDurationMinutes).toBeCloseTo(480 / 1.05, 6)
    expect(plan.triggersNextHalving).toBe(true)
  })

  it('反推陪同時長未達 5hr 門檻時，不觸發下一階段減半', () => {
    const plan = criticalCompanionStage(240, 0)

    expect(plan.operatorDurationMinutes).toBeCloseTo(240 / 1.05, 6)
    expect(plan.triggersNextHalving).toBe(false)
  })
})

describe('generalCompanionStage', () => {
  it('critical 幹員陪滿預設時長，另一位陪練幹員補滿剩餘工作量', () => {
    const plan = generalCompanionStage(480, CRITICAL_DEFAULT_DURATION_MINUTES, 0, 60)

    expect(plan.criticalWork).toBeCloseTo(320.25, 4)
    expect(plan.otherOperatorDurationMinutes).toBeCloseTo(159.75 / 1.65, 6)
    expect(plan.triggersNextHalving).toBe(true)
    expect(plan.maxCriticalDurationMinutes).toBeCloseTo(480 / 1.05, 6)
  })

  it('critical 幹員單獨已補滿（甚至超過）所需工作量時，另一位陪練幹員回傳 null', () => {
    const plan = generalCompanionStage(240, CRITICAL_DEFAULT_DURATION_MINUTES, 0, 60)

    expect(plan.otherOperatorDurationMinutes).toBeNull()
    // 即使已經超過所需工作量，只要陪滿 5hr 門檻，下一階段減半依然成立
    expect(plan.triggersNextHalving).toBe(true)
  })

  it('critical 幹員陪同時長未達 5hr 門檻時，不觸發下一階段減半', () => {
    const plan = generalCompanionStage(480, 240, 0, 60)

    expect(plan.triggersNextHalving).toBe(false)
    expect(plan.otherOperatorDurationMinutes).toBeCloseTo(228 / 1.65, 6)
  })
})

describe('suggestStagePlans', () => {
  it('專精一、二各安排 critical 幹員＋陪練幹員，皆觸發下一階段減半', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [1, { criticalCandidate: { efficiencyPercent: 0 }, otherCandidate: { efficiencyPercent: 60 } }],
      [2, { criticalCandidate: { efficiencyPercent: 0 }, otherCandidate: { efficiencyPercent: 75 } }],
    ])
    const [phase1, phase2] = suggestStagePlans([1, 2], candidatesByPhase)

    expect(phase1.requiredWork).toBe(480)
    expect(phase1.criticalWork).toBeCloseTo(320.25, 4)
    expect(phase1.operatorDurationMinutes).toBeCloseTo(159.75 / 1.65, 6)
    expect(phase1.triggersNextHalving).toBe(true)

    // 專精二因專精一視為已觸發減半，RequiredWork 減半為 480
    expect(phase2.requiredWork).toBe(480)
    expect(phase2.operatorDurationMinutes).toBeCloseTo(159.75 / 1.8, 6)
    expect(phase2.triggersNextHalving).toBe(true)
  })

  it('專精三沒有下一階段可減半，不安排 critical 幹員（即使候選資料中有 criticalCandidate）', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [3, { criticalCandidate: { efficiencyPercent: 0 }, otherCandidate: { efficiencyPercent: 60 } }],
    ])
    const [phase3] = suggestStagePlans([3], candidatesByPhase)

    expect(phase3.criticalWork).toBeNull()
    expect(phase3.operatorDurationMinutes).toBeCloseTo(1440 / 1.65, 6)
    expect(phase3.triggersNextHalving).toBe(false)
  })

  it('該階段查無 critical 候選幹員時，直接反推單一陪練幹員的所需時長', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [1, { otherCandidate: { efficiencyPercent: 60 } }],
    ])
    const [phase1] = suggestStagePlans([1], candidatesByPhase)

    expect(phase1.criticalWork).toBeNull()
    expect(phase1.operatorDurationMinutes).toBeCloseTo(480 / 1.65, 6)
    expect(phase1.triggersNextHalving).toBe(false)
  })

  it('該階段完全查無候選資料時，建議時長為 null', () => {
    const [phase2] = suggestStagePlans([2], new Map())

    expect(phase2.criticalWork).toBeNull()
    expect(phase2.operatorDurationMinutes).toBeNull()
    expect(phase2.triggersNextHalving).toBe(false)
  })

  it('起始階段是宣告式假設：選擇的起始階段本身視為未減半，之後階段依序視為已減半', () => {
    const candidatesByPhase = new Map<1 | 2 | 3, MasteryStageCandidates>([
      [2, { otherCandidate: { efficiencyPercent: 60 } }],
      [3, { otherCandidate: { efficiencyPercent: 60 } }],
    ])
    const [phase2, phase3] = suggestStagePlans([2, 3], candidatesByPhase)

    // 起始階段選專精二：專精二視為未減半，維持完整 RequiredWorkBase(2)
    expect(phase2.requiredWork).toBe(960)
    // 專精三視為專精二已觸發減半
    expect(phase3.requiredWork).toBe(720)
  })
})

describe('formatMinutesAsHm', () => {
  it('對照領域文件第 3 節三個階段的 RequiredWorkBase', () => {
    expect(formatMinutesAsHm(getRequiredWorkBase(1))).toBe('8 小時 0 分')
    expect(formatMinutesAsHm(getRequiredWorkBase(2))).toBe('16 小時 0 分')
    expect(formatMinutesAsHm(getRequiredWorkBase(3))).toBe('24 小時 0 分')
  })

  it('critical 幹員預設陪同時長（5hr 另加 5 分鐘操作緩衝）', () => {
    expect(formatMinutesAsHm(CRITICAL_DEFAULT_DURATION_MINUTES)).toBe('5 小時 5 分')
  })
})
