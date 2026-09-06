<script setup lang="ts">
import type { ArknightsClass, SkillPhase } from '#shared/types/support-operator'
import {
  CRITICAL_DEFAULT_DURATION_HOURS,
  calcDurationForWork,
  getRequiredWork,
  planCriticalCompanionStage,
} from '~/utils/mastery'

const props = defineProps<{
  selectedProfession?: ArknightsClass
}>()

const startStage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

/** 目前正在編輯的階段：初始等於起始階段，靠「前往下一階段」前進；改動起始階段或職業會重置回起始階段。 */
const currentStage = ref<SkillPhase>(startStage.value)

const { data: groups, pending, error } = useSupportOperators(professionRef, currentStage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/** groups[0] 必為目前 currentStage（API 以 currentStage.value 當 fromSkill，回傳陣列第一筆即該階段）。 */
const currentStageCandidates = computed(() => groups.value[0]?.candidates ?? [])
const criticalCandidates = computed(() => currentStageCandidates.value.filter((c) => c.category === 'critical'))
const otherCandidates = computed(() => currentStageCandidates.value.filter((c) => c.category !== 'critical'))

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

const currentState = computed(() => planByStage[currentStage.value])
const needsCriticalCompanion = computed(() => currentStage.value !== 3)

type LockedStageResult = {
  phase: SkillPhase
  requiredWork: number
  triggersNextHalving: boolean
  critical?: { codeName: string; efficiencyPercent: number; durationHours: number; work: number }
  other?: { codeName: string; efficiencyPercent: number; durationHours: number | null }
}

/**
 * 已完成並鎖定的階段結果（唯讀摘要），key 為階段編號。
 * 目前刻意設計成不可回頭編輯：改動起始階段或職業會整個清空重來（見 domain 文件第 9 節待辦：
 * 之後要支援「點卡片回頭調整」時，只有 critical 幹員陪同時長跨過 5hr 門檻、
 * 使 `triggersNextHalving` 改變時才需要連動清空/重算後面已鎖定的階段）。
 */
const lockedStages = reactive<Partial<Record<SkillPhase, LockedStageResult>>>({})

const lockedStageList = computed(() =>
  ([1, 2, 3] as SkillPhase[])
    .map((phase) => lockedStages[phase])
    .filter((result): result is LockedStageResult => result != null),
)

function resetProgress() {
  currentStage.value = startStage.value
  for (const phase of [1, 2, 3] as SkillPhase[]) delete lockedStages[phase]
}

watch([startStage, professionRef], resetProgress)

/**
 * 該階段所需工作量：起始階段宣告式視為未觸發減半（跟 AutoPlanTab 一致，選定起始階段就代表從這裡重新規劃），
 * 其餘階段則依「上一階段實際鎖定的 triggersNextHalving」決定，而非固定假設一定減半（見領域文件第 9 節）。
 */
const requiredWork = computed(() => {
  const previousTriggered =
    currentStage.value === startStage.value
      ? false
      : (lockedStages[(currentStage.value - 1) as SkillPhase]?.triggersNextHalving ?? false)
  return getRequiredWork(currentStage.value, previousTriggered)
})

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
  return calcDurationForWork(requiredWork.value, criticalOperator.value.realEfficiency)
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
    requiredWork.value,
    effectiveCriticalDurationHours.value,
    criticalOperator.value.realEfficiency,
    otherOperator.value?.realEfficiency ?? 0,
  )
})

/** 專精三：單一陪練幹員需要的陪同時長。 */
const soloDurationHours = computed(() => {
  if (needsCriticalCompanion.value || !otherOperator.value) return null
  return calcDurationForWork(requiredWork.value, otherOperator.value.realEfficiency)
})

/** 目前階段是否已排出完整可用的排程（陪練幹員若還需要補工作量，必須也選好）。 */
const isCurrentStagePlanComplete = computed(() => {
  if (!needsCriticalCompanion.value) return soloDurationHours.value != null
  if (!criticalPlan.value) return false
  return criticalPlan.value.otherOperatorDurationHours === null || !!otherOperator.value
})

const canAdvance = computed(() => currentStage.value < 3 && isCurrentStagePlanComplete.value)

function advanceToNextStage() {
  if (!canAdvance.value || !criticalPlan.value) return

  const phase = currentStage.value
  lockedStages[phase] = {
    phase,
    requiredWork: requiredWork.value,
    triggersNextHalving: criticalPlan.value.triggersNextHalving,
    critical: criticalOperator.value
      ? {
          codeName: criticalOperator.value.codeName,
          efficiencyPercent: criticalOperator.value.realEfficiency,
          durationHours: effectiveCriticalDurationHours.value,
          work: criticalPlan.value.criticalWork,
        }
      : undefined,
    other: otherOperator.value
      ? {
          codeName: otherOperator.value.codeName,
          efficiencyPercent: otherOperator.value.realEfficiency,
          durationHours: criticalPlan.value.otherOperatorDurationHours,
        }
      : undefined,
  }
  currentStage.value = (phase + 1) as SkillPhase
}
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
      請先選擇幹員職業以取得候選幹員清單。
    </p>
    <template v-else>
      <section
        v-for="locked in lockedStageList"
        :key="locked.phase"
        class="p-4 border border-gray-200 rounded-lg flex flex-col gap-2 max-w-md bg-gray-50"
      >
        <h3 class="text-lg font-semibold">{{ STAGE_LABELS[locked.phase] }}（已完成）</h3>
        <p class="text-sm text-gray-500">
          所需工作量：{{ formatHoursAsHm(locked.requiredWork) }}
        </p>
        <template v-if="locked.critical">
          <p class="text-sm">
            Critical 幹員：{{ locked.critical.codeName }}（+{{ locked.critical.efficiencyPercent }}%），
            陪同 {{ formatHoursAsHm(locked.critical.durationHours) }}
          </p>
          <p v-if="locked.triggersNextHalving" class="text-sm text-green-600">
            陪滿 5 小時，下一階段所需工作量已減半
          </p>
        </template>
        <p v-if="locked.other" class="text-sm">
          陪練幹員：{{ locked.other.codeName }}（+{{ locked.other.efficiencyPercent }}%），
          陪同 {{
            locked.other.durationHours != null ? formatHoursAsHm(locked.other.durationHours) : '不需要'
          }}
        </p>
      </section>

      <p v-if="pending" class="text-gray-500">候選幹員查詢中…</p>
      <p v-else-if="error" class="text-red-600">
        候選幹員查詢失敗，請稍後再試。
      </p>
      <section
        v-else
        class="p-4 border border-gray-200 rounded-lg flex flex-col gap-4 max-w-md"
      >
        <h3 class="text-lg font-semibold">{{ STAGE_LABELS[currentStage] }}</h3>
        <p class="text-sm text-gray-500">
          所需工作量：{{ formatHoursAsHm(requiredWork) }}
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

        <button
          v-if="currentStage < 3"
          type="button"
          class="self-start px-4 py-2 rounded bg-blue-600 text-white font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          :disabled="!canAdvance"
          @click="advanceToNextStage"
        >
          前往下一階段
        </button>
      </section>
    </template>
  </div>
</template>
