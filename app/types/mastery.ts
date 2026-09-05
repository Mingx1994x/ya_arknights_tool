import type { SkillPhase } from '#shared/types/support-operator'

export type CriticalCompanionPlan = {
  /** critical 幹員這段陪同時長換算後的工作量 */
  criticalWork: number
  /** 另一位陪練幹員需要的陪同時長；critical 幹員已補滿或超過所需工作量時為 `null`（畫面顯示「不需要」） */
  otherOperatorDurationHours: number | null
  /** critical 幹員陪同是否達到 5hr 門檻，觸發下一階段減半 */
  triggersNextHalving: boolean
  /** critical 幹員陪同時長上限：超過會讓 `criticalWork` 超過 `requiredWork`，UI 可用來限制輸入上限 */
  maxCriticalDurationHours: number
}

export type MasteryTopCandidate = {
  efficiencyPercent: number
}

export type MasteryStageCandidates = {
  /** 該階段效率最高的 critical 幹員（Logos／艾麗妮）；專精三不安排 critical 幹員，可省略 */
  criticalCandidate?: MasteryTopCandidate
  /** 專精一、二是效率最高的（非 critical）陪練幹員；專精三則是整體效率最高的候選幹員 */
  otherCandidate?: MasteryTopCandidate
}

export type MasteryStageAutoPlan = {
  phase: SkillPhase
  requiredWork: number
  /** critical 幹員這段陪同時長換算後的工作量；專精三不安排 critical 幹員，固定為 `null` */
  criticalWork: number | null
  /** 建議陪同時長：專精一、二是「另一位陪練幹員」需要的時長，專精三是唯一陪練幹員需要的時長；沒有候選幹員時為 `null` */
  otherOperatorDurationHours: number | null
  triggersNextHalving: boolean
}
