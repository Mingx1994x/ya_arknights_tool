import type { SkillPhase } from '#shared/types/support-operator'
import type { CriticalCompanionPlan, MasteryStageAutoPlan, MasteryStageCandidates } from '~/types/mastery'

/** 基建提供的專精速度加成（見領域文件第 3 節） */
export const BUILD_SPEED_BONUS = 0.05

/** 陪同 Logos／艾麗妮累積滿此時數（小時）觸發下一階段減半（見領域文件第 4 節） */
export const HALVING_THRESHOLD_HOURS = 5

/** critical 幹員（Logos／艾麗妮）預設陪同時長：門檻 5hr 另加 5 分鐘操作緩衝 */
export const CRITICAL_DEFAULT_DURATION_HOURS = HALVING_THRESHOLD_HOURS + 5 / 60

const TBASE_HOURS: Record<SkillPhase, number> = { 1: 8, 2: 16, 3: 24 }

/**
 * 領域文件第 3 節：RequiredWorkBase(N) = Tbase(N) / 1.05
 */
export function getRequiredWorkBase(phase: SkillPhase): number {
  return TBASE_HOURS[phase] / (1 + BUILD_SPEED_BONUS)
}

/**
 * 領域文件第 4 節：跨階段減半規則。專精一沒有上一階段，恆不減半。
 *
 * @param previousPhaseTriggeredHalving - 上一階段是否陪同 Logos／艾麗妮累積滿 5 小時
 */
export function getRequiredWork(phase: SkillPhase, previousPhaseTriggeredHalving: boolean): number {
  const base = getRequiredWorkBase(phase)
  return phase > 1 && previousPhaseTriggeredHalving ? base / 2 : base
}

/**
 * 預設策略（領域文件第 4／9 節）：專精一、二各安排一位 critical 幹員陪滿 ≥5hr 觸發下一階段減半，
 * 因此在此策略下 `RequiredWork(2)`／`RequiredWork(3)` 必定套用減半，不需要外部傳入「上一階段是否觸發」。
 */
export function getRequiredWorkUnderDefaultStrategy(phase: SkillPhase): number {
  return getRequiredWork(phase, phase > 1)
}

/**
 * 領域文件第 5 節：單一 phase 依當下效率加成換算後的工作量。
 *
 * @param durationHours - 該 phase 實際經過的時間（小時，小數）
 * @param efficiencyPercent - 陪同幹員在這次陪同中的效率（百分比，例如 30 代表 +30%）；
 *   例如 critical 幹員（Logos／艾麗妮）陪同沒有命中加成條件的職業（如重裝）時可能是 0，
 *   陪滿 5hr 一樣觸發下一階段減半，因此命名不用「Bonus」暗示恆為正值
 */
export function calcPhaseWork(durationHours: number, efficiencyPercent: number): number {
  return durationHours * (1 + efficiencyPercent / 100)
}

/**
 * `calcPhaseWork` 的反函式：要產生 `targetWork` 的工作量，某效率加成的幹員需要陪同多久。
 */
export function calcDurationForWork(targetWork: number, efficiencyPercent: number): number {
  return targetWork / (1 + efficiencyPercent / 100)
}

/**
 * 預設策略（領域文件第 4／9 節）：本階段安排一位 critical 幹員（Logos／艾麗妮）陪同，
 * 陪滿至少 5hr 觸發下一階段減半，剩餘工作量交由另一位陪練幹員補滿。
 *
 * @param requiredWork - 本階段的 `RequiredWork(N)`
 * @param criticalDurationHours - critical 幹員實際陪同時長，下限 5hr，建議預設 `CRITICAL_DEFAULT_DURATION_HOURS`
 * @param criticalEfficiencyPercent - critical 幹員的效率加成
 * @param otherEfficiencyPercent - 另一位陪練幹員的效率加成
 */
export function planCriticalCompanionStage(
  requiredWork: number,
  criticalDurationHours: number,
  criticalEfficiencyPercent: number,
  otherEfficiencyPercent: number,
): CriticalCompanionPlan {
  const criticalWork = calcPhaseWork(criticalDurationHours, criticalEfficiencyPercent)
  const remainingWork = requiredWork - criticalWork

  return {
    criticalWork,
    otherOperatorDurationHours: remainingWork > 0 ? calcDurationForWork(remainingWork, otherEfficiencyPercent) : null,
    triggersNextHalving: criticalDurationHours >= HALVING_THRESHOLD_HOURS,
    maxCriticalDurationHours: calcDurationForWork(requiredWork, criticalEfficiencyPercent),
  }
}

