<script setup lang="ts">
import type { ArknightsClass, SupportOperator } from '#shared/types/support-operator'

const props = defineProps<{
  selectedClass?: ArknightsClass
  selectedSkill?: 1 | 2 | 3
}>()

const stage = ref<1 | 2 | 3>(1)

const classRef = toRef(props, 'selectedClass')
const skillRef = toRef(props, 'selectedSkill')

const { data: candidates, pending, error } = useSupportOperators(classRef, skillRef)

const STAGE_LABELS: Record<1 | 2 | 3, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/** 每個階段各自累積已加入的幹員清單（依加入順序排列，代表多個 phase）。 */
const selectedByStage = reactive<Record<1 | 2 | 3, SupportOperator[]>>({
  1: [],
  2: [],
  3: [],
})

const currentStageSelections = computed(() => selectedByStage[stage.value])

function addOperator(operator: SupportOperator) {
  selectedByStage[stage.value].push(operator)
}

function removeOperator(index: number) {
  selectedByStage[stage.value].splice(index, 1)
}
</script>

<template>
  <div class="manual-plan-tab">
    <label class="field">
      <span class="field__label">專精階段</span>
      <select v-model.number="stage" class="field__control">
        <option :value="1">專精一</option>
        <option :value="2">專精二</option>
        <option :value="3">專精三</option>
      </select>
    </label>

    <p v-if="!props.selectedClass" class="hint">請先選擇幹員職業以取得候選幹員清單。</p>
    <template v-else>
      <p v-if="pending" class="hint">候選幹員查詢中…</p>
      <p v-else-if="error" class="hint hint--error">候選幹員查詢失敗，請稍後再試。</p>
      <div v-else class="columns">
        <section class="panel">
          <h3>候選幹員（{{ STAGE_LABELS[stage] }}）</h3>
          <p v-if="!candidates.length" class="hint">目前沒有符合條件的候選幹員。</p>
          <ul v-else class="operator-list">
            <li v-for="operator in candidates" :key="operator.id" class="operator-item">
              <span>{{ operator.name }}（+{{ operator.efficiencyBonus }}%）</span>
              <button type="button" @click="addOperator(operator)">加入</button>
            </li>
          </ul>
        </section>

        <section class="panel">
          <h3>已選幹員（{{ STAGE_LABELS[stage] }}）</h3>
          <p v-if="!currentStageSelections.length" class="hint">尚未加入任何幹員。</p>
          <ol v-else class="operator-list">
            <li v-for="(operator, index) in currentStageSelections" :key="`${operator.id}-${index}`" class="operator-item">
              <span>{{ operator.name }}（+{{ operator.efficiencyBonus }}%）</span>
              <button type="button" @click="removeOperator(index)">移除</button>
            </li>
          </ol>
          <p class="placeholder">模擬排程結果：待計算</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.manual-plan-tab {
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

.columns {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.panel {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.panel h3 {
  margin: 0 0 0.5rem;
}

.operator-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.operator-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.placeholder {
  margin-top: 1rem;
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
