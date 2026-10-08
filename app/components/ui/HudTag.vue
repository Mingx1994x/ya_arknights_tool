<script setup lang="ts">
/**
 * HUD 區塊標籤，例如 `[ MODULE_01 / 幹員職業 ]`。
 * 標籤必須帶真實資訊（模組編號＋中文區塊名），不做純裝飾的 eyebrow label。
 */
defineProps<{ label: string }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 border border-data px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-data"
  >
    <span aria-hidden="true">[</span>
    <span>{{ label }}</span>
    <span aria-hidden="true">]</span>
  </span>
</template>
