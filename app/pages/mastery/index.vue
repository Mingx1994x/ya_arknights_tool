<script setup lang="ts">
import type { ArknightsClass } from '#shared/types/support-operator'

const selectedClass = ref<ArknightsClass | undefined>(undefined)
const selectedSkill = ref<1 | 2 | 3 | undefined>(undefined)

const activeTab = ref<'auto' | 'manual'>('auto')
</script>

<template>
  <div class="flex flex-col gap-6 max-w-[60rem] mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">幹員專精試算</h1>

    <MasteryClassSkillSelect
      v-model:selected-class="selectedClass"
      v-model:selected-skill="selectedSkill"
    />

    <div class="flex gap-2 border-b border-gray-200">
      <button
        type="button"
        class="px-5 py-2.5 border-0 border-b-2 border-transparent bg-transparent cursor-pointer text-base"
        :class="activeTab === 'auto' ? 'border-b-blue-500 font-semibold' : ''"
        @click="activeTab = 'auto'"
      >
        自動建議排程
      </button>
      <button
        type="button"
        class="px-5 py-2.5 border-0 border-b-2 border-transparent bg-transparent cursor-pointer text-base"
        :class="activeTab === 'manual' ? 'border-b-blue-500 font-semibold' : ''"
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
