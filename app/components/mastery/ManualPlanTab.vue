<script setup lang="ts">
import type { ArknightsClass,SkillPhase,SupportOperator } from '#shared/types/support-operator'
import type { MasteryPhaseSegment, MasteryStageResult } from '~/utils/mastery'

const props = defineProps<{
  selectedProfession?: ArknightsClass
}>()

const stage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

const { data: groups, pending, error } = useSupportOperators(professionRef, stage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/** groups[0] 必為目前下拉選到的階段（API 以 stage.value 當 fromSkill，回傳陣列第一筆即該階段）。 */
const currentStageCandidates = computed(() => groups.value[0]?.candidates ?? [])

/** 一筆陪同紀錄，對應領域文件第 2 節的「phase」（陪同幹員＋經過時間）。 */
type ManualPhaseEntry = {
  operator: SupportOperator
  hours: number
  minutes: number
}

/** 每個階段各自累積已加入的陪同紀錄（依加入順序排列，代表多個 phase）。 */
const selectedByStage = reactive<Record<SkillPhase, ManualPhaseEntry[]>>({
  1: [],
  2: [],
  3: [],
})

const currentStageSelections = computed(() => selectedByStage[stage.value])

function addOperator(operator: SupportOperator) {
  selectedByStage[stage.value].push({ operator, hours: 0, minutes: 0 })
}

function removeOperator(index: number) {
  selectedByStage[stage.value].splice(index, 1)
}

function entryToSegment(entry: ManualPhaseEntry): MasteryPhaseSegment {
  return {
    durationHours: entry.hours + entry.minutes / 60,
    efficiencyBonusPercent: entry.operator.realEfficiency,
    isCritical: entry.operator.category === 'critical',
  }
}

/**
 * 固定計算專精一～三：`selectedByStage` 本身就會保留三個階段各自的陪同紀錄，
 * 不受目前下拉選到哪個階段影響；起始的上一階段一律視為未觸發減半（專精一恆不減半）。
 *
 * 已知限制：若使用者想跳過在本工具建立專精一（或一、二）的紀錄、直接從後面階段開始，
 * 目前無法手動指定「上一階段是否已陪滿 5hr」，見 docs/domain/arknights_tools_init.md 第 9 節。
 */
const stageResults = computed<MasteryStageResult[]>(() =>
  evaluateStages([1, 2, 3], false, (phase) => selectedByStage[phase].map(entryToSegment)),
)

const stageResultByPhase = computed(() => new Map(stageResults.value.map((r) => [r.phase, r])))
const currentStageResult = computed(() => stageResultByPhase.value.get(stage.value))
</script>

<template>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm max-w-40">
      <span class="font-semibold">起始階段</span>
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
          <p v-if="!currentStageCandidates.length" class="text-gray-500">
            目前沒有符合條件的候選幹員。
          </p>
          <ul v-else class="flex flex-col gap-2 m-0 p-0 list-none">
            <li
              v-for="operator in currentStageCandidates"
              :key="operator.id"
              class="flex items-center justify-between gap-2"
            >
              <span
                >{{ operator.codeName }}（+{{ operator.realEfficiency

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
              v-for="(entry, index) in currentStageSelections"
              :key="`${entry.operator.id}-${index}`"
              class="flex items-center justify-between gap-2"
            >
              <span
                >{{ entry.operator.codeName }}（+{{ entry.operator.realEfficiency }}%）</span
              >
              <span class="flex items-center gap-1 text-sm">
                <input
                  v-model.number="entry.hours"
                  type="number"
                  min="0"
                  class="w-14 px-1.5 py-1 border border-gray-300 rounded"
                >
                小時
                <input
                  v-model.number="entry.minutes"
                  type="number"
                  min="0"
                  max="59"
                  class="w-14 px-1.5 py-1 border border-gray-300 rounded"
                >
                分
              </span>
              <button
                type="button"
                class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                @click="removeOperator(index)"
              >
                移除
              </button>
            </li>
          </ol>

          <template v-if="currentStageResult">
            <hr class="my-4 border-gray-200">
            <p class="text-sm">
              所需工作量：{{ formatHoursAsHm(currentStageResult.requiredWork) }}
              <span v-if="currentStageResult.requiredWork < currentStageResult.requiredWorkBase">（已套用跨階段減半）</span>
            </p>
            <p class="text-sm">已完成工作量：{{ formatHoursAsHm(currentStageResult.completedWork) }}</p>
            <p class="font-medium" :class="currentStageResult.isComplete ? 'text-green-600' : 'text-gray-700'">
              {{ currentStageResult.isComplete ? '已達成完成條件' : '尚未達成完成條件' }}
            </p>
            <p v-if="currentStageResult.triggersNextHalving" class="text-sm text-green-600">
              陪同 Logos／艾麗妮已滿 5 小時，下一階段所需工作量將減半
            </p>
          </template>
        </section>
      </div>

      <section class="p-4 border border-gray-200 rounded-lg">
        <h3 class="text-lg font-semibold mb-2">三階段總覽</h3>
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left border-b border-gray-200">
              <th class="py-1 pr-4">階段</th>
              <th class="py-1 pr-4">所需工作量</th>
              <th class="py-1 pr-4">已完成工作量</th>
              <th class="py-1">狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in stageResults" :key="result.phase" class="border-b border-gray-100">
              <td class="py-1 pr-4">{{ STAGE_LABELS[result.phase] }}</td>
              <td class="py-1 pr-4">{{ formatHoursAsHm(result.requiredWork) }}</td>
              <td class="py-1 pr-4">{{ formatHoursAsHm(result.completedWork) }}</td>
              <td class="py-1" :class="result.isComplete ? 'text-green-600' : 'text-gray-500'">
                {{ result.isComplete ? '已達成' : '未達成' }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
