import type {
  ArknightsClass,
  SupportOperatorRecord,
  SkillPhase,
} from '#shared/types/support-operator';

/**
 * 依職業／技能編號向 GET /api/support-operators 取得候選輔訓幹員清單，
 * class/skill 變動時會自動重新查詢。
 */
export function useSupportOperators(
  selectedProfession: Ref<ArknightsClass | undefined>,
  selectedSkillPhase: Ref<SkillPhase | undefined>,
) {
  return useFetch('/api/support-operators', {
    query: computed(() => ({
      class: selectedProfession.value,
      skill: selectedSkillPhase.value,
    })),
    default: () => [],
    transform: (response: { data: SupportOperatorRecord[] }) => response.data,
  });
}
