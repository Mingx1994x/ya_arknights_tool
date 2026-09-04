<script setup lang="ts">
import type { ArknightsClass } from '#shared/types/support-operator'

const ARKNIGHTS_CLASSES: ArknightsClass[] = ['先鋒', '近衛', '重裝', '狙擊', '術師', '醫療', '輔助', '特種']

const selectedProfession = defineModel<ArknightsClass | undefined>('selectedProfession')

function onProfessionChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  selectedProfession.value = value ? (value as ArknightsClass) : undefined
}
</script>

<template>
  <div class="flex flex-wrap gap-4">
    <label class="flex flex-col gap-1 text-sm">
      <span class="font-semibold">幹員職業</span>
      <select
        class="min-w-32 px-2.5 py-1.5 border border-gray-300 rounded"
        :value="selectedProfession ?? ''"
        @change="onProfessionChange"
      >
        <option value="" disabled>請選擇職業</option>
        <option
          v-for="operatorClass in ARKNIGHTS_CLASSES"
          :key="operatorClass"
          :value="operatorClass"
        >
          {{ operatorClass }}
        </option>
      </select>
    </label>
  </div>
</template>
