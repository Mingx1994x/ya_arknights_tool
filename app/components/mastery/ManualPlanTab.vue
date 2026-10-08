<script setup lang="ts">
import type { OperatorProfession, SkillPhase, SupportOperatorCategory } from '#shared/types/support-operator'
import {
  CRITICAL_DEFAULT_DURATION_MINUTES,
  baseCompanionStage,
  calcDurationForWork,
  criticalCompanionStage,
  generalCompanionStage,
  getRequiredWork,
  normalizeCriticalDurationInput,
} from '~/utils/mastery'

const props = defineProps<{
  selectedProfession?: OperatorProfession
}>()

const startStage = defineModel<SkillPhase>('selectedSkillPhase', { default: 1 })

const professionRef = toRef(props, 'selectedProfession')

/** 目前正在編輯的階段：初始等於起始階段，靠「前往下一階段」前進；改動起始階段或職業會重置回起始階段。 */
const currentStage = ref<SkillPhase>(startStage.value)

const { data: groups, pending, error } = useSupportOperators(professionRef, currentStage)

const STAGE_LABELS: Record<SkillPhase, string> = { 1: '專精一', 2: '專精二', 3: '專精三' }

/** groups[0] 必為目前 currentStage（API 以 currentStage.value 當 fromSkill，回傳陣列第一筆即該階段）。 */
const currentStageCandidates = computed(() => groups.value[0]?.candidates ?? [])
const criticalCandidates = computed(() => groups.value[0]?.criticalCandidates ?? [])
const otherCandidates = computed(() => currentStageCandidates.value.filter((c) => c.category !== 'critical'))

type StageVariant = 'general' | 'base' | 'critical' | 'final'

type StagePlanState = {
  variant: StageVariant
  criticalOperatorId: string
  criticalHours: number
  criticalMinutes: number
  otherOperatorId: string
}

function createDefaultPlanState(phase: SkillPhase): StagePlanState {
  return {
    variant: phase === 3 ? 'final' : 'general',
    criticalOperatorId: '',
    criticalHours: Math.floor(CRITICAL_DEFAULT_DURATION_MINUTES / 60),
    criticalMinutes: CRITICAL_DEFAULT_DURATION_MINUTES % 60,
    otherOperatorId: '',
  }
}

const planByStage = reactive<Record<SkillPhase, StagePlanState>>({
  1: createDefaultPlanState(1),
  2: createDefaultPlanState(2),
  3: createDefaultPlanState(3),
})

const currentState = computed(() => planByStage[currentStage.value])

/**
 * variant 為 final（專精三，結構性沒有 critical 選項）時，陪練幹員候選改用整份未分類候選清單；
 * 其餘情境（含使用者在專精一／二把 critical 暫時移除的 base）都要排除 critical 類別，
 * 因為 critical 有自己獨立的選單，且 + 隨時可能把它加回來，兩份候選池要保持分開。
 */
const otherOperatorPool = computed(() =>
  currentState.value.variant === 'final' ? currentStageCandidates.value : otherCandidates.value,
)

type LockedStageResult = {
  phase: SkillPhase
  requiredWork: number
  /** 該階段的 requiredWork 是否已套用跨階段減半，對應 MasteryStageCard 的 isHalved。 */
  isHalved: boolean
  triggersNextHalving: boolean
  critical?: { codeName: string; efficiencyPercent: number; durationMinutes: number; work: number }
  other?: {
    codeName: string
    efficiencyPercent: number
    durationMinutes: number | null
    category: SupportOperatorCategory
    memo?: string
  }
}

/** 依鎖定階段實際安排的幹員組合，換算成 MasteryStageCard 的顯示形式。 */
function getLockedVariant(locked: LockedStageResult): 'general' | 'base' | 'critical' {
  if (locked.critical && locked.other) return 'general'
  if (locked.critical) return 'critical'
  return 'base'
}

/**
 * 已完成並鎖定的階段結果（唯讀摘要），key 為階段編號。
 * 目前刻意設計成不可回頭編輯：改動起始階段或職業會整個清空重來（見 domain 文件第 9 節待辦：
 * 之後要支援「點卡片回頭調整」時，只有 critical 幹員陪同時長跨過 5hr 門檻、
 * 使 `triggersNextHalving` 改變時才需要連動清空/重算後面已鎖定的階段）。
 */
const lockedStages = reactive<Partial<Record<SkillPhase, LockedStageResult>>>({})

