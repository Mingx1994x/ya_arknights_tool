<script setup lang="ts">
import type { SupportOperatorCategory } from '#shared/types/support-operator'
import { CRITICAL_DEFAULT_DURATION_MINUTES } from '~/utils/mastery'

const props = withDefaults(
  defineProps<{
    title: string
    /** 專精階段序號（1／2／3），顯示成 01／02／03 的 HUD 序號標。專精階段是真正的序列，才用編號 */
    phase?: number
    requiredWorkMinutes: number
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
    /** 陪練幹員反推出的建議陪同時間（分鐘），`variant` 為 `critical` 時不需要 */
    companionDurationMinutes?: number
    /** 陪練幹員類別，只有 `specific`（例如烏爾比安的宿舍搭配條件）才會顯示 `companionMemo` */
    companionCategory?: SupportOperatorCategory
    /** 陪練幹員備註（資料表 memo 欄位），只有 `companionCategory` 為 `specific` 時才顯示 */
    companionMemo?: string
    /** critical 幹員代號（Logos／艾麗妮），`variant` 為 `base` 時不需要 */
    criticalCodeName?: string
    /** critical 幹員效率加成（百分比），`variant` 為 `base` 時不需要 */
    criticalEfficiencyPercent?: number
    /** critical 幹員陪同時長（分鐘），`variant` 為 `base` 時不需要，預設 `CRITICAL_DEFAULT_DURATION_MINUTES`（5hr5min） */
    criticalDurationMinutes?: number
    /** critical 幹員備註（資料表 memo 欄位，例如「陪滿 5 小時，下一階段所需工作量將減半」） */
    criticalMemo?: string
  }>(),
  { isHalved: false, variant: 'general', criticalDurationMinutes: CRITICAL_DEFAULT_DURATION_MINUTES },
)

/** 兩位幹員實際訓練時間總和（依 variant 排除不適用的欄位，例如 base 不計入 critical 的預設時長） */
const totalDurationMinutes = computed(() => {
  const companionMinutes = props.variant !== 'critical' ? (props.companionDurationMinutes ?? 0) : 0
  const criticalMinutes = props.variant !== 'base' ? props.criticalDurationMinutes : 0
  return companionMinutes + criticalMinutes
})

/** (訓練時間總和 - 所需工時) / 所需工時，反映實際安排的訓練時間跟所需工時的落差百分比 */
const durationDeltaPercent = computed(() => {
  if (!props.requiredWorkMinutes) return 0
  return ((totalDurationMinutes.value - props.requiredWorkMinutes) / props.requiredWorkMinutes) * 100
})

/**
 * `isHalved` 為 `true` 時，`requiredWorkMinutes` 已經是套用減半後的值（見領域文件第 4 節：
 * `RequiredWork(N) = RequiredWorkBase(N) / 2`），乘以 2 精確還原成未減半的原始所需工時，
 * 用來額外顯示「跟減半前相比」的落差百分比，避免減半效果混進主要的 `durationDeltaPercent` 裡。
 */
const originalRequiredWorkMinutes = computed(() =>
  props.isHalved ? props.requiredWorkMinutes * 2 : props.requiredWorkMinutes,
)

const originalDurationDeltaPercent = computed(() => {
  if (!originalRequiredWorkMinutes.value) return 0
  return ((totalDurationMinutes.value - originalRequiredWorkMinutes.value) / originalRequiredWorkMinutes.value) * 100
})
</script>

<template>
  <UiHudPanel :tone="isHalved ? 'ok' : 'default'" :glow="isHalved" class="@container">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
      <span
        v-if="phase"
        class="shrink-0 px-2 py-0.5 border font-mono text-[11px] font-bold tracking-[0.12em]"
        :class="isHalved ? 'border-ok text-ok' : 'border-ink-mute text-ink-soft'"
      >
        {{ String(phase).padStart(2, '0') }}
      </span>
      <h3 class="font-display text-lg font-bold tracking-[0.08em]">{{ title }}</h3>
      <p class="text-ink-soft text-sm">
        階段所需工時
        <span class="font-mono font-bold" :class="isHalved ? 'text-ok' : 'text-ink'">
          {{ formatMinutesAsHm(requiredWorkMinutes) }}
        </span>
      </p>
      <span
        v-if="isHalved"
        class="px-2 py-0.5 border border-ok font-mono text-[10px] font-bold tracking-[0.14em] text-ok"
      >
        ◆ 工作量減半
      </span>
    </div>

    <div class="flex items-center gap-4">
      <div
        class="grid gap-4 items-center flex-1"
        :class="variant === 'general' ? 'grid-cols-1 @sm:grid-cols-[1fr_auto_1fr]' : 'grid-cols-1'"
      >
        <div v-if="variant !== 'critical'">
          <template v-if="companionCodeName">
            <p>
              <span class="text-ink-soft text-sm">幹員</span> {{ companionCodeName }}
              <span class="hidden @sm:inline font-mono text-xs text-ink-soft">+{{ companionEfficiencyPercent }}%</span>
            </p>
            <p
              v-if="companionCategory === 'specific' && companionMemo"
              class="hidden @sm:block text-warn text-sm"
            >
              ({{ companionMemo }})
            </p>
            <p class="flex items-baseline gap-1.5">
              <span class="text-ink-soft text-sm">訓練時間</span>
              <span class="font-mono font-bold text-data">{{ formatMinutesAsHm(companionDurationMinutes ?? 0) }}</span>
            </p>
          </template>
          <p v-else class="text-ink-soft text-sm">目前沒有符合條件的陪練幹員。</p>
        </div>
        <div v-if="variant === 'general'" class="font-display text-xl text-ink-mute text-center">＋</div>
        <div v-if="variant !== 'base'">
          <template v-if="criticalCodeName">
            <p>
              <span class="text-ink-soft text-sm">幹員</span> {{ criticalCodeName }}
              <span class="hidden @sm:inline font-mono text-xs text-ink-soft">+{{ criticalEfficiencyPercent }}%</span>
            </p>
            <p v-if="criticalMemo" class="hidden @sm:block text-ok text-sm">({{ criticalMemo }})</p>
            <p class="flex items-baseline gap-1.5">
              <span class="text-ink-soft text-sm">訓練時間</span>
              <span class="font-mono font-bold">{{ formatMinutesAsHm(criticalDurationMinutes) }}</span>
            </p>
          </template>
          <p v-else class="text-ink-soft text-sm">目前沒有符合條件的 critical 候選幹員。</p>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center text-center shrink-0 w-20 font-mono font-bold">
        <span :class="isHalved ? 'text-ok' : ''">
          {{ durationDeltaPercent >= 0 ? '+' : '' }}{{ durationDeltaPercent.toFixed(1) }}%
        </span>
        <span v-if="isHalved" class="text-xs font-normal text-ink-soft">
          ({{ originalDurationDeltaPercent >= 0 ? '+' : '' }}{{ originalDurationDeltaPercent.toFixed(1) }}%)
        </span>
      </div>
    </div>
  </UiHudPanel>
</template>
