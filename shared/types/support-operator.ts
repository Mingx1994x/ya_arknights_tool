export type ArknightsClass =
  | '先鋒'
  | '近衛'
  | '重裝'
  | '狙擊'
  | '術師'
  | '醫療'
  | '輔助'
  | '特種'

export type SupportOperatorCategory =
  | 'main'
  | 'main_pro'
  | 'general'
  | 'general_pro'
  | 'skill_specific'

/**
 * 輔訓幹員資料，對應 docs/domain/arknights_tools_init.md 第 8 節。
 * 來源：Google Sheet「方舟專精計時器」附件:訓練幹員 分頁。
 */
export interface SupportOperator {
  id: string
  name: string
  category: SupportOperatorCategory
  /** 對應「幾技能」，null 代表不限技能編號（main/general 類） */
  skillScope: 1 | 2 | 3 | null
  /** 效率加成百分比，例如 60 代表 +60% */
  efficiencyBonus: number
  targetClasses: ArknightsClass[]
  /** 是否為 Logos／艾麗妮，陪滿 5 小時可觸發下一階段減半（見領域文件第 4 節） */
  triggersHalfWork: boolean
  /** 觸發減半所需的陪同分鐘數，僅 triggersHalfWork 為 true 時有值 */
  requiredAccompanyMinutes?: number
  note?: string
}
