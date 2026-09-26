import type { SkillPhase } from '#shared/types/support-operator'

export type BaseCompanionPlan = {
  /** 陪練幹員需要的陪同時長（分鐘），直接反推、沒有 critical 幹員分攤 */
  operatorDurationMinutes: number
}

export type CriticalOnlyCompanionPlan = {
  /** critical 幹員單獨補滿所需工作量需要的陪同時長（分鐘） */
  operatorDurationMinutes: number
  /** 陪同時長是否達到 5hr 門檻，觸發下一階段減半 */
  triggersNextHalving: boolean
}

export type CriticalCompanionPlan = {
  /** critical 幹員這段陪同時長換算後的工作量 */
  criticalWork: number
  /** 另一位陪練幹員需要的陪同時長（分鐘）；critical 幹員已補滿或超過所需工作量時為 `null`（畫面顯示「不需要」） */
  otherOperatorDurationMinutes: number | null
  /** critical 幹員陪同是否達到 5hr 門檻，觸發下一階段減半 */
  triggersNextHalving: boolean
  /** critical 幹員陪同時長上限（分鐘）：超過會讓 `criticalWork` 超過 `requiredWork`，UI 可用來限制輸入上限 */
  maxCriticalDurationMinutes: number
}

export type NormalizedCriticalDurationInput = {
  /** 正規化後的總分鐘數：「時」鉗制在 ≥ 0，「分」鉗制在 0–59，兩者相加；非數字或負數視為 0 */
  minutes: number
  /** 使用者輸入的「時」／「分」字面值本身是否超出合理範圍（分不介於 0–59、時或分為負數／非數字） */
  isInvalid: boolean
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
  /** 建議陪同時長（分鐘）：專精一、二是「另一位陪練幹員」需要的時長（critical 幹員時長已由策略固定為 `CRITICAL_DEFAULT_DURATION_MINUTES`，不需另外回傳），專精三是唯一陪練幹員需要的時長；沒有候選幹員時為 `null` */
  operatorDurationMinutes: number | null
  triggersNextHalving: boolean
}