// 舊版「整階段只用單一候選幹員」模型，已停用（先保留供之後參考，見開發紀錄）：
// 這個模型的問題是「效率最高的候選幹員」很少剛好是 critical 幹員（Logos／艾麗妮效率通常較低），
// 導致自動建議幾乎永遠不會建議陪 critical 幹員，也就永遠不會建議觸發下一階段減半——
// 但 critical 幹員不管效率高低，只要陪滿 5hr 就達成核心目的，不該用「效率排名」篩掉。
// 已改用 planCriticalCompanionStage 的「critical 幹員＋另一位陪練幹員」模型，見下方新版 suggestStagePlans。
//
// export type MasteryStageSuggestion = {
//   phase: SkillPhase
//   requiredWorkBase: number
//   requiredWork: number
//   /** 建議陪同時長（小時）；沒有候選幹員時為 `null` */
//   suggestedDurationHours: number | null
//   triggersNextHalving: boolean
// }
//
// export type MasteryTopCandidate = {
//   efficiencyPercent: number
//   isCritical: boolean
// }
//
// /**
//  * 依序計算多個階段的建議陪同時長：反推 `duration = RequiredWork / (1 + efficiencyPercent / 100)`，
//  * 並依序把「建議時長是否達到減半門檻」帶入下一階段的 `RequiredWork` 計算（領域文件第 4 節）。
//  *
//  * @param phases - 遞增排列的階段清單
//  * @param previousPhaseTriggeredHalving - `phases[0]` 的上一階段是否已觸發減半
//  * @param getTopCandidate - 取得指定階段目前效率最高的候選幹員；沒有候選時回傳 `undefined`
//  */
// export function suggestStagePlans(
//   phases: SkillPhase[],
//   previousPhaseTriggeredHalving: boolean,
//   getTopCandidate: (phase: SkillPhase) => MasteryTopCandidate | undefined,
// ): MasteryStageSuggestion[] {
//   const results: MasteryStageSuggestion[] = []
//   let previousTriggered = previousPhaseTriggeredHalving
//
//   for (const phase of phases) {
//     const requiredWorkBase = getRequiredWorkBase(phase)
//     const requiredWork = getRequiredWork(phase, previousTriggered)
//     const candidate = getTopCandidate(phase)
//     const suggestedDurationHours = candidate
//       ? requiredWork / (1 + candidate.efficiencyPercent / 100)
//       : null
//     const triggersNextHalving = Boolean(
//       candidate?.isCritical && suggestedDurationHours !== null && suggestedDurationHours >= HALVING_THRESHOLD_HOURS,
//     )
//
//     results.push({ phase, requiredWorkBase, requiredWork, suggestedDurationHours, triggersNextHalving })
//     previousTriggered = triggersNextHalving
//   }
//
//   return results
// }

/**
 * 依序計算多個階段的自動建議排程，採跟 `planCriticalCompanionStage` 相同的預設策略：
 * 專精一、二安排效率最高的 critical 幹員固定陪同 `CRITICAL_DEFAULT_DURATION_HOURS` 觸發下一階段減半，
 * 反推另一位效率最高的陪練幹員需要的陪同時長；專精三沒有下一階段可減半，不安排 critical 幹員，
 * 直接反推效率最高的單一候選幹員需要的陪同時長。
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
        otherOperatorDurationHours: otherCandidate
          ? calcDurationForWork(requiredWork, otherCandidate.efficiencyPercent)
          : null,
        triggersNextHalving: false,
      }
    }

    const plan = planCriticalCompanionStage(
      requiredWork,
      CRITICAL_DEFAULT_DURATION_HOURS,
      criticalCandidate.efficiencyPercent,
      otherCandidate?.efficiencyPercent ?? 0,
    )

    return {
      phase,
      requiredWork,
      criticalWork: plan.criticalWork,
      otherOperatorDurationHours: otherCandidate ? plan.otherOperatorDurationHours : null,
      triggersNextHalving: plan.triggersNextHalving,
    }
  })
}

/**
 * 小數小時 → `X 小時 Y 分` 顯示字串。內部運算一律使用小時的小數，僅顯示時才轉換（領域文件第 2 節備註）。
 */
export function formatHoursAsHm(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${wholeHours} 小時 ${minutes} 分`
}
