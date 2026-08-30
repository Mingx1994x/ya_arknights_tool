<script setup lang="ts">
import type { ArknightsClass } from '#shared/types/support-operator'

const ARKNIGHTS_CLASSES: ArknightsClass[] = ['先鋒', '近衛', '重裝', '狙擊', '術師', '醫療', '輔助', '特種']

const selectedClass = defineModel<ArknightsClass | undefined>('selectedClass')
const selectedSkill = defineModel<1 | 2 | 3 | undefined>('selectedSkill')

function onClassChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  selectedClass.value = value ? (value as ArknightsClass) : undefined
}

function onSkillChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  selectedSkill.value = value ? (Number(value) as 1 | 2 | 3) : undefined
}
</script>

<template>
  <div class="class-skill-select">
    <label class="field">
      <span class="field__label">幹員職業</span>
      <select class="field__control" :value="selectedClass ?? ''" @change="onClassChange">
        <option value="">請選擇職業</option>
        <option v-for="operatorClass in ARKNIGHTS_CLASSES" :key="operatorClass" :value="operatorClass">
          {{ operatorClass }}
        </option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">技能編號</span>
      <select class="field__control" :value="selectedSkill ?? ''" @change="onSkillChange">
        <option value="">不限</option>
        <option value="1">一技</option>
        <option value="2">二技</option>
        <option value="3">三技</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.class-skill-select {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.field__label {
  font-weight: 600;
}

.field__control {
  min-width: 8rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
