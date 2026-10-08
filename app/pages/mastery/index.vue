<script setup lang="ts">
import type { OperatorProfession, SkillPhase } from '#shared/types/support-operator'

const selectedProfession = ref<OperatorProfession | undefined>(undefined)
const selectedSkillPhase = ref<SkillPhase>(1)

watch(selectedProfession, () => {
  selectedSkillPhase.value = 1
})

const activeTab = ref<'auto' | 'manual'>('auto')

const TABS = [
  { value: 'auto', label: '自動建議排程' },
  { value: 'manual', label: '手動模擬排程' },
] as const
</script>

<template>
  <div class="flex flex-col gap-9 max-w-[64rem] mx-auto px-4 sm:px-6 py-10">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-display text-3xl font-bold tracking-[0.06em]">幹員專精試算</h1>
      <UiHudTag label="OP_MASTERY" />
    </div>

    <section class="flex flex-col gap-3.5">
      <UiHudTag label="MODULE_01 / 幹員職業" class="self-start" />
      <MasteryProfessionSelect
        v-model:selected-profession="selectedProfession"
      />
    </section>

    <section class="flex flex-col gap-3.5">
      <UiHudTag label="MODULE_02 / 排程模式" class="self-start" />
      <div role="tablist" aria-label="排程模式" class="flex flex-wrap gap-2.5">
        <div
          v-for="tab in TABS"
          :key="tab.value"
          class="flex flex-col"
          :class="activeTab === tab.value ? 'drop-shadow-glow-pick' : 'hover:drop-shadow-glow-data'"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.value"
            class="notch-sm hud-focus px-5 py-2.5 border font-display text-[15px] tracking-[0.08em] transition-colors"
            :class="activeTab === tab.value
              ? 'bg-surface-1 border-pick text-pick font-bold'
              : 'border-rule text-ink-soft hover:border-data hover:text-data'"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
          <span class="h-0.5" :class="activeTab === tab.value ? 'bg-pick' : 'bg-transparent'" />
        </div>
      </div>
      <div class="h-px bg-rule" />
    </section>

    <KeepAlive>
      <MasteryAutoPlanTab
        v-if="activeTab === 'auto'"
        :selected-profession="selectedProfession"
        v-model:selected-skill-phase="selectedSkillPhase"
      />
      <MasteryManualPlanTab
        v-else
        :selected-profession="selectedProfession"
        v-model:selected-skill-phase="selectedSkillPhase"
      />
    </KeepAlive>
  </div>
</template>
