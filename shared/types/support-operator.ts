export type ArknightsClass =
  | '先鋒'
  | '近衛'
  | '重裝'
  | '狙擊'
  | '術師'
  | '醫療'
  | '輔助'
  | '特種';

// export interface SupportOperator {
//   id: string;
//   name: string;
//   category: SupportOperatorCategory;
//   skillScope: 1 | 2 | 3 | null;
//   /** 效率加成百分比，例如 60 代表 +60% */
//   efficiencyBonus: number;
//   targetClasses: ArknightsClass[];
//   /** 是否為 Logos／艾麗妮，陪滿 5 小時可觸發下一階段減半（見領域文件第 4 節） */
//   triggersHalfWork: boolean;
//   /** 觸發減半所需的陪同分鐘數，僅 triggersHalfWork 為 true 時有值 */
//   requiredAccompanyMinutes?: number;
//   note?: string;
// }

export type SupportOperatorCategory =
  | 'critical'
  | 'specific'
  | 'general'
  | 'skill';

export type SkillPhase = 1 | 2 | 3;

/**
 * 輔訓幹員資料，對應 docs/domain/arknights_tools_init.md 第 8 節。
 * 來源：Google Sheet「方舟專精計時器」附件:訓練幹員 分頁。
 */
export type SupportOperatorRecord = {
  id: string;
  codeName: string;
  category: SupportOperatorCategory;
  targetProfession: ArknightsClass[];
  /** 此幹員資料適用的專精階段；0 代表不限階段 */
  targetPhase: 0 | SkillPhase;
  /** 效率加成百分比，例如 60 代表 +60% */
  baseEfficiency: number;
  conditionEfficiency: number;
  memo?: string;
};

/**
 * GET /api/support-operators 篩選後回傳的候選幹員，多附上計算後的實際加成效率。
 * realEfficiency = baseEfficiency + conditionEfficiency；
 * critical 類別（Logos／艾麗妮）的 5hr 生效條件尚未套用，目前視為恆生效，
 * 見 docs/domain/arknights_tools_init.md 第 9 節。
 */
export type SupportOperator = SupportOperatorRecord & {
  realEfficiency: number;
};
