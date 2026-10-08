<template>
  <div class="flex flex-col gap-6 max-w-[64rem] mx-auto px-4 sm:px-6 py-16">
    <UiHudTag label="INDEX / 工具索引" class="self-start" />
    <h1 class="font-display text-4xl font-bold tracking-[0.06em]">羅德島訓練終端</h1>
    <p class="text-ink-soft max-w-[48ch]">
      明日方舟玩家輔助工具。目前開放幹員專精試算。
    </p>

    <NuxtLink
      to="/mastery"
      class="notch-lg hud-focus block w-full max-w-md border border-ink-mute bg-surface-1 p-5 transition-colors hover:border-data"
    >
      <span class="font-mono text-[11px] font-bold tracking-[0.2em] text-ink-mute">OP_MASTERY</span>
      <span class="block mt-2 font-display text-xl font-bold tracking-[0.08em]">幹員專精試算</span>
      <span class="block mt-1 text-sm text-ink-soft">算出專精一到三各要陪多久、大約幾點會練完。</span>
    </NuxtLink>
  </div>
</template>
