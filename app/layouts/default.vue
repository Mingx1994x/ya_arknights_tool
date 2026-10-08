<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-surface-1 border-b border-rule">
      <div class="max-w-[64rem] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-2.5 hud-focus">
          <span class="text-brand font-mono text-sm font-bold">◆</span>
          <span class="font-mono text-[13px] font-bold tracking-[0.2em] text-ink">YA // ARKNIGHTS TOOLS</span>
        </NuxtLink>

        <span class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-data" aria-hidden="true" />
          <span class="hidden sm:inline font-mono text-[11px] font-bold tracking-[0.2em] text-ink-soft">
            LINK ESTABLISHED
          </span>
        </span>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-rule">
      <div class="max-w-[64rem] mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-2">
        <span class="font-mono text-[11px] tracking-[0.18em] text-ink-mute">
          ya-arknights-tools · 非官方玩家工具
        </span>
        <span class="font-mono text-[11px] tracking-[0.18em] text-ink-mute">
          數值依據 docs/domain
        </span>
      </div>
    </footer>
  </div>
</template>
