import type {
  ArknightsClass,
  SkillPhase,
  SupportOperator,
  SupportOperatorPhaseGroup,
  SupportOperatorRecord,
} from '#shared/types/support-operator';

const ALL_PHASES: SkillPhase[] = [1, 2, 3];

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
  targetClass: ArknightsClass | undefined,
): SupportOperator[] {
  return operators
    .filter((operator) => operator.category === 'critical')
    .map((operator) => {
      const matchesProfession = Boolean(targetClass && operator.targetProfession.includes(targetClass));
      return {
        ...operator,
        realEfficiency: operator.baseEfficiency + (matchesProfession ? operator.conditionEfficiency : 0),
      };
    })
    .sort((a, b) => b.realEfficiency - a.realEfficiency);
}

/**
 * 依職業／起始技能階段，回傳「fromPhase → 專精三」各階段的候選幹員分組，
 * 每組皆依 realEfficiency 由高到低排序。
 *
 * - critical 類別由 `resolveCriticalCandidates` 處理，不受職業篩選限制，每組都會出現。
 * - 其餘三類（specific/general/skill）未帶 targetClass 時不做職業篩選；
 *   `category === 'skill'` 的幹員只在 targetPhase 命中該組的 phase 時才列入，
 *   specific／general 不限階段，每一組都會出現。
 */
export function resolveCandidatesByPhase(
  operators: SupportOperatorRecord[],
  targetClass: ArknightsClass | undefined,
  fromPhase: SkillPhase,
): SupportOperatorPhaseGroup[] {
  const criticalCandidates = resolveCriticalCandidates(operators, targetClass);

  return ALL_PHASES.filter((phase) => phase >= fromPhase).map((phase) => {
    const otherCandidates = operators
      .filter((operator) => operator.category !== 'critical')
      .filter((operator) => {
        if (targetClass && !operator.targetProfession.includes(targetClass)) {
          return false;
        }
        if (operator.category === 'skill' && operator.targetPhase !== phase) {
          return false;
        }
        return true;
      })
      .map((operator) => ({
        ...operator,
        realEfficiency: operator.baseEfficiency + operator.conditionEfficiency,
      }));

    const candidates = [...criticalCandidates, ...otherCandidates].sort(
      (a, b) => b.realEfficiency - a.realEfficiency,
    );

    return { phase, candidates };
  });
}