/** 由新到舊排序（phase 3 → 1），讓最近鎖定的階段緊接在目前編輯中的階段下方。 */
const lockedStageList = computed(() =>
  ([1, 2, 3] as SkillPhase[])
    .map((phase) => lockedStages[phase])
    .filter((result): result is LockedStageResult => result != null)
    .reverse(),
)

/**
 * 當前編輯階段是否已套用跨階段減半；起始階段宣告式視為未觸發（跟 AutoPlanTab 一致）。
 * 在 `advanceToNextStage` 推進的當下直接寫入下一階段的值，讀取端不用反查 `lockedStages`。
 */
const isCurrentStageHalved = ref(false)

function resetProgress() {
  currentStage.value = startStage.value
  isCurrentStageHalved.value = false
  for (const phase of [1, 2, 3] as SkillPhase[]) {
    delete lockedStages[phase]
    Object.assign(planByStage[phase], createDefaultPlanState(phase))
  }
}

watch([startStage, professionRef], resetProgress)

/**
 * 該階段所需工作量：依「上一階段實際鎖定的 triggersNextHalving」決定，
 * 而非固定假設一定減半（見領域文件第 9 節）。
 */
const requiredWork = computed(() => getRequiredWork(currentStage.value, isCurrentStageHalved.value))

const criticalOperator = computed(() =>
  criticalCandidates.value.find((c) => c.id === currentState.value.criticalOperatorId),
)
const otherOperator = computed(() =>
  otherOperatorPool.value.find((c) => c.id === currentState.value.otherOperatorId),
)

/**
 * 使用者輸入的「時」／「分」正規化結果：驗證規則統一收斂在 `normalizeCriticalDurationInput`（純函式，
 * 附單元測試），避免「換算成分鐘」與「判斷輸入是否超出合理範圍」這兩處各自重複定義同一組規則、
 * 之後改規則卻只改到一處的風險。
 */
const normalizedCriticalInput = computed(() =>
  normalizeCriticalDurationInput(currentState.value.criticalHours, currentState.value.criticalMinutes),
)
const rawCriticalDurationMinutes = computed(() => normalizedCriticalInput.value.minutes)
/** 跟 `isCriticalDurationClamped`（換算後超過本階段所需工時上限）是兩種不同原因，UI 顯示不同提示文字。 */
const isCriticalInputInvalid = computed(() => normalizedCriticalInput.value.isInvalid)

/** critical 幹員陪同時長上限：超過會讓 criticalWork 超過 RequiredWork(N)，正常遊戲數值不會需要用到，僅供輸入防呆。 */
const maxCriticalDurationMinutes = computed(() => {
  if (!criticalOperator.value) return null
  return calcDurationForWork(requiredWork.value, criticalOperator.value.realEfficiency)
})

const isCriticalDurationClamped = computed(
  () => maxCriticalDurationMinutes.value !== null && rawCriticalDurationMinutes.value > maxCriticalDurationMinutes.value,
)

const effectiveCriticalDurationMinutes = computed(() =>
  maxCriticalDurationMinutes.value !== null
    ? Math.min(rawCriticalDurationMinutes.value, maxCriticalDurationMinutes.value)
    : rawCriticalDurationMinutes.value,
)

/** variant 為 general：critical 幹員 + 另一位陪練幹員的組合結果。 */
const criticalPlan = computed(() => {
  if (currentState.value.variant !== 'general' || !criticalOperator.value) return null
  return generalCompanionStage(
    requiredWork.value,
    effectiveCriticalDurationMinutes.value,
    criticalOperator.value.realEfficiency,
    otherOperator.value?.realEfficiency ?? 0,
  )
})

/** variant 為 base／final：單一陪練幹員需要的陪同時長，直接反推、沒有 critical 分攤。 */
const soloCompanionDurationMinutes = computed(() => {
  if (currentState.value.variant !== 'base' && currentState.value.variant !== 'final') return null
  if (!otherOperator.value) return null
  return baseCompanionStage(requiredWork.value, otherOperator.value.realEfficiency).operatorDurationMinutes
})

/** variant 為 critical：陪練幹員被移除，critical 幹員必須單獨補滿所需工時，直接反推、不透過輸入框調整。 */
const soloCriticalPlan = computed(() => {
  if (currentState.value.variant !== 'critical' || !criticalOperator.value) return null
  return criticalCompanionStage(requiredWork.value, criticalOperator.value.realEfficiency)
})

