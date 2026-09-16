import type { SkillPhase } from '#shared/types/support-operator'
import type {
  BaseCompanionPlan,
  CriticalCompanionPlan,
  CriticalOnlyCompanionPlan,
  MasteryStageAutoPlan,
  MasteryStageCandidates,
} from '~/types/mastery'

/** 基建提供的專精速度加成（見領域文件第 3 節） */
export const BUILD_SPEED_BONUS = 0.05

/** 陪同 Logos／艾麗妮累積滿此分鐘數觸發下一階段減半（5 小時，見領域文件第 4 節） */
export const HALVING_THRESHOLD_MINUTES = 5 * 60

/** critical 幹員（Logos／艾麗妮）預設陪同時長：門檻 5 小時另加 5 分鐘操作緩衝 */
export const CRITICAL_DEFAULT_DURATION_MINUTES = HALVING_THRESHOLD_MINUTES + 5

const TBASE_MINUTES: Record<SkillPhase, number> = { 1: 8 * 60, 2: 16 * 60, 3: 24 * 60 }

/**
 * 領域文件第 3 節：RequiredWorkBase(N) = Tbase(N)（不套用任何加成，
 * 5% 基地加成已併入 `calcPhaseWork`／`calcDurationForWork` 的加成係數，見第 5 節）
 */
export function getRequiredWorkBase(phase: SkillPhase): number {
  return TBASE_MINUTES[phase]
}

/**
 * 領域文件第 4 節：跨階段減半規則。專精一沒有上一階段，恆不減半。
 *
 * @param isHalved - 該階段本身是否已套用跨階段減半（通常代表上一階段陪同 Logos／艾麗妮
 *   累積滿 5 小時）；是否減半由呼叫端決定，見 `AutoPlanTab`／`ManualPlanTab` 各自的判斷方式
 */
export function getRequiredWork(phase: SkillPhase, isHalved: boolean): number {
  const base = getRequiredWorkBase(phase)
  return phase > 1 && isHalved ? base / 2 : base
}

/**
 * 領域文件第 5 節：單一 phase 依當下效率加成換算後的工作量。
 * 5% 基地加成（`BUILD_SPEED_BONUS`）跟陪同幹員的效率加成是相加關係，
 * 不是分開的兩層乘法（2026-09-06 修正，見領域文件第 3、5、7 節）。
 *
 * @param durationMinutes - 該 phase 實際經過的時間（分鐘）；內部計算一律用分鐘，
 *   避免「小時的小數」（例如 5 小時 5 分寫成 `5 + 5/60` 小時）造成的浮點數誤差（2026-09-16 修正，見領域文件第 2 節）
 * @param efficiencyPercent - 陪同幹員在這次陪同中的效率（百分比，例如 30 代表 +30%）；
 *   例如 critical 幹員（Logos／艾麗妮）陪同沒有命中加成條件的職業（如重裝）時可能是 0，
 *   陪滿 5hr 一樣觸發下一階段減半，因此命名不用「Bonus」暗示恆為正值
 */
export function calcPhaseWork(durationMinutes: number, efficiencyPercent: number): number {
  return durationMinutes * (1 + BUILD_SPEED_BONUS + efficiencyPercent / 100)
}

/**
 * `calcPhaseWork` 的反函式：要產生 `targetWork` 的工作量，某效率加成的幹員需要陪同多久（分鐘）。
 */
export function calcDurationForWork(targetWork: number, efficiencyPercent: number): number {
  return targetWork / (1 + BUILD_SPEED_BONUS + efficiencyPercent / 100)
}

/**
 * `base` 階段：只有一位陪練幹員，沒有 critical 幹員分攤，直接反推所需陪同時長。
 * 專精三（UI 的 `final` variant）計算邏輯與此相同，差別純粹是 UI 結構鎖定，不需要獨立函式。
 *
 * @param requiredWork - 本階段的 `RequiredWork(N)`
 * @param otherEfficiencyPercent - 陪練幹員的效率加成
 */
export function baseCompanionStage(requiredWork: number, otherEfficiencyPercent: number): BaseCompanionPlan {
  return { operatorDurationMinutes: calcDurationForWork(requiredWork, otherEfficiencyPercent) }
}

/**
 * `critical` 階段：陪練幹員被移除，critical 幹員（Logos／艾麗妮）獨自補滿所需工作量，直接反推。
 *
 * @param requiredWork - 本階段的 `RequiredWork(N)`
 * @param criticalEfficiencyPercent - critical 幹員的效率加成
 */
export function criticalCompanionStage(
  requiredWork: number,
  criticalEfficiencyPercent: number,
): CriticalOnlyCompanionPlan {
  const operatorDurationMinutes = calcDurationForWork(requiredWork, criticalEfficiencyPercent)
  return {
    operatorDurationMinutes,
    triggersNextHalving: operatorDurationMinutes >= HALVING_THRESHOLD_MINUTES,
  }
}

