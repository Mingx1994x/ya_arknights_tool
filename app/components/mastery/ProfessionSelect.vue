<script setup lang="ts">
import type { OperatorProfession } from '#shared/types/support-operator'

const OPERATOR_PROFESSIONS: OperatorProfession[] = ['先鋒', '近衛', '重裝', '狙擊', '術師', '醫療', '輔助', '特種']

const selectedProfession = defineModel<OperatorProfession | undefined>('selectedProfession')

const tiles = ref<HTMLButtonElement[]>([])

/**
 * Roving tabindex：整組磚在 Tab 序列裡只佔一站，組內改用方向鍵移動。
 * 還沒選過時落在第一顆。
 */
const focusIndex = computed(() => {
  const index = OPERATOR_PROFESSIONS.indexOf(selectedProfession.value as OperatorProfession)
  return index === -1 ? 0 : index
})

/** radiogroup 的慣例是方向鍵同時移動焦點與變更選取，跟原本的 select 行為一致 */
function moveSelection(delta: number) {
  const next = (focusIndex.value + delta + OPERATOR_PROFESSIONS.length) % OPERATOR_PROFESSIONS.length
  selectedProfession.value = OPERATOR_PROFESSIONS[next]
  nextTick(() => tiles.value[next]?.focus())
}
</script>

<template>
  <div
    role="radiogroup"
    aria-label="幹員職業"
    class="flex md:grid md:grid-cols-8 gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory md:overflow-visible md:snap-none"
  >
    <div
      v-for="(profession, index) in OPERATOR_PROFESSIONS"
      :key="profession"
      class="shrink-0 w-24 snap-start md:w-full"
      :class="selectedProfession === profession ? 'drop-shadow-glow-pick' : 'hover:drop-shadow-glow-data'"
    >
      <button
        ref="tiles"
        type="button"
        role="radio"
        :aria-checked="selectedProfession === profession"
        :tabindex="index === focusIndex ? 0 : -1"
        class="notch-sm hud-focus w-full h-12 border font-display text-[17px] tracking-[0.08em] transition-colors cursor-pointer"
        :class="selectedProfession === profession
          ? 'bg-surface-2 border-pick text-pick font-bold'
          : 'bg-surface-1 border-ink-mute text-ink-soft hover:border-data hover:text-data'"
        @click="selectedProfession = profession"
        @keydown.left.prevent="moveSelection(-1)"
        @keydown.up.prevent="moveSelection(-1)"
        @keydown.right.prevent="moveSelection(1)"
        @keydown.down.prevent="moveSelection(1)"
      >
        {{ profession }}
      </button>
    </div>
  </div>
</template>
