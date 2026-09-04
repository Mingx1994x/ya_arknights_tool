<script setup lang="ts">
import type { ArknightsClass,SkillPhase,SupportOperatorRecord } from '#shared/types/support-operator'

const props = defineProps<{
  selectedProfession?: ArknightsClass
  selectedSkillPhase?: SkillPhase
}>()

const stage = ref<SkillPhase>(1)

const professionRef = toRef(props, 'selectedProfession')
const skillPhaseRef = toRef(props, 'selectedSkillPhase')

const { data: candidates, pending, error } = useSupportOperators(professionRef, skillPhaseRef)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/** 每個階段各自累積已加入的幹員清單（依加入順序排列，代表多個 phase）。 */
const selectedByStage = reactive<Record<SkillPhase, SupportOperatorRecord[]>>({
  1: [],
  2: [],
  3: [],
})

const currentStageSelections = computed(() => selectedByStage[stage.value])

function addOperator(operator: SupportOperatorRecord) {
  selectedByStage[stage.value].push(operator)
}

function removeOperator(index: number) {
  selectedByStage[stage.value].splice(index, 1)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm max-w-40">
      <span class="font-semibold">專精階段</span>
      <select
        v-model.number="stage"
        class="px-2.5 py-1.5 border border-gray-300 rounded"
      >
        <option :value="1">專精一</option>
        <option :value="2">專精二</option>
        <option :value="3">專精三</option>
      </select>
    </label>

    <p v-if="!props.selectedProfession" class="text-gray-500">
      請先選擇幹員職業以取得候選幹員清單。
    </p>
    <template v-else>
      <p v-if="pending" class="text-gray-500">候選幹員查詢中…</p>
      <p v-else-if="error" class="text-red-600">
        候選幹員查詢失敗，請稍後再試。
      </p>
      <div
        v-else
        class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]"
      >
        <section class="p-4 border border-gray-200 rounded-lg">
          <h3 class="text-lg font-semibold mb-2">
            候選幹員（{{ STAGE_LABELS[stage] }}）
          </h3>
          <p v-if="!candidates.length" class="text-gray-500">
            目前沒有符合條件的候選幹員。
          </p>
          <ul v-else class="flex flex-col gap-2 m-0 p-0 list-none">
            <li
              v-for="operator in candidates"
              :key="operator.id"
              class="flex items-center justify-between gap-2"
            >
              <span
                >{{ operator.codeName }}（+{{ operator.baseEfficiency

                }}%）</span
              >
              <button
                type="button"
                class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                @click="addOperator(operator)"
              >
                加入
              </button>
            </li>
          </ul>
        </section>

        <section class="p-4 border border-gray-200 rounded-lg">
          <h3 class="text-lg font-semibold mb-2">
            已選幹員（{{ STAGE_LABELS[stage] }}）
          </h3>
          <p v-if="!currentStageSelections.length" class="text-gray-500">
            尚未加入任何幹員。
          </p>
          <ol v-else class="flex flex-col gap-2 m-0 p-0 list-none">
            <li
              v-for="(operator, index) in currentStageSelections"
              :key="`${operator.id}-${index}`"
              class="flex items-center justify-between gap-2"
            >
              <span
                >{{ operator.codeName }}（+{{ operator.baseEfficiency

                }}%）</span
              >
              <button
                type="button"
                class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                @click="removeOperator(index)"
              >
                移除
              </button>
            </li>
          </ol>
          <p class="mt-4 text-gray-400 italic">模擬排程結果：待計算</p>
        </section>
      </div>
    </template>
  </div>
</template>
