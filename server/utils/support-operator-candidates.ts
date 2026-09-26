import type {
  OperatorProfession,
  SkillPhase,
  SupportOperator,
  SupportOperatorPhaseGroup,
  SupportOperatorRecord,
} from '#shared/types/support-operator';

const ALL_PHASES: SkillPhase[] = [1, 2, 3];

/**
 * 幹員的 targetProfession 是否命中指定職業；未指定職業（targetClass 為 undefined）視為不命中。
 * 這是判斷「職業是否符合」的共通條件，供職業篩選與 conditionEfficiency 是否計入共用。
 */
export function matchesTargetProfession(
  operator: SupportOperatorRecord,
  targetClass: OperatorProfession | undefined,
): boolean {
  return Boolean(targetClass && operator.targetProfession.includes(targetClass));
}

/**
 * 計算「職業命中才計入 conditionEfficiency」的 realEfficiency：未命中則只有
 * baseEfficiency。critical／specific／general／skill 四類皆適用這個規則（見下方各自的說明）。
 */
function resolveConditionalEfficiency(
  operator: SupportOperatorRecord,
  targetClass: OperatorProfession | undefined,
): number {
  return operator.baseEfficiency + (matchesTargetProfession(operator, targetClass) ? operator.conditionEfficiency : 0);
}

/**
 * 篩出 critical 類別（Logos／艾麗妮）的候選幹員，依 realEfficiency 由高到低排序。
 *
 * critical 幹員不受職業篩選限制——無論選擇的職業是否命中 `targetProfession`，
 * 陪滿 5hr 一樣觸發下一階段減半（見 docs/domain/arknights_tools_init.md 第 4／9 節），
 * 因此永遠列入候選名單；`conditionEfficiency` 只在職業命中 `targetProfession` 時才計入，
 * 未命中則 `realEfficiency` 退回只有 `baseEfficiency`。
 */
export function resolveCriticalCandidates(
  operators: SupportOperatorRecord[],
  targetClass: OperatorProfession | undefined,
): SupportOperator[] {
  return operators
    .filter((operator) => operator.category === 'critical')
    .map((operator) => ({
      ...operator,
      realEfficiency: resolveConditionalEfficiency(operator, targetClass),
    }))
    .sort((a, b) => b.realEfficiency - a.realEfficiency);
}

/**
 * 依職業／起始技能階段，回傳「fromPhase → 專精三」各階段的候選幹員分組，
 * 每組皆依 realEfficiency 由高到低排序。
 *
 * - critical 類別由 `resolveCriticalCandidates` 處理，不受職業篩選限制，每組都會出現。
 * - `specific` 類別（例如烏爾比安）同樣不受職業篩選限制，一律列入候選；但跟 critical
 *   一樣用 `resolveConditionalEfficiency` 計算 realEfficiency——`baseEfficiency` 恆生效，
 *   `conditionEfficiency` 只在職業命中 `targetProfession` 時才計入（例如烏爾比安基礎
 *   50%，命中近衛／輔助才加到 80%，備注「宿舍要帶 3+1 睡覺幹員」是達成條件的情境描述，
 *   目前不由程式判斷，恆視為已達成）。`general`／`skill` 兩類仍依 targetClass 篩選
 *   （未帶 targetClass 時不篩，此時所有 general／skill 都列入候選），realEfficiency
 *   同樣改用 `resolveConditionalEfficiency`：未帶 targetClass 時退回只剩 baseEfficiency，
 *   跟 critical／specific 一致（前端實際使用流程一定先選職業才會觸發查詢，這裡純粹是
 *   後端在沒有職業參數時的防呆邏輯要跟其他類別對齊，不因為候選名單有篩選就假設一定命中）。
 * - 所有類別的「階段資格」統一用 `targetPhase` 通用判斷：`targetPhase === 0` 代表不限
 *   階段，任一組都會出現；為 1/2/3 時只在對應 phase 的那組出現。目前只有 `skill` 類別
 *   的資料有非 0 的 targetPhase，但邏輯不再寫死綁定 `category === 'skill'`。
 * - 每組另外附上 `criticalCandidates`（`candidates` 篩出 critical 類別的子集，
 *   同樣依 realEfficiency 排序），方便呼叫端直接取用不用重新篩選。
 */
export function resolveCandidatesByPhase(
  operators: SupportOperatorRecord[],
  targetClass: OperatorProfession | undefined,
  fromPhase: SkillPhase,
): SupportOperatorPhaseGroup[] {
  const criticalCandidates = resolveCriticalCandidates(operators, targetClass);

  return ALL_PHASES.filter((phase) => phase >= fromPhase).map((phase) => {
    const otherCandidates = operators
      .filter((operator) => operator.category !== 'critical')
      .filter((operator) => {
        if (
          operator.category !== 'specific' &&
          targetClass &&
          !matchesTargetProfession(operator, targetClass)
        ) {
          return false;
        }
        if (operator.targetPhase !== 0 && operator.targetPhase !== phase) {
          return false;
        }
        return true;
      })
      .map((operator) => ({
        ...operator,
        realEfficiency: resolveConditionalEfficiency(operator, targetClass),
      }));

    const candidates = [...criticalCandidates, ...otherCandidates].sort(
      (a, b) => b.realEfficiency - a.realEfficiency,
    );

    return { phase, candidates, criticalCandidates };
  });
}
