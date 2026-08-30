<script setup lang="ts">
import type { ArknightsClass } from '#shared/types/support-operator'

const selectedClass = ref<ArknightsClass | undefined>(undefined)
const selectedSkill = ref<1 | 2 | 3 | undefined>(undefined)

const activeTab = ref<'auto' | 'manual'>('auto')
</script>

<template>
  <div class="mastery-page">
    <h1>幹員專精試算</h1>

    <MasteryClassSkillSelect
      v-model:selected-class="selectedClass"
      v-model:selected-skill="selectedSkill"
    />

    <div class="tabs">
      <button
        type="button"
        class="tabs__button"
        :class="{ 'tabs__button--active': activeTab === 'auto' }"
        @click="activeTab = 'auto'"
      >
        自動建議排程
      </button>
      <button
        type="button"
        class="tabs__button"
        :class="{ 'tabs__button--active': activeTab === 'manual' }"
        @click="activeTab = 'manual'"
      >
        手動模擬排程
      </button>
    </div>

    <MasteryAutoPlanTab
      v-if="activeTab === 'auto'"
      :selected-class="selectedClass"
      :selected-skill="selectedSkill"
    />
    <MasteryManualPlanTab
      v-else
      :selected-class="selectedClass"
      :selected-skill="selectedSkill"
    />
  </div>
</template>

<style scoped>
.mastery-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid #ddd;
}

.tabs__button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  cursor: pointer;
  font-size: 1rem;
}

.tabs__button--active {
  border-bottom-color: #3b82f6;
  font-weight: 600;
}
</style>
