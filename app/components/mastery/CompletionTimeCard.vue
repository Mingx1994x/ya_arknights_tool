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
  <section class="p-4 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
    <div class="flex flex-wrap gap-6">
      <div>
        <p class="text-gray-500 text-sm">現在時間</p>
        <p class="font-semibold">{{ now ? formatClockTime(now) : '--:--' }}</p>
      </div>
      <div>
        <p class="text-gray-500 text-sm">大約完成時間</p>
        <p class="font-semibold text-blue-600">{{ completionAt ? formatClockTime(completionAt) : '--:--' }}</p>
      </div>
    </div>
    <button
      type="button"
      class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
      @click="refresh"
    >
      重新整理
    </button>
  </section>
</template>
