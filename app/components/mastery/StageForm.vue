<script setup lang="ts">
import type { SupportOperator, SupportOperatorCategory } from '#shared/types/support-operator'

const props = withDefaults(
  defineProps<{
    title: string
    /** 專精階段序號（1／2／3），顯示成 01／02／03 的 HUD 序號標，跟 StageCard 同一套 */
    phase?: number
    requiredWorkMinutes: number
    /** 該階段的所需工時是否已套用跨階段減半，跟 StageCard 的 isHalved 同一套規則 */
    isHalved?: boolean
    /** 陪練幹員候選清單（variant 為 final 時是整份未分類候選，其餘情境已排除 critical 類別，見父層 otherOperatorPool） */
    companionCandidates?: SupportOperator[]
    /** critical 幹員候選清單（Logos／艾麗妮） */
    criticalCandidates?: SupportOperator[]
    /** 陪練幹員反推出的建議陪同時間（分鐘）；null 代表「不需要」（critical 已經補滿或整段還沒得算） */
    companionDurationMinutes?: number | null
    /** 陪練幹員類別，只有 `specific`（例如烏爾比安的宿舍搭配條件）才會顯示 companionMemo */
    companionCategory?: SupportOperatorCategory
    /** 陪練幹員備註（資料表 memo 欄位），只有 companionCategory 為 specific 時才顯示 */
    companionMemo?: string
    /** critical 幹員被留成唯一區塊(variant === 'critical')時，反推出的直接計算結果（分鐘） */
    criticalOnlyDurationMinutes?: number | null
    /** critical 幹員陪同是否達到 5hr 門檻、觸發下一階段減半 */
    triggersNextHalving?: boolean
    /**
     * 使用者輸入的「時」／「分」字面值本身是否超出合理範圍（分不介於 0–59、時或分為負數），
     * 跟 `isCriticalDurationClamped` 是不同原因，各自顯示對應的提示文字，兩者互斥（優先顯示這個）。
     */
    isCriticalInputInvalid?: boolean
    /** critical 幹員陪同時長是否已達上限（超過會讓 critical 自己補滿所需工時） */
    isCriticalDurationClamped?: boolean
    /** 上限限制後實際套用的 critical 陪同時長（分鐘），isCriticalInputInvalid／isCriticalDurationClamped 為 true 時用來顯示提示文字 */
    effectiveCriticalDurationMinutes?: number
    /** 目前階段是否已經可以前往下一階段 */
    canAdvance?: boolean
  }>(),
  {
    isHalved: false,
    companionCandidates: () => [],
    criticalCandidates: () => [],
    companionDurationMinutes: null,
    criticalOnlyDurationMinutes: null,
    triggersNextHalving: false,
    isCriticalInputInvalid: false,
    isCriticalDurationClamped: false,
    effectiveCriticalDurationMinutes: 0,
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
  <UiHudPanel
    :tone="isHalved ? 'ok' : 'default'"
    :glow="isHalved"
    class="flex flex-col gap-4 @container"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
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
      <!-- 「編輯中」與「減半」是兩個獨立訊號：前者用 data 標籤，後者用 ok 邊框，不共用顏色 -->
      <UiHudTag label="EDITING / 編輯中" />
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
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-mute">陪練幹員</span>
          <button
            v-if="variant !== 'final'"
            type="button"
            class="hud-focus w-5 h-5 flex items-center justify-center rounded-full border border-danger text-xs leading-none text-danger transition-colors hover:bg-danger hover:text-surface-0 disabled:border-ink-mute disabled:bg-transparent disabled:text-ink-mute disabled:cursor-not-allowed"
            :disabled="variant !== 'general'"
            aria-label="移除陪練幹員"
            @click="variant = 'critical'"
          >
            −
          </button>
        </div>
        <p v-if="companionCategory === 'specific' && companionMemo" class="text-sm text-warn">
          ({{ companionMemo }})
        </p>
        <select v-model="companionOperatorId" class="hud-field hud-select px-2.5 py-1.5">
          <option value="">請選擇</option>
          <option v-for="c in companionCandidates" :key="c.id" :value="c.id">
            {{ c.codeName }}(+{{ c.realEfficiency }}%)
          </option>
        </select>
        <p v-if="!companionOperatorId" class="text-sm text-ink-soft">
          訓練時間：---(請先選擇幹員)
        </p>
        <p v-else class="flex items-baseline gap-1.5">
          <span class="text-ink-soft text-sm">訓練時間</span>
          <span class="font-mono font-bold text-data">
            {{ companionDurationMinutes != null ? formatMinutesAsHm(companionDurationMinutes) : '不需要' }}
          </span>
        </p>
      </div>

      <div
        v-if="variant !== 'final'"
        class="flex items-center justify-center"
        :class="[plusColSpanClass, bothPresent ? '' : 'notch-sm border border-dashed border-ink-mute']"
      >
        <button
          type="button"
          class="hud-focus font-display text-xl transition-colors"
          :class="bothPresent ? 'text-ink-mute cursor-default' : 'text-data hover:text-ink cursor-pointer'"
          :disabled="bothPresent"
          :aria-label="bothPresent ? '兩位幹員都已安排' : '加回幹員'"
          @click="variant = 'general'"
        >
          ＋
        </button>
      </div>

      <div v-if="showCritical" class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-mute">
            CRITICAL 幹員(Logos／艾麗妮)
          </span>
          <button
            type="button"
            class="hud-focus w-5 h-5 flex items-center justify-center rounded-full border border-danger text-xs leading-none text-danger transition-colors hover:bg-danger hover:text-surface-0 disabled:border-ink-mute disabled:bg-transparent disabled:text-ink-mute disabled:cursor-not-allowed"
            :disabled="variant !== 'general'"
            aria-label="移除 critical 幹員"
            @click="variant = 'base'"
          >
            −
          </button>
        </div>
        <p v-if="triggersNextHalving" class="text-sm text-ok">(陪滿 5 小時，下一階段所需工時將減半)</p>
        <select v-model="criticalOperatorId" class="hud-field hud-select px-2.5 py-1.5">
          <option value="">請選擇</option>
          <option v-for="c in criticalCandidates" :key="c.id" :value="c.id">
            {{ c.codeName }}(+{{ c.realEfficiency }}%)
          </option>
        </select>

        <p v-if="!criticalOperatorId" class="text-sm text-ink-soft">
          訓練時間：---(請先選擇幹員)
        </p>
        <template v-else>
          <p v-if="isCriticalOnly" class="flex items-baseline gap-1.5">
            <span class="text-ink-soft text-sm">訓練時間</span>
            <span class="font-mono font-bold text-data">
              {{ criticalOnlyDurationMinutes != null ? formatMinutesAsHm(criticalOnlyDurationMinutes) : '不需要' }}
            </span>
          </p>
          <template v-else>
            <label class="flex flex-col gap-1.5 text-sm">
              <span class="text-ink-soft">訓練時間(下限 5 小時，預設含 5 分鐘操作緩衝)</span>
              <span class="flex items-center gap-1.5">
                <input
                  v-model.number="criticalHours"
                  type="number"
                  min="0"
                  class="hud-field w-16 px-1.5 py-1 font-mono"
                >
                小時
                <input
                  v-model.number="criticalMinutes"
                  type="number"
                  min="0"
                  max="55"
                  step="5"
                  class="hud-field w-16 px-1.5 py-1 font-mono"
                >
                分
              </span>
            </label>
            <p v-if="isCriticalInputInvalid" class="text-sm text-warn">
              輸入格式有誤，實際計算已自動改用
              {{ formatMinutesAsHm(effectiveCriticalDurationMinutes) }}。
            </p>
            <p v-else-if="isCriticalDurationClamped" class="text-sm text-warn">
              已達工時上限，實際計算已自動改用
              {{ formatMinutesAsHm(effectiveCriticalDurationMinutes) }}。
            </p>
          </template>
        </template>
      </div>
    </div>

    <!-- glow 掛在外層：notch-sm 的 clip-path 會把按鈕自己的陰影一起裁掉 -->
    <div v-if="variant !== 'final'" class="self-end" :class="canAdvance ? 'drop-shadow-glow-brand' : ''">
      <button
        type="button"
        class="notch-sm hud-focus px-5 py-2.5 border-2 font-mono text-[13px] font-bold tracking-[0.18em] transition-colors"
        :class="canAdvance
          ? 'border-brand text-brand hover:bg-brand hover:text-surface-0'
          : 'border-ink-mute text-ink-mute cursor-not-allowed'"
        :disabled="!canAdvance"
        @click="emit('advance')"
      >
        前往下一階段
      </button>
    </div>
  </UiHudPanel>
</template>