const soloCriticalDurationMinutes = computed(() => soloCriticalPlan.value?.operatorDurationMinutes ?? null)

/** 陪練幹員實際顯示的建議陪同時長：依 variant 決定資料來源。 */
const companionDurationMinutes = computed(() => {
  if (currentState.value.variant === 'general') return criticalPlan.value?.otherOperatorDurationMinutes ?? null
  return soloCompanionDurationMinutes.value
})

/**
 * critical 幹員是否觸發下一階段減半：base／final 沒有 critical 恆不觸發；
 * critical 單獨頂位時看反推出來的時長是否達門檻；general 時看使用者實際輸入的陪同時長。
 */
const triggersNextHalving = computed(() => {
  if (currentState.value.variant === 'general') return criticalPlan.value?.triggersNextHalving ?? false
  if (currentState.value.variant === 'critical') return soloCriticalPlan.value?.triggersNextHalving ?? false
  return false
})

/** 目前階段是否已排出完整可用的排程。 */
const isCurrentStagePlanComplete = computed(() => {
  if (currentState.value.variant === 'final' || currentState.value.variant === 'base') {
    return soloCompanionDurationMinutes.value != null
  }
  if (currentState.value.variant === 'critical') {
    return soloCriticalDurationMinutes.value != null
  }
  if (!criticalPlan.value) return false
  return criticalPlan.value.otherOperatorDurationMinutes === null || !!otherOperator.value
})

const canAdvance = computed(() => currentStage.value < 3 && isCurrentStagePlanComplete.value)

function buildLockedCriticalInfo(): LockedStageResult['critical'] {
  if (currentState.value.variant === 'general' && criticalOperator.value && criticalPlan.value) {
    return {
      codeName: criticalOperator.value.codeName,
      efficiencyPercent: criticalOperator.value.realEfficiency,
      durationMinutes: effectiveCriticalDurationMinutes.value,
      work: criticalPlan.value.criticalWork,
    }
  }
  if (
    currentState.value.variant === 'critical' &&
    criticalOperator.value &&
    soloCriticalDurationMinutes.value != null
  ) {
    return {
      codeName: criticalOperator.value.codeName,
      efficiencyPercent: criticalOperator.value.realEfficiency,
      durationMinutes: soloCriticalDurationMinutes.value,
      work: requiredWork.value,
    }
  }
  return undefined
}

function advanceToNextStage() {
  if (!canAdvance.value) return

  const phase = currentStage.value
  lockedStages[phase] = {
    phase,
    requiredWork: requiredWork.value,
    isHalved: isCurrentStageHalved.value,
    triggersNextHalving: triggersNextHalving.value,
    critical: buildLockedCriticalInfo(),
    other: otherOperator.value
      ? {
          codeName: otherOperator.value.codeName,
          efficiencyPercent: otherOperator.value.realEfficiency,
          durationMinutes: companionDurationMinutes.value,
          category: otherOperator.value.category,
          memo: otherOperator.value.memo,
        }
      : undefined,
  }
  // 把剛完成階段的觸發結果帶到下一階段，讀取端不用反查 lockedStages。
  isCurrentStageHalved.value = triggersNextHalving.value
  currentStage.value = (phase + 1) as SkillPhase
}

/**
 * 專精三沒有「前往下一階段」可以觸發鎖定（`canAdvance` 要求 `currentStage.value < 3`），
 * 一般階段那套「按下前往下一階段才算數」的規則在專精三永遠不會發生，若不特別處理，
 * 專精三的陪同時間會永遠被排除在 `remainingMinutes` 之外。專精三的 `variant` 固定是 `final`，
 * 只有一個陪練幹員下拉選單可選、沒有連續輸入的欄位（不像 general 的 critical 時／分輸入框），
 * 所以用「本階段是否已排出完整排程」（`isCurrentStagePlanComplete`）當作等同鎖定的訊號是安全的：
 * 選定陪練幹員後時長就固定下來，不會有「打字打到一半被算進去」的問題。
 */
const currentPhaseDurationIfFinal = computed(() =>
  currentStage.value === 3 && isCurrentStagePlanComplete.value ? (soloCompanionDurationMinutes.value ?? 0) : 0,
)

