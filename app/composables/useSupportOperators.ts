import type { ArknightsClass, SupportOperator } from '#shared/types/support-operator'

/**
 * 依職業／技能編號向 GET /api/support-operators 取得候選輔訓幹員清單，
 * class/skill 變動時會自動重新查詢。
 */
export function useSupportOperators(
  selectedClass: Ref<ArknightsClass | undefined>,
  selectedSkill: Ref<1 | 2 | 3 | undefined>,
) {
  return useFetch<{ data: SupportOperator[] }>('/api/support-operators', {
    query: computed(() => ({
      class: selectedClass.value,
      skill: selectedSkill.value,
    })),
    default: () => [],
    transform: (response) => response.data,
  })
}
