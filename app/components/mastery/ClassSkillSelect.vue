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
  <div class="flex flex-wrap gap-4">
    <label class="flex flex-col gap-1 text-sm">
      <span class="font-semibold">幹員職業</span>
      <select class="min-w-32 px-2.5 py-1.5 border border-gray-300 rounded" :value="selectedClass ?? ''" @change="onClassChange">
        <option value="">請選擇職業</option>
        <option v-for="operatorClass in ARKNIGHTS_CLASSES" :key="operatorClass" :value="operatorClass">
          {{ operatorClass }}
        </option>
      </select>
    </label>
    <label class="flex flex-col gap-1 text-sm">
      <span class="font-semibold">技能編號</span>
      <select class="min-w-32 px-2.5 py-1.5 border border-gray-300 rounded" :value="selectedSkill ?? ''" @change="onSkillChange">
        <option value="">不限</option>
        <option value="1">一技</option>
        <option value="2">二技</option>
        <option value="3">三技</option>
      </select>
    </label>
  </div>
</template>