/**
 * 剩餘所需的陪同時間：加總「已鎖定階段」的實際陪同時間，再加上專精三（若已排出完整排程，見上）；
 * 專精一、二正在編輯、尚未鎖定的階段不計入——目前階段還在調整（換陪練幹員、改 critical 陪同時長）時
 * 數字本來就會一直變動，若也算進去，`MasteryCompletionTimeCard` 會跟著每次輸入變動自動重算，
 * 這正是當初改成「快照＋手動重新整理」設計想避免的情境；改成只看已鎖定階段後，
 * 「大約完成時間」只在按下「前往下一階段」真正鎖定一個階段（或專精三排完）時才會自動更新一次。
 * 尚未選擇職業、查詢中、查詢失敗，或還沒有任何可計入的階段時回傳 `null`（顯示 `--:--`）——
 * 職業選了但什麼都還沒鎖定時，總和會是 0，等同「現在＝完成」，容易誤導成「已經規劃完成」，
 * 所以「還沒有任何可計入的階段」也視為還沒有可估算的資料。
 */
const remainingMinutes = computed(() => {
  if (!props.selectedProfession || pending.value || error.value) return null
  if (lockedStageList.value.length === 0 && currentPhaseDurationIfFinal.value === 0) return null
  return (
    lockedStageList.value.reduce(
      (total, locked) => total + (locked.critical?.durationMinutes ?? 0) + (locked.other?.durationMinutes ?? 0),
      0,
    ) + currentPhaseDurationIfFinal.value
  )
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <label class="flex flex-col gap-1.5 text-sm w-40">
        <span class="font-mono text-[11px] font-bold tracking-[0.16em] text-ink-mute">起始階段</span>
        <select
          v-model.number="startStage"
          :disabled="!props.selectedProfession"
          class="hud-field hud-select w-full px-2.5 py-1.5 disabled:border-ink-mute disabled:bg-transparent disabled:text-ink-mute disabled:cursor-not-allowed"
        >
          <option :value="1">專精一</option>
          <option :value="2">專精二</option>
          <option :value="3">專精三</option>
        </select>
      </label>

      <MasteryCompletionTimeCard :remaining-minutes="remainingMinutes" />
    </div>

    <p v-if="!props.selectedProfession" class="text-ink-soft">
      請先選擇幹員職業以取得候選幹員清單。
    </p>
    <template v-else>
      <p v-if="pending" class="text-ink-soft">候選幹員查詢中…</p>
      <p v-else-if="error" class="text-danger">
        候選幹員查詢失敗，請稍後再試。
      </p>

      <MasteryStageForm
        v-else
        v-model:variant="currentState.variant"
        v-model:companion-operator-id="currentState.otherOperatorId"
        v-model:critical-operator-id="currentState.criticalOperatorId"
        v-model:critical-hours="currentState.criticalHours"
        v-model:critical-minutes="currentState.criticalMinutes"
        :title="STAGE_LABELS[currentStage]"
        :phase="currentStage"
        :required-work-minutes="requiredWork"
        :is-halved="isCurrentStageHalved"
        :companion-candidates="otherOperatorPool"
        :critical-candidates="criticalCandidates"
        :companion-duration-minutes="companionDurationMinutes"
        :companion-category="otherOperator?.category"
        :companion-memo="otherOperator?.memo"
        :critical-only-duration-minutes="soloCriticalDurationMinutes"
        :triggers-next-halving="triggersNextHalving"
        :is-critical-input-invalid="isCriticalInputInvalid"
        :is-critical-duration-clamped="isCriticalDurationClamped"
        :effective-critical-duration-minutes="effectiveCriticalDurationMinutes"
        :can-advance="canAdvance"
        @advance="advanceToNextStage"
      />

      <MasteryStageCard
        v-for="locked in lockedStageList"
        :key="locked.phase"
        :title="`${STAGE_LABELS[locked.phase]}（已完成）`"
        :phase="locked.phase"
        :required-work-minutes="locked.requiredWork"
        :is-halved="locked.isHalved"
        :variant="getLockedVariant(locked)"
        :companion-code-name="locked.other?.codeName"
        :companion-efficiency-percent="locked.other?.efficiencyPercent"
        :companion-duration-minutes="locked.other?.durationMinutes ?? 0"
        :companion-category="locked.other?.category"
        :companion-memo="locked.other?.memo"
        :critical-code-name="locked.critical?.codeName"
        :critical-efficiency-percent="locked.critical?.efficiencyPercent"
        :critical-duration-minutes="locked.critical?.durationMinutes"
        :critical-memo="locked.triggersNextHalving ? '陪滿 5 小時，下一階段所需工作量已減半' : undefined"
      />
    </template>
  </div>
</template>
