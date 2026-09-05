import type {
  ArknightsClass,
  SkillPhase,
  SupportOperatorPhaseGroup,
  SupportOperatorRecord,
} from '#shared/types/support-operator';

const ALL_PHASES: SkillPhase[] = [1, 2, 3];

/**
 * 依職業／起始技能階段，回傳「fromPhase → 專精三」各階段的候選幹員分組，
 * 每組皆依 realEfficiency（baseEfficiency + conditionEfficiency）由高到低排序。
 *
 * - 未帶 targetClass：不做職業篩選。
 * - category === 'skill' 的幹員只在 targetPhase 命中該組的 phase 時才列入；
 *   其餘三類（critical/specific/general）不限階段，每一組都會出現。
 * - critical 類別的 5hr 生效條件尚未套用，見 docs/domain/arknights_tools_init.md 第 9 節。
 */
export function resolveCandidatesByPhase(
  operators: SupportOperatorRecord[],
  targetClass: ArknightsClass | undefined,
  fromPhase: SkillPhase,
): SupportOperatorPhaseGroup[] {
  return ALL_PHASES.filter((phase) => phase >= fromPhase).map((phase) => {
    const candidates = operators
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
      }))
      .sort((a, b) => b.realEfficiency - a.realEfficiency);

    return { phase, candidates };
  });
}
