<script setup lang="ts">
import type { ArknightsClass } from '#shared/types/support-operator'

const props = defineProps<{
  selectedClass?: ArknightsClass
  selectedSkill?: 1 | 2 | 3
}>()

const startStage = ref<1 | 2 | 3>(1)

const classRef = toRef(props, 'selectedClass')
const skillRef = toRef(props, 'selectedSkill')

const { data: candidates, pending, error } = useSupportOperators(classRef, skillRef)

const STAGE_LABELS: Record<1 | 2 | 3, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

const visibleStages = computed<(1 | 2 | 3)[]>(() =>
  ([1, 2, 3] as const).filter((stage) => stage >= startStage.value),
)

const bestCandidate = computed(() => {
  if (!candidates.value.length) return null
  return [...candidates.value].sort((a, b) => b.efficiencyBonus - a.efficiencyBonus)[0]
})
</script>

<template>
  <div class="auto-plan-tab">
    <label class="field">
      <span class="field__label">起始階段</span>
      <select v-model.number="startStage" class="field__control">
        <option :value="1">專精一</option>
        <option :value="2">專精二</option>
        <option :value="3">專精三</option>
      </select>
    </label>

    <p v-if="!props.selectedClass" class="hint">請先選擇幹員職業以取得建議。</p>
    <template v-else>
      <p v-if="pending" class="hint">候選幹員查詢中…</p>
      <p v-else-if="error" class="hint hint--error">候選幹員查詢失敗，請稍後再試。</p>
      <div v-else class="stage-list">
        <section v-for="stage in visibleStages" :key="stage" class="stage-card">
          <h3>{{ STAGE_LABELS[stage] }}</h3>
          <p v-if="bestCandidate">
            建議候選幹員：{{ bestCandidate.name }}（+{{ bestCandidate.efficiencyBonus }}%）
          </p>
          <p v-else class="hint">目前沒有符合條件的候選幹員。</p>
          <p class="placeholder">建議時間：待計算</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.auto-plan-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  max-width: 10rem;
}

.field__label {
  font-weight: 600;
}

.field__control {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.stage-list {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.stage-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.stage-card h3 {
  margin: 0 0 0.5rem;
}

.placeholder {
  color: #888;
  font-style: italic;
}

.hint {
  color: #666;
}

.hint--error {
  color: #c0392b;
}
</style>
