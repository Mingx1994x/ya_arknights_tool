<script setup lang="ts">
import { formatClockTime } from '~/utils/mastery'

const props = defineProps<{
  /**
   * 目前這份排程（Tab A 完整建議／Tab B 已鎖定階段＋目前編輯階段）剩餘所需的陪同時間，單位分鐘；
   * `null` 代表還沒有足夠資訊可以估算（例如尚未選擇職業），此時只顯示「現在時間」，
   * 「大約完成時間」維持 `--:--`，不會用無意義的數字（例如 0）算出一個看似正常的完成時間。
   */
  remainingMinutes: number | null
}>()

/**
 * 「現在時間」不需要 `remainingMinutes` 就能算，跟「大約完成時間」分開兩個獨立的 ref，
 * 兩者沒有值時各自顯示 `--:--`。兩者的更新時機分兩種：
 * - `remainingMinutes` 本身變成新的有意義數字（例如換職業、換起始階段，代表排程本身變了）：
 *   直接反映新的完成時間，不需要使用者額外操作。
 * - 排程沒變、只是擱置太久導致「現在時間」過期：使用者按「重新整理」手動更新。
 * 兩種情境都呼叫同一個 `refresh()`，差別只在觸發來源。
 */
const now = ref<Date | null>(null)
const completionAt = ref<Date | null>(null)

function refresh() {
  now.value = new Date()
  if (props.remainingMinutes != null) {
    completionAt.value = new Date(now.value.getTime() + props.remainingMinutes * 60_000)
  }
}

onMounted(refresh)

watch(
  () => props.remainingMinutes,
  (value) => {
    if (value != null) {
      refresh()
    } else {
      // 排程被重置（例如 ManualPlanTab.vue 換職業／起始階段時整個清空重來），回到
      // 「還沒有可估算的資料」狀態，completionAt 要一起清空，不能留著換職業前的舊快照。
      completionAt.value = null
    }
  },
)
</script>

<template>
  <!-- hover 才發光：跟幹員職業磚的「選定後常態發光」對調，這裡改成互動回饋而非常態狀態 -->
  <UiHudPanel tone="data" glow-on-hover class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex flex-col gap-0.5">
        <p class="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-soft">NOW 現在時間</p>
        <!-- key 綁在時間戳上：值一換就重建節點，讓 hud-flash 動畫重播一次 -->
        <p :key="now?.getTime() ?? 'idle'" class="font-mono text-lg font-bold text-ink animate-hud-flash">
          {{ now ? formatClockTime(now) : '--:--' }}
        </p>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-5 h-5 text-ink-mute shrink-0"
        aria-hidden="true"
      >
        <polyline points="7 5 14 12 7 19" />
        <polyline points="13 5 20 12 13 19" />
      </svg>
      <div class="flex flex-col gap-0.5">
        <p class="font-mono text-[10px] font-bold tracking-[0.18em] text-ink-soft">ETA 大約完成時間</p>
        <p
          :key="completionAt?.getTime() ?? 'idle'"
          class="font-mono text-lg font-bold text-data animate-hud-flash"
        >
          {{ completionAt ? formatClockTime(completionAt) : '--:--' }}
        </p>
      </div>
    </div>
    <button
      type="button"
      class="notch-sm hud-focus p-2 border border-ink-mute text-ink-soft transition-colors hover:border-data hover:text-data cursor-pointer"
      aria-label="重新整理"
      title="重新整理"
      @click="refresh"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-4 h-4"
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  </UiHudPanel>
</template>