/**
 * `general` 階段（預設策略，領域文件第 4／9 節）：本階段安排一位 critical 幹員（Logos／艾麗妮）陪同，
 * 陪滿至少 5hr 觸發下一階段減半，剩餘工作量交由另一位陪練幹員補滿。
 *
 * @param requiredWork - 本階段的 `RequiredWork(N)`
 * @param criticalDurationMinutes - critical 幹員實際陪同時長（分鐘），下限 5 小時，建議預設 `CRITICAL_DEFAULT_DURATION_MINUTES`
 * @param criticalEfficiencyPercent - critical 幹員的效率加成
 * @param otherEfficiencyPercent - 另一位陪練幹員的效率加成
 */
export function generalCompanionStage(
  requiredWork: number,
  criticalDurationMinutes: number,
  criticalEfficiencyPercent: number,
  otherEfficiencyPercent: number,
): CriticalCompanionPlan {
  const criticalWork = calcPhaseWork(criticalDurationMinutes, criticalEfficiencyPercent)
  const remainingWork = requiredWork - criticalWork

  return {
    criticalWork,
    otherOperatorDurationMinutes: remainingWork > 0 ? calcDurationForWork(remainingWork, otherEfficiencyPercent) : null,
    triggersNextHalving: criticalDurationMinutes >= HALVING_THRESHOLD_MINUTES,
    maxCriticalDurationMinutes: calcDurationForWork(requiredWork, criticalEfficiencyPercent),
  }
}

/**
 * 依序計算多個階段的自動建議排程，採跟 `generalCompanionStage` 相同的預設策略：
 * 專精一、二安排效率最高的 critical 幹員固定陪同 `CRITICAL_DEFAULT_DURATION_MINUTES` 觸發下一階段減半，
 * 反推另一位效率最高的陪練幹員需要的陪同時長（`generalCompanionStage`）；專精三沒有下一階段可減半，
 * 不安排 critical 幹員，直接反推效率最高的單一候選幹員需要的陪同時長（`baseCompanionStage`）。
 *
 * `phases[0]`（使用者選擇的起始階段）永遠視為未減半——這是宣告式的假設，不是從實際資料推測：
 * 選定起始階段就代表「從這裡開始全新規劃」，之後的階段依序視為都套用了本策略而觸發減半。
 * 例如 `phases = [2, 3]`（起始階段選專精二）：專精二視為未減半，反推的建議陪同時長會是完整的
 * `RequiredWorkBase(2)`；專精三則視為專精二已觸發減半，套用減半後的所需工作量。
 *
 * @param phases - 遞增排列的階段清單，`phases[0]` 即使用者選擇的起始階段
 * @param candidatesByPhase - 各階段目前效率最高的候選幹員（critical／其他），查無資料的階段可省略
 */
export function suggestStagePlans(
  phases: SkillPhase[],
  candidatesByPhase: Map<SkillPhase, MasteryStageCandidates>,
): MasteryStageAutoPlan[] {
  // tsconfig 開了 noUncheckedIndexedAccess，phases[0] 的型別是 SkillPhase | undefined
  // （型別上 phases 允許空陣列）；退回 1 純粹是為了讓型別檢查通過，phases 真的是空陣列時
  // 下面 phases.map(...) 會直接回傳 []，不會用到這個預設值。
  const startPhase = phases[0] ?? 1

  return phases.map((phase) => {
    const requiredWork = getRequiredWork(phase, phase > startPhase)
    const { criticalCandidate, otherCandidate } = candidatesByPhase.get(phase) ?? {}

    if (phase === 3 || !criticalCandidate) {
      return {
        phase,
        requiredWork,
        criticalWork: null,
        operatorDurationMinutes: otherCandidate
          ? baseCompanionStage(requiredWork, otherCandidate.efficiencyPercent).operatorDurationMinutes
          : null,
        triggersNextHalving: false,
      }
    }

    const plan = generalCompanionStage(
      requiredWork,
      CRITICAL_DEFAULT_DURATION_MINUTES,
      criticalCandidate.efficiencyPercent,
      otherCandidate?.efficiencyPercent ?? 0,
    )

    return {
      phase,
      requiredWork,
      criticalWork: plan.criticalWork,
      operatorDurationMinutes: otherCandidate ? plan.otherOperatorDurationMinutes : null,
      triggersNextHalving: plan.triggersNextHalving,
    }
  })
}

/**
 * 分鐘（含小數）→ `X 小時 Y 分` 顯示字串。內部運算一律使用分鐘，僅顯示時才轉換（領域文件第 2 節備註）。
 */
export function formatMinutesAsHm(totalMinutesRaw: number): string {
  const totalMinutes = Math.round(totalMinutesRaw)
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${wholeHours} 小時 ${minutes} 分`
}
