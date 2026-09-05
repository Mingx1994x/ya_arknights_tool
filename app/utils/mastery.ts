import type { SkillPhase } from '#shared/types/support-operator'

/** 基建提供的專精速度加成（見領域文件第 3 節） */
export const BUILD_SPEED_BONUS = 0.05

/** 陪同 Logos／艾麗妮累積滿此時數（小時）觸發下一階段減半（見領域文件第 4 節） */
export const HALVING_THRESHOLD_HOURS = 5

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
 * 領域文件第 5 節：單一 phase 依當下效率加成換算後的工作量。
 *
 * @param durationHours - 該 phase 實際經過的時間（小時，小數）
 * @param efficiencyBonusPercent - 陪同幹員提供的效率加成（百分比，例如 30 代表 +30%）
 */
export function calcPhaseWork(durationHours: number, efficiencyBonusPercent: number): number {
  return durationHours * (1 + efficiencyBonusPercent / 100)
}

export type MasteryPhaseSegment = {
  durationHours: number
  efficiencyBonusPercent: number
  /** 是否為 Logos／艾麗妮（`category === 'critical'`），用於判斷跨階段減半 */
  isCritical: boolean
}

/**
 * 領域文件第 5 節：CompletedWork(N) = Σ phase.work
 */
export function calcCompletedWork(segments: MasteryPhaseSegment[]): number {
  return segments.reduce((sum, segment) => sum + calcPhaseWork(segment.durationHours, segment.efficiencyBonusPercent), 0)
}

/**
 * 領域文件第 4／9 節：該階段陪同 Logos／艾麗妮的累積時數（小時），用於判斷是否觸發下一階段減半。
 */
export function calcCriticalHours(segments: MasteryPhaseSegment[]): number {
  return segments
    .filter((segment) => segment.isCritical)
    .reduce((sum, segment) => sum + segment.durationHours, 0)
}

export type MasteryStageResult = {
  phase: SkillPhase
  requiredWorkBase: number
  requiredWork: number
  completedWork: number
  isComplete: boolean
  criticalHours: number
  /** 此階段是否已觸發下一階段減半（領域文件第 4 節） */
  triggersNextHalving: boolean
}

/**
 * 依序計算多個階段（由某個起始階段到專精三）的實際完成度，前一階段的
 * `triggersNextHalving` 會自動帶入下一階段的 `RequiredWork` 計算（領域文件第 4 節）。
 *
 * @param phases - 遞增排列的階段清單，例如 `[1, 2, 3]` 或跳階模擬時的 `[2, 3]`
 * @param previousPhaseTriggeredHalving - `phases[0]` 的上一階段是否已觸發減半（`phases[0] === 1` 時必為 `false`）
 * @param getStageSegments - 取得指定階段目前已輸入的陪同紀錄
 */
export function evaluateStages(
  phases: SkillPhase[],
  previousPhaseTriggeredHalving: boolean,
  getStageSegments: (phase: SkillPhase) => MasteryPhaseSegment[],
): MasteryStageResult[] {
  const results: MasteryStageResult[] = []
  let previousTriggered = previousPhaseTriggeredHalving

  for (const phase of phases) {
    const requiredWorkBase = getRequiredWorkBase(phase)
    const requiredWork = getRequiredWork(phase, previousTriggered)
    const segments = getStageSegments(phase)
    const completedWork = calcCompletedWork(segments)
    const criticalHours = calcCriticalHours(segments)
    const triggersNextHalving = criticalHours >= HALVING_THRESHOLD_HOURS

    results.push({
      phase,
      requiredWorkBase,
      requiredWork,
      completedWork,
      isComplete: completedWork >= requiredWork,
      criticalHours,
      triggersNextHalving,
    })

    previousTriggered = triggersNextHalving
  }

  return results
}

export type MasteryStageSuggestion = {
  phase: SkillPhase
  requiredWorkBase: number
  requiredWork: number
  /** 建議陪同時長（小時）；沒有候選幹員時為 `null` */
  suggestedDurationHours: number | null
  triggersNextHalving: boolean
}

export type MasteryTopCandidate = {
  efficiencyBonusPercent: number
  isCritical: boolean
}

/**
 * 依序計算多個階段的建議陪同時長：反推 `duration = RequiredWork / (1 + efficiencyBonus / 100)`，
 * 並依序把「建議時長是否達到減半門檻」帶入下一階段的 `RequiredWork` 計算（領域文件第 4 節）。
 *
 * @param phases - 遞增排列的階段清單
 * @param previousPhaseTriggeredHalving - `phases[0]` 的上一階段是否已觸發減半
 * @param getTopCandidate - 取得指定階段目前效率最高的候選幹員；沒有候選時回傳 `undefined`
 */
export function suggestStagePlans(
  phases: SkillPhase[],
  previousPhaseTriggeredHalving: boolean,
  getTopCandidate: (phase: SkillPhase) => MasteryTopCandidate | undefined,
): MasteryStageSuggestion[] {
  const results: MasteryStageSuggestion[] = []
  let previousTriggered = previousPhaseTriggeredHalving

  for (const phase of phases) {
    const requiredWorkBase = getRequiredWorkBase(phase)
    const requiredWork = getRequiredWork(phase, previousTriggered)
    const candidate = getTopCandidate(phase)
    const suggestedDurationHours = candidate
      ? requiredWork / (1 + candidate.efficiencyBonusPercent / 100)
      : null
    const triggersNextHalving = Boolean(
      candidate?.isCritical && suggestedDurationHours !== null && suggestedDurationHours >= HALVING_THRESHOLD_HOURS,
    )

    results.push({ phase, requiredWorkBase, requiredWork, suggestedDurationHours, triggersNextHalving })
    previousTriggered = triggersNextHalving
  }

  return results
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
