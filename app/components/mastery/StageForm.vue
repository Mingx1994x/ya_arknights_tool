<script setup lang="ts">
import type { SupportOperator, SupportOperatorCategory } from '#shared/types/support-operator'

const props = withDefaults(
  defineProps<{
    title: string
    requiredWorkHours: number
    /** 該階段的所需工時是否已套用跨階段減半，跟 StageCard 的 isHalved 同一套規則 */
    isHalved?: boolean
    /** 陪練幹員候選清單（variant 為 final 時是整份未分類候選，其餘情境已排除 critical 類別，見父層 otherOperatorPool） */
    companionCandidates?: SupportOperator[]
    /** critical 幹員候選清單（Logos／艾麗妮） */
    criticalCandidates?: SupportOperator[]
    /** 陪練幹員反推出的建議陪同時間；null 代表「不需要」（critical 已經補滿或整段還沒得算） */
    companionDurationHours?: number | null
    /** 陪練幹員類別，只有 `specific`（例如烏爾比安的宿舍搭配條件）才會顯示 companionMemo */
    companionCategory?: SupportOperatorCategory
    /** 陪練幹員備註（資料表 memo 欄位），只有 companionCategory 為 specific 時才顯示 */
    companionMemo?: string
    /** critical 幹員被留成唯一區塊(variant === 'critical')時，反推出的直接計算結果 */
    criticalOnlyDurationHours?: number | null
    /** critical 幹員陪同是否達到 5hr 門檻、觸發下一階段減半 */
    triggersNextHalving?: boolean
    /** critical 幹員陪同時長是否已達上限（超過會讓 critical 自己補滿所需工時） */
    isCriticalDurationClamped?: boolean
    /** 上限限制後實際套用的 critical 陪同時長，isCriticalDurationClamped 為 true 時用來顯示提示文字 */
    effectiveCriticalDurationHours?: number
    /** 目前階段是否已經可以前往下一階段 */
    canAdvance?: boolean
  }>(),
  {
    isHalved: false,
    companionCandidates: () => [],
    criticalCandidates: () => [],
    companionDurationHours: null,
    criticalOnlyDurationHours: null,
    triggersNextHalving: false,
    isCriticalDurationClamped: false,
    effectiveCriticalDurationHours: 0,
    canAdvance: false,
  },
)

const emit = defineEmits<{ advance: [] }>()

/**
 * general／base／critical 跟 StageCard 同型別；`final` 是這個表單特有的第四種狀態——
 * 專精三結構性鎖定成「只有陪練幹員、不能加 critical、沒有下一階段」，跟使用者在專精一／二
 * 主動用 - 把 critical 移除後暫時停留的 base 不一樣（那個還能按 + 加回來、還有前往下一階段按鈕）。
 * 拆成獨立的第四種 variant，父層對專精三固定傳入 final，其餘三種留給子層透過 +/- 互相切換。
 */
const variant = defineModel<'general' | 'base' | 'critical' | 'final'>('variant', { default: 'general' })
const companionOperatorId = defineModel<string>('companionOperatorId', { default: '' })
const criticalOperatorId = defineModel<string>('criticalOperatorId', { default: '' })
const criticalHours = defineModel<number>('criticalHours', { default: 5 })
const criticalMinutes = defineModel<number>('criticalMinutes', { default: 5 })

/** variant 為 general 時，critical 幹員預設直接套用候選清單第一筆（效率最高），不強迫使用者手動選。 */
watch(
  [variant, () => props.criticalCandidates],
  ([currentVariant, candidates]) => {
    if (currentVariant === 'general' && !criticalOperatorId.value && candidates.length > 0) {
      criticalOperatorId.value = candidates[0]!.id
    }
  },
  { immediate: true },
)

const showCompanion = computed(() => variant.value !== 'critical')
const showCritical = computed(() => variant.value === 'general' || variant.value === 'critical')
const bothPresent = computed(() => variant.value === 'general')
/** critical 幹員被留成唯一區塊時，沒有陪練幹員可以分攤，訓練時長改成單一幹員反推的直接計算結果 */
const isCriticalOnly = computed(() => variant.value === 'critical')

/** 「+」佔位區塊要補在哪個位置：陪練幹員被移除時補左邊，critical 幹員被移除時補右邊 */
const PLUS_COL_SPAN_BY_VARIANT: Record<'general' | 'base' | 'critical', string> = {
  general: 'col-start-2 col-end-3',
  base: 'col-start-2 col-end-4',
  critical: 'col-start-1 col-end-3',
}
const plusColSpanClass = computed(
  () => PLUS_COL_SPAN_BY_VARIANT[variant.value as 'general' | 'base' | 'critical'],
)
</script>

