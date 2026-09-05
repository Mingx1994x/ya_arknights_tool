<script setup lang="ts">
import type { ArknightsClass, SkillPhase } from '#shared/types/support-operator'

const props = defineProps<{
  selectedProfession?: ArknightsClass
}>()

const startStage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

const { data: groups, pending, error } = useSupportOperators(professionRef, startStage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }
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
          <p class="text-gray-400 italic">建議時間：待計算</p>
        </section>
      </div>
    </template>
  </div>
</template>
