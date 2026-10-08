<script setup lang="ts">
import type { OperatorProfession, SkillPhase, SupportOperator } from '#shared/types/support-operator'
import type { MasteryStageCandidates } from '~/types/mastery'
import { CRITICAL_DEFAULT_DURATION_MINUTES, suggestStagePlans } from '~/utils/mastery'

const props = defineProps<{
  selectedProfession?: OperatorProfession
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
      criticalCandidate: group.criticalCandidates[0],
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
 * 整份建議排程（起始階段 → 專精三）剩餘所需的陪同時間：每階段的 critical 幹員陪同時間
 * （`criticalWork` 非 null 代表本階段有安排，固定陪同 `CRITICAL_DEFAULT_DURATION_MINUTES`）
 * 加上陪練幹員反推出的陪同時間相加，供 `MasteryCompletionTimeCard` 估算大約完成時間。
 * 尚未選擇職業、查詢中或查詢失敗時回傳 `null`——`GET /api/support-operators` 的 `class`
 * 參數是選填的，沒帶職業時仍會回傳「未篩選職業」的候選資料，若不特別排除，會在使用者
 * 還沒做任何選擇時就算出一個看似正常、實際上沒有意義的完成時間。
 */
const remainingMinutes = computed(() => {
  if (!props.selectedProfession || pending.value || error.value) return null
  return suggestions.value.reduce((total, suggestion) => {
    const criticalMinutes = suggestion.criticalWork != null ? CRITICAL_DEFAULT_DURATION_MINUTES : 0
    return total + criticalMinutes + (suggestion.operatorDurationMinutes ?? 0)
  }, 0)
})

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
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <label class="flex flex-col gap-1.5 text-sm w-40">
        <span class="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-mute">起始階段</span>
        <select
          v-model.number="startStage"
          :disabled="!props.selectedProfession"
          class="hud-field hud-select w-full px-2.5 py-1.5 disabled:border-ink-mute disabled:bg-transparent disabled:text-ink-mute disabled:cursor-not-allowed"
        >
          <option :value="1">專精一</option>
          <option :value="2">專精二</option>
          <option :value="3">專精三</option>
        </select>
      </label>

      <MasteryCompletionTimeCard :remaining-minutes="remainingMinutes" />
    </div>

    <p v-if="!props.selectedProfession" class="text-ink-soft">
      請先選擇幹員職業以取得建議。
    </p>
    <template v-else>
      <p v-if="pending" class="text-ink-soft">候選幹員查詢中…</p>
      <p v-else-if="error" class="text-danger">
        候選幹員查詢失敗，請稍後再試。
      </p>
      <div v-else class="flex flex-col gap-4">
        <MasteryStageCard
          v-for="group in groups"
          :key="group.phase"
          :title="STAGE_LABELS[group.phase]"
          :phase="group.phase"
          :required-work-minutes="suggestionByPhase.get(group.phase)!.requiredWork"
          :is-halved="group.phase > startStage"
          :variant="variantByPhase.get(group.phase)"
          :companion-code-name="displayByPhase.get(group.phase)?.otherCandidate?.codeName"
          :companion-efficiency-percent="displayByPhase.get(group.phase)?.otherCandidate?.realEfficiency"
          :companion-duration-minutes="suggestionByPhase.get(group.phase)!.operatorDurationMinutes ?? 0"
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