<template>
  <section
    :class="isHalved ? 'border-green-600' : 'border-gray-200'"
    class="p-4 border rounded-lg flex flex-col gap-4 @container"
  >
    <div class="flex items-baseline justify-start gap-2">
      <h3 class="text-lg font-semibold">{{ title }}</h3>
      <p class="text-gray-500 text-sm">
        階段所需工時：<span :class="isHalved ? 'text-green-600' : ''">{{ formatHoursAsHm(requiredWorkHours) }}</span>
      </p>
    </div>

    <div
      class="grid gap-4"
      :class="variant === 'final' ? 'grid-cols-1' : 'grid-cols-1 @sm:grid-cols-[1fr_auto_1fr]'"
    >
      <div
        v-if="showCompanion"
        class="flex flex-col gap-2"
        :class="variant === 'final' ? 'w-3/5 justify-self-start' : ''"
      >
        <div class="flex items-center justify-between">
          <span class="font-semibold text-sm">陪練幹員</span>
          <button
            v-if="variant !== 'final'"
            type="button"
            class="w-5 h-5 flex items-center justify-center rounded-full border border-red-300 text-xs leading-none text-red-500 hover:border-red-500 hover:text-red-700 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            :disabled="variant !== 'general'"
            @click="variant = 'critical'"
          >
            -
          </button>
        </div>
        <p v-if="companionCategory === 'specific' && companionMemo" class="text-sm text-amber-600">
          ({{ companionMemo }})
        </p>
        <select v-model="companionOperatorId" class="px-2.5 py-1.5 border border-gray-300 rounded">
          <option value="">請選擇</option>
          <option v-for="c in companionCandidates" :key="c.id" :value="c.id">
            {{ c.codeName }}(+{{ c.realEfficiency }}%)
          </option>
        </select>
        <p v-if="!companionOperatorId" class="text-sm text-gray-500">
          訓練時間：---(請先選擇幹員)
        </p>
        <p v-else class="font-bold">
          訓練時間：<span class="text-blue-600">
            {{ companionDurationHours != null ? formatHoursAsHm(companionDurationHours) : '不需要' }}
          </span>
        </p>
      </div>

      <div
        v-if="variant !== 'final'"
        class="flex items-center justify-center rounded-lg"
        :class="[plusColSpanClass, bothPresent ? '' : 'border border-dashed border-gray-300']"
      >
        <button
          type="button"
          class="text-xl font-semibold"
          :class="bothPresent ? 'text-gray-400 cursor-default' : 'text-blue-600 hover:text-blue-700 cursor-pointer'"
          :disabled="bothPresent"
          @click="variant = 'general'"
        >
          +
        </button>
      </div>

      <div v-if="showCritical" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-sm">幹員(Logos／艾麗妮)</span>
          <button
            type="button"
            class="w-5 h-5 flex items-center justify-center rounded-full border border-red-300 text-xs leading-none text-red-500 hover:border-red-500 hover:text-red-700 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            :disabled="variant !== 'general'"
            @click="variant = 'base'"
          >
            -
          </button>
        </div>
        <p v-if="triggersNextHalving" class="text-sm text-green-600">(陪滿 5 小時，下一階段所需工時將減半)</p>
        <select v-model="criticalOperatorId" class="px-2.5 py-1.5 border border-gray-300 rounded">
          <option value="">請選擇</option>
          <option v-for="c in criticalCandidates" :key="c.id" :value="c.id">
            {{ c.codeName }}(+{{ c.realEfficiency }}%)
          </option>
        </select>

        <p v-if="!criticalOperatorId" class="text-sm text-gray-500">
          訓練時間：---(請先選擇幹員)
        </p>
        <template v-else>
          <p v-if="isCriticalOnly" class="font-bold">
            訓練時間：<span class="text-blue-600">
              {{ criticalOnlyDurationHours != null ? formatHoursAsHm(criticalOnlyDurationHours) : '不需要' }}
            </span>
          </p>
          <template v-else>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-semibold">訓練時間(下限 5 小時，預設含 5 分鐘操作緩衝)</span>
              <span class="flex items-center gap-1">
                <input
                  v-model.number="criticalHours"
                  type="number"
                  min="0"
                  class="w-16 px-1.5 py-1 border border-gray-300 rounded"
                >
                小時
                <input
                  v-model.number="criticalMinutes"
                  type="number"
                  min="0"
                  max="55"
                  step="5"
                  class="w-16 px-1.5 py-1 border border-gray-300 rounded"
                >
                分
              </span>
            </label>
            <p v-if="isCriticalDurationClamped" class="text-sm text-amber-600">
              已達上限，超過會讓 critical 幹員單獨補滿所需工時，實際計算已自動改用
              {{ formatHoursAsHm(effectiveCriticalDurationHours) }}。
            </p>
          </template>
        </template>
      </div>
    </div>

    <button
      v-if="variant !== 'final'"
      type="button"
      class="self-end px-4 py-2 rounded bg-blue-600 text-white font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
      :disabled="!canAdvance"
      @click="emit('advance')"
    >
      前往下一階段
    </button>
  </section>
</template>
