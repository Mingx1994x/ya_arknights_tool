import type {
  ArknightsClass,
  SupportOperatorPhaseGroup,
  SkillPhase,
} from '#shared/types/support-operator';

/**
 * 依職業／起始技能階段向 GET /api/support-operators 取得「起始階段→專精三」
 * 分組後的候選輔訓幹員清單，class/skill 變動時會自動重新查詢。
 */
export function useSupportOperators(
  selectedProfession: Ref<ArknightsClass | undefined>,
  selectedSkillPhase: Ref<SkillPhase | undefined>,
) {
  return useFetch('/api/support-operators', {
    query: computed(() => ({
      class: selectedProfession.value,
      fromSkill: selectedSkillPhase.value,
    })),
    default: () => [],
    transform: (response: { data: SupportOperatorPhaseGroup[] }) => response.data,
  });
}
