<script setup lang="ts">
import type { ArknightsClass, SkillPhase, SupportOperator } from '#shared/types/support-operator'
import type { MasteryStageCandidates } from '~/types/mastery'
import { CRITICAL_DEFAULT_DURATION_HOURS, suggestStagePlans } from '~/utils/mastery'

const props = defineProps<{
  selectedProfession?: ArknightsClass
}>()

const startStage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

const { data: groups, pending, error } = useSupportOperators(professionRef, startStage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

type StageDisplayCandidates = {
  criticalCandidate?: SupportOperator
  otherCandidate?: SupportOperator
}

/**
 * 各階段用來顯示的候選幹員：專精一、二各取「critical 類別效率最高」與「非 critical 類別效率最高」；
 * 專精三沒有下一階段可減半，不安排 critical 幹員，`otherCandidate` 直接取整體效率最高的候選幹員。
 */
const displayByPhase = computed(() => {
  const map = new Map<SkillPhase, StageDisplayCandidates>()
  for (const group of groups.value) {
    map.set(group.phase, {
      criticalCandidate: group.candidates.find((c) => c.category === 'critical'),
      otherCandidate:
        group.phase === 3 ? group.candidates[0] : group.candidates.find((c) => c.category !== 'critical'),
    })
  }
  return map
})

const candidatesByPhase = computed(() => {
  const map = new Map<SkillPhase, MasteryStageCandidates>()
  for (const [phase, { criticalCandidate, otherCandidate }] of displayByPhase.value) {
    map.set(phase, {
      criticalCandidate: criticalCandidate ? { efficiencyPercent: criticalCandidate.realEfficiency } : undefined,
      otherCandidate: otherCandidate ? { efficiencyPercent: otherCandidate.realEfficiency } : undefined,
    })
  }
  return map
})

const suggestions = computed(() =>
  suggestStagePlans(groups.value.map((g) => g.phase), candidatesByPhase.value),
)
const suggestionByPhase = computed(() => new Map(suggestions.value.map((s) => [s.phase, s])))
</script>

<template>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm max-w-40">
      <span class="font-semibold">起始階段</span>
      <select
        v-model.number="startStage"
        class="px-2.5 py-1.5 border border-gray-300 rounded"
      >
        <option :value="1">專精一</option>
        <option :value="2">專精二</option>
        <option :value="3">專精三</option>
      </select>
    </label>

    <p v-if="!props.selectedProfession" class="text-gray-500">
      請先選擇幹員職業以取得建議。
    </p>
    <template v-else>
      <p v-if="pending" class="text-gray-500">候選幹員查詢中…</p>
      <p v-else-if="error" class="text-red-600">
        候選幹員查詢失敗，請稍後再試。
      </p>
      <div
        v-else
        class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]"
      >
        <section
          v-for="group in groups"
          :key="group.phase"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <h3 class="text-lg font-semibold mb-2">{{ STAGE_LABELS[group.phase] }}</h3>
          <p class="text-gray-500 text-sm">
            所需工作量：{{ formatHoursAsHm(suggestionByPhase.get(group.phase)!.requiredWork) }}
          </p>

          <template v-if="group.phase !== 3">
            <p v-if="displayByPhase.get(group.phase)?.criticalCandidate" class="text-sm">
              Critical 幹員：{{ displayByPhase.get(group.phase)!.criticalCandidate!.codeName
              }}（+{{ displayByPhase.get(group.phase)!.criticalCandidate!.realEfficiency }}%），
              陪同 {{ formatHoursAsHm(CRITICAL_DEFAULT_DURATION_HOURS) }}
            </p>
            <p v-else class="text-gray-500">目前沒有符合條件的 critical 候選幹員。</p>

            <template v-if="displayByPhase.get(group.phase)?.criticalCandidate">
              <p v-if="suggestionByPhase.get(group.phase)!.triggersNextHalving" class="text-green-600 text-sm">
                陪滿 5 小時，下一階段所需工作量將減半
              </p>
              <p v-if="displayByPhase.get(group.phase)?.otherCandidate">
                另一位陪練幹員：{{ displayByPhase.get(group.phase)!.otherCandidate!.codeName
                }}（+{{ displayByPhase.get(group.phase)!.otherCandidate!.realEfficiency }}%）
              </p>
              <p v-else class="text-gray-500">目前沒有符合條件的陪練幹員。</p>
              <p v-if="displayByPhase.get(group.phase)?.otherCandidate" class="font-medium">
                建議陪同時間：{{
                  suggestionByPhase.get(group.phase)!.otherOperatorDurationHours != null
                    ? formatHoursAsHm(suggestionByPhase.get(group.phase)!.otherOperatorDurationHours!)
                    : '不需要'
                }}
              </p>
            </template>
          </template>

          <template v-else>
            <p v-if="displayByPhase.get(group.phase)?.otherCandidate">
              建議候選幹員：{{ displayByPhase.get(group.phase)!.otherCandidate!.codeName
              }}（+{{ displayByPhase.get(group.phase)!.otherCandidate!.realEfficiency }}%）
            </p>
            <p v-else class="text-gray-500">目前沒有符合條件的候選幹員。</p>
            <p v-if="suggestionByPhase.get(group.phase)?.otherOperatorDurationHours != null" class="font-medium">
              建議陪同時間：{{ formatHoursAsHm(suggestionByPhase.get(group.phase)!.otherOperatorDurationHours!) }}
            </p>
          </template>
        </section>
      </div>
    </template>
  </div>
</template>
