<script setup lang="ts">
import type { ArknightsClass, SkillPhase, SupportOperator } from '#shared/types/support-operator'
import type { MasteryStageCandidates } from '~/types/mastery'
import { suggestStagePlans } from '~/utils/mastery'

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

/**
 * 各階段 `MasteryStageCard` 要用的顯示形式：專精三沒有下一階段可減半、不安排 critical 幹員，用 `base`；
 * 其餘階段目前固定用 `general`，`critical`（只顯示 critical 欄位）先保留給之後的情境使用，
 * 這裡先集中管理，之後有需要時只需調整這裡的判斷。
 */
const variantByPhase = computed(() => {
  const map = new Map<SkillPhase, 'general' | 'base' | 'critical'>()
  for (const group of groups.value) {
    map.set(group.phase, group.phase === 3 ? 'base' : 'general')
  }
  return map
})
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
      <div v-else class="flex flex-col gap-4">
        <MasteryStageCard
          v-for="group in groups"
          :key="group.phase"
          :title="STAGE_LABELS[group.phase]"
          :required-work-hours="suggestionByPhase.get(group.phase)!.requiredWork"
          :is-halved="group.phase > startStage"
          :variant="variantByPhase.get(group.phase)"
          :companion-code-name="displayByPhase.get(group.phase)?.otherCandidate?.codeName"
          :companion-efficiency-percent="displayByPhase.get(group.phase)?.otherCandidate?.realEfficiency"
          :companion-duration-hours="suggestionByPhase.get(group.phase)!.otherOperatorDurationHours ?? 0"
          :companion-category="displayByPhase.get(group.phase)?.otherCandidate?.category"
          :companion-memo="displayByPhase.get(group.phase)?.otherCandidate?.memo"
          :critical-code-name="displayByPhase.get(group.phase)?.criticalCandidate?.codeName"
          :critical-efficiency-percent="displayByPhase.get(group.phase)?.criticalCandidate?.realEfficiency"
          :critical-memo="displayByPhase.get(group.phase)?.criticalCandidate?.memo"
        />
      </div>
    </template>
  </div>
</template>
