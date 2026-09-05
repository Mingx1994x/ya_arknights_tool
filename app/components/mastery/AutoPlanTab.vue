<script setup lang="ts">
import type { ArknightsClass, SkillPhase } from '#shared/types/support-operator'

const props = defineProps<{
  selectedProfession?: ArknightsClass
}>()

const startStage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

const { data: groups, pending, error } = useSupportOperators(professionRef, startStage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/**
 * 依序反推各階段建議陪同時長（見 app/utils/mastery.ts）。
 * 若 startStage > 1（跳階模擬），上一階段是否已觸發減半目前無法得知，保守視為未觸發，見
 * docs/domain/arknights_tools_init.md 第 9 節「尚未收斂的部分」。
 */
const suggestions = computed(() => {
  const phases = groups.value.map((group) => group.phase)
  const candidatesByPhase = new Map(groups.value.map((group) => [group.phase, group.candidates[0]]))

  return suggestStagePlans(phases, false, (phase) => {
    const candidate = candidatesByPhase.get(phase)
    return candidate
      ? { efficiencyBonusPercent: candidate.realEfficiency, isCritical: candidate.category === 'critical' }
      : undefined
  })
})

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
          <p v-if="group.candidates[0]">
            建議候選幹員：{{ group.candidates[0].codeName
            }}（+{{ group.candidates[0].realEfficiency }}%）
          </p>
          <p v-else class="text-gray-500">目前沒有符合條件的候選幹員。</p>
          <template v-if="suggestionByPhase.get(group.phase)?.suggestedDurationHours != null">
            <p class="text-gray-500 text-sm">
              所需工作量：{{ formatHoursAsHm(suggestionByPhase.get(group.phase)!.requiredWork) }}
              <span v-if="suggestionByPhase.get(group.phase)!.requiredWork < suggestionByPhase.get(group.phase)!.requiredWorkBase">（已套用跨階段減半）</span>
            </p>
            <p class="font-medium">
              建議陪同時間：{{ formatHoursAsHm(suggestionByPhase.get(group.phase)!.suggestedDurationHours!) }}
            </p>
            <p v-if="suggestionByPhase.get(group.phase)!.triggersNextHalving" class="text-green-600 text-sm">
              陪滿 5 小時，下一階段所需工作量將減半
            </p>
          </template>
        </section>
      </div>
    </template>
  </div>
</template>
