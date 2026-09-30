<script setup lang="ts">
/**
 * 切角面板外殼。`CompletionTimeCard`／`StageCard`／`StageForm` 原本各自寫一份
 * `p-4 border rounded-lg`，抽出來才不會改一處漏兩處。
 */
withDefaults(
  defineProps<{
    /** 邊框語意色：`default` 一般、`ok` 減半生效、`data` 資料強調 */
    tone?: 'default' | 'ok' | 'data'
    /** 是否發光。全站同時最多出現一到兩處（完成時間卡固定發光，減半階段卡是狀態） */
    glow?: boolean
  }>(),
  { tone: 'default', glow: false },
)

const BORDER_BY_TONE = {
  default: 'border-ink-mute',
  ok: 'border-ok',
  data: 'border-data',
} as const

/**
 * glow 掛在外層 wrapper 而不是切角元素本身：CSS 的算繪順序是 filter → clip-path，
 * 同一個元素上的陰影會連同切角一起被裁掉；由未切角的父層套 drop-shadow，濾鏡才會
 * 沿著子元素裁切後的輪廓生效。
 */
const GLOW_BY_TONE = {
  default: 'drop-shadow-glow-data',
  ok: 'drop-shadow-glow-ok',
  data: 'drop-shadow-glow-data',
} as const

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div :class="glow ? GLOW_BY_TONE[tone] : ''">
    <section v-bind="$attrs" class="notch-lg border bg-surface-1 p-5" :class="BORDER_BY_TONE[tone]">
      <slot />
    </section>
  </div>
</template>
