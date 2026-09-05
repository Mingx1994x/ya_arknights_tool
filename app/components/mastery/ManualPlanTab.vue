<script setup lang="ts">
import type { ArknightsClass, SkillPhase, SupportOperator } from '#shared/types/support-operator'
import {
  CRITICAL_DEFAULT_DURATION_HOURS,
  calcDurationForWork,
  getRequiredWorkUnderDefaultStrategy,
  planCriticalCompanionStage,
} from '~/utils/mastery'

const props = defineProps<{
  selectedProfession?: ArknightsClass
}>()

const stage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

const { data: groups, pending, error } = useSupportOperators(professionRef, stage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/** groups[0] 必為目前下拉選到的階段（API 以 stage.value 當 fromSkill，回傳陣列第一筆即該階段）。 */
const currentStageCandidates = computed(() => groups.value[0]?.candidates ?? [])
const criticalCandidates = computed(() => currentStageCandidates.value.filter((c) => c.category === 'critical'))
const otherCandidates = computed(() => currentStageCandidates.value.filter((c) => c.category !== 'critical'))

/**
 * 預設策略：專精一、二各安排一位 critical 幹員陪滿 ≥5hr，兩階段皆觸發下一階段減半；
 * 專精三沒有下一階段可以減半，因此不安排 critical 幹員（見 docs/domain 第 4／9 節）。
 */
const requiredWorkByPhase: Record<SkillPhase, number> = {
  1: getRequiredWorkUnderDefaultStrategy(1),
  2: getRequiredWorkUnderDefaultStrategy(2),
  3: getRequiredWorkUnderDefaultStrategy(3),
}

type StagePlanState = {
  criticalOperatorId: string
  criticalHours: number
  criticalMinutes: number
  otherOperatorId: string
}

function createDefaultPlanState(): StagePlanState {
  return {
    criticalOperatorId: '',
    criticalHours: Math.floor(CRITICAL_DEFAULT_DURATION_HOURS),
    criticalMinutes: Math.round((CRITICAL_DEFAULT_DURATION_HOURS % 1) * 60),
    otherOperatorId: '',
  }
}

const planByStage = reactive<Record<SkillPhase, StagePlanState>>({
  1: createDefaultPlanState(),
  2: createDefaultPlanState(),
  3: createDefaultPlanState(),
})

const currentState = computed(() => planByStage[stage.value])
const needsCriticalCompanion = computed(() => stage.value !== 3)

const criticalOperator = computed(() =>
  criticalCandidates.value.find((c) => c.id === currentState.value.criticalOperatorId),
)
const otherOperator = computed(() => {
  const pool = needsCriticalCompanion.value ? otherCandidates.value : currentStageCandidates.value
  return pool.find((c) => c.id === currentState.value.otherOperatorId)
})

const rawCriticalDurationHours = computed(
  () => currentState.value.criticalHours + currentState.value.criticalMinutes / 60,
)

/** critical 幹員陪同時長上限：超過會讓 criticalWork 超過 RequiredWork(N)，正常遊戲數值不會需要用到，僅供輸入防呆。 */
const maxCriticalDurationHours = computed(() => {
  if (!criticalOperator.value) return null
  return calcDurationForWork(requiredWorkByPhase[stage.value], criticalOperator.value.realEfficiency)
})

const isCriticalDurationClamped = computed(
  () => maxCriticalDurationHours.value !== null && rawCriticalDurationHours.value > maxCriticalDurationHours.value,
)

const effectiveCriticalDurationHours = computed(() =>
  maxCriticalDurationHours.value !== null
    ? Math.min(rawCriticalDurationHours.value, maxCriticalDurationHours.value)
    : rawCriticalDurationHours.value,
)

/** 專精一／二：critical 幹員 + 另一位陪練幹員的組合結果。 */
const criticalPlan = computed(() => {
  if (!needsCriticalCompanion.value || !criticalOperator.value) return null
  return planCriticalCompanionStage(
    requiredWorkByPhase[stage.value],
    effectiveCriticalDurationHours.value,
    criticalOperator.value.realEfficiency,
    otherOperator.value?.realEfficiency ?? 0,
  )
})

/** 專精三：單一陪練幹員需要的陪同時長。 */
const soloDurationHours = computed(() => {
  if (needsCriticalCompanion.value || !otherOperator.value) return null
  return calcDurationForWork(requiredWorkByPhase[3], otherOperator.value.realEfficiency)
})
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
      <section
        v-else
        class="p-4 border border-gray-200 rounded-lg flex flex-col gap-4 max-w-md"
      >
        <h3 class="text-lg font-semibold">{{ STAGE_LABELS[stage] }}</h3>
        <p class="text-sm text-gray-500">
          所需工作量：{{ formatHoursAsHm(requiredWorkByPhase[stage]) }}
        </p>

        <template v-if="needsCriticalCompanion">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold">Critical 幹員（Logos／艾麗妮）</span>
            <select
              v-model="currentState.criticalOperatorId"
              class="px-2.5 py-1.5 border border-gray-300 rounded"
            >
              <option value="">請選擇</option>
              <option v-for="c in criticalCandidates" :key="c.id" :value="c.id">
                {{ c.codeName }}（+{{ c.realEfficiency }}%）
              </option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold">陪同時長（下限 5 小時，預設含 5 分鐘操作緩衝）</span>
            <span class="flex items-center gap-1">
              <input
                v-model.number="currentState.criticalHours"
                type="number"
                min="0"
                class="w-16 px-1.5 py-1 border border-gray-300 rounded"
              >
              小時
              <input
                v-model.number="currentState.criticalMinutes"
                type="number"
                min="0"
                max="59"
                class="w-16 px-1.5 py-1 border border-gray-300 rounded"
              >
              分
            </span>
          </label>
          <p v-if="isCriticalDurationClamped" class="text-sm text-amber-600">
            已達上限，超過會讓 critical 幹員單獨補滿所需工作量，實際計算已自動改用
            {{ formatHoursAsHm(effectiveCriticalDurationHours) }}。
          </p>

          <template v-if="criticalPlan">
            <p class="text-sm text-gray-500">
              Critical 幹員這段工作量：{{ formatHoursAsHm(criticalPlan.criticalWork) }}
            </p>
            <p v-if="criticalPlan.triggersNextHalving" class="text-sm text-green-600">
              陪滿 5 小時，下一階段所需工作量將減半
            </p>

            <label class="flex flex-col gap-1 text-sm">
              <span class="font-semibold">另一位陪練幹員</span>
              <select
                v-model="currentState.otherOperatorId"
                class="px-2.5 py-1.5 border border-gray-300 rounded"
              >
                <option value="">請選擇</option>
                <option v-for="c in otherCandidates" :key="c.id" :value="c.id">
                  {{ c.codeName }}（+{{ c.realEfficiency }}%）
                </option>
              </select>
            </label>

            <p v-if="!currentState.otherOperatorId" class="text-gray-500">請選擇另一位陪練幹員以算出建議陪同時間。</p>
            <p v-else class="font-medium">
              建議陪同時間：{{
                criticalPlan.otherOperatorDurationHours != null
                  ? formatHoursAsHm(criticalPlan.otherOperatorDurationHours)
                  : '不需要'
              }}
            </p>
          </template>
          <p v-else class="text-gray-500">請先選擇 Critical 幹員。</p>
        </template>

        <template v-else>
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold">陪練幹員</span>
            <select
              v-model="currentState.otherOperatorId"
              class="px-2.5 py-1.5 border border-gray-300 rounded"
            >
              <option value="">請選擇</option>
              <option v-for="c in currentStageCandidates" :key="c.id" :value="c.id">
                {{ c.codeName }}（+{{ c.realEfficiency }}%）
              </option>
            </select>
          </label>

          <p v-if="soloDurationHours == null" class="text-gray-500">請選擇陪練幹員以算出建議陪同時間。</p>
          <p v-else class="font-medium">
            建議陪同時間：{{ formatHoursAsHm(soloDurationHours) }}
          </p>
        </template>
      </section>
    </template>
  </div>
</template>
