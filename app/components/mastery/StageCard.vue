<script setup lang="ts">
import type { SupportOperatorCategory } from '#shared/types/support-operator'
import { CRITICAL_DEFAULT_DURATION_HOURS } from '~/utils/mastery'

const props = withDefaults(
  defineProps<{
    title: string
    requiredWorkHours: number
    /** 該階段的所需工作量是否已套用跨階段減半（上一階段陪滿 5 小時觸發，見領域文件第 4 節） */
    isHalved?: boolean
    /**
     * 幹員區塊的顯示形式：
     * - `general`：陪練幹員 + critical 幹員都顯示，中間加號
     * - `base`：只顯示陪練幹員（左側欄位）
     * - `critical`：只顯示 critical 幹員（右側欄位）
     */
    variant?: 'general' | 'base' | 'critical'
    /** 陪練幹員代號，`variant` 為 `critical` 時不需要 */
    companionCodeName?: string
    /** 陪練幹員效率加成（百分比），`variant` 為 `critical` 時不需要 */
    companionEfficiencyPercent?: number
    /** 陪練幹員反推出的建議陪同時間（小時），`variant` 為 `critical` 時不需要 */
    companionDurationHours?: number
    /** 陪練幹員類別，只有 `specific`（例如烏爾比安的宿舍搭配條件）才會顯示 `companionMemo` */
    companionCategory?: SupportOperatorCategory
    /** 陪練幹員備註（資料表 memo 欄位），只有 `companionCategory` 為 `specific` 時才顯示 */
    companionMemo?: string
    /** critical 幹員代號（Logos／艾麗妮），`variant` 為 `base` 時不需要 */
    criticalCodeName?: string
    /** critical 幹員效率加成（百分比），`variant` 為 `base` 時不需要 */
    criticalEfficiencyPercent?: number
    /** critical 幹員陪同時長（小時），`variant` 為 `base` 時不需要，預設 `CRITICAL_DEFAULT_DURATION_HOURS`（5hr5min） */
    criticalDurationHours?: number
    /** critical 幹員備註（資料表 memo 欄位，例如「陪滿 5 小時，下一階段所需工作量將減半」） */
    criticalMemo?: string
  }>(),
  { isHalved: false, variant: 'general', criticalDurationHours: CRITICAL_DEFAULT_DURATION_HOURS },
)

/** 兩位幹員實際訓練時間總和（依 variant 排除不適用的欄位，例如 base 不計入 critical 的預設時長） */
const totalDurationHours = computed(() => {
  const companionHours = props.variant !== 'critical' ? (props.companionDurationHours ?? 0) : 0
  const criticalHours = props.variant !== 'base' ? props.criticalDurationHours : 0
  return companionHours + criticalHours
})

/** (訓練時間總和 - 所需工時) / 所需工時，反映實際安排的訓練時間跟所需工時的落差百分比 */
const durationDeltaPercent = computed(() => {
  if (!props.requiredWorkHours) return 0
  return ((totalDurationHours.value - props.requiredWorkHours) / props.requiredWorkHours) * 100
})

/**
 * `isHalved` 為 `true` 時，`requiredWorkHours` 已經是套用減半後的值（見領域文件第 4 節：
 * `RequiredWork(N) = RequiredWorkBase(N) / 2`），乘以 2 精確還原成未減半的原始所需工時，
 * 用來額外顯示「跟減半前相比」的落差百分比，避免減半效果混進主要的 `durationDeltaPercent` 裡。
 */
const originalRequiredWorkHours = computed(() =>
  props.isHalved ? props.requiredWorkHours * 2 : props.requiredWorkHours,
)

const originalDurationDeltaPercent = computed(() => {
  if (!originalRequiredWorkHours.value) return 0
  return ((totalDurationHours.value - originalRequiredWorkHours.value) / originalRequiredWorkHours.value) * 100
})
</script>

<template>
  <section :class="isHalved ? 'border-green-600' : 'border-gray-200'" class="p-4 border rounded-lg @container">
    <div class="flex items-baseline justify-start gap-2 mb-2">
      <h3 class="text-lg font-semibold">{{ title }}</h3>
      <p class="text-gray-500 text-sm">
        階段所需工時：<span :class="isHalved ? 'text-green-600' : ''">{{ formatHoursAsHm(requiredWorkHours) }}</span>
      </p>
    </div>

    <div class="flex items-center gap-4">
      <div
        class="grid gap-4 items-center flex-1"
        :class="variant === 'general' ? 'grid-cols-1 @sm:grid-cols-[1fr_auto_1fr]' : 'grid-cols-1'"
      >
        <div v-if="variant !== 'critical'">
          <template v-if="companionCodeName">
            <p>
              幹員：{{ companionCodeName }}
              <span class="hidden @sm:inline">(+{{ companionEfficiencyPercent }}%)</span>
            </p>
            <p
              v-if="companionCategory === 'specific' && companionMemo"
              class="hidden @sm:block text-amber-600 text-sm"
            >
              ({{ companionMemo }})
            </p>
            <p class="font-bold">
              訓練時間：<span class="text-blue-600">{{ formatHoursAsHm(companionDurationHours ?? 0) }}</span>
            </p>
          </template>
          <p v-else class="text-gray-500 text-sm">目前沒有符合條件的陪練幹員。</p>
        </div>
        <div v-if="variant === 'general'" class="text-xl font-semibold text-gray-400 text-center">+</div>
        <div v-if="variant !== 'base'">
          <template v-if="criticalCodeName">
            <p>
              幹員：{{ criticalCodeName }}
              <span class="hidden @sm:inline">(+{{ criticalEfficiencyPercent }}%)</span>
            </p>
            <p v-if="criticalMemo" class="hidden @sm:block text-green-600 text-sm">({{ criticalMemo }})</p>
            <p>訓練時間：{{ formatHoursAsHm(criticalDurationHours) }}</p>
          </template>
          <p v-else class="text-gray-500 text-sm">目前沒有符合條件的 critical 候選幹員。</p>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center text-center shrink-0 w-20 font-semibold">
        <span :class="isHalved ? 'text-green-600' : ''">
          {{ durationDeltaPercent >= 0 ? '+' : '' }}{{ durationDeltaPercent.toFixed(1) }}%
        </span>
        <span v-if="isHalved" class="text-xs font-normal">
          ({{ originalDurationDeltaPercent >= 0 ? '+' : '' }}{{ originalDurationDeltaPercent.toFixed(1) }}%)
        </span>
      </div>
    </div>
  </section>
</template>
