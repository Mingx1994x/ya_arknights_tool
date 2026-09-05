import type {
  ArknightsClass,
  SkillPhase,
} from '#shared/types/support-operator';
import { getSupportOperators } from '../utils/support-operators.data';
import { resolveCandidatesByPhase } from '../utils/support-operator-candidates';

const VALID_CLASSES: ArknightsClass[] = [
  '先鋒',
  '近衛',
  '重裝',
  '狙擊',
  '術師',
  '醫療',
  '輔助',
  '特種',
];

const VALID_SKILLS = [1, 2, 3] as const;

/**
 * GET /api/support-operators?class=狙擊&fromSkill=2
 *
 * - 不帶 class：不做職業篩選；帶 class：只保留 targetProfession 包含該職業的幹員。
 * - fromSkill 代表「起始階段」，缺省預設為 1；回傳範圍是 fromSkill → 專精三，
 *   依階段分組，每組各自依現有規則篩選（skill 類必須 targetPhase 命中該組階段；
 *   critical/specific/general 不限階段，每組都會出現）並算 realEfficiency = baseEfficiency +
 *   conditionEfficiency（critical 類別的 5hr 生效條件尚未套用，見 docs/domain/arknights_tools_init.md
 *   第 9 節），組內依此由高到低排序。
 * - 回應：{ data: SupportOperatorPhaseGroup[] }，依 phase 升冪排列。
 */
export default defineEventHandler(async (event) => {
  const supportOperators = await getSupportOperators();

  const query = getQuery(event);
  const { class: operatorProfession, fromSkill: rawFromSkill } = query;

  let targetClass: ArknightsClass | undefined;
  if (typeof operatorProfession === 'string' && operatorProfession.length > 0) {
    if (!VALID_CLASSES.includes(operatorProfession as ArknightsClass)) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的 class 參數："${operatorProfession}"，須為 ${VALID_CLASSES.join('/')} 其中之一`,
      });
    }
    targetClass = operatorProfession as ArknightsClass;
  }

  let fromPhase: SkillPhase = 1;
  if (typeof rawFromSkill === 'string' && rawFromSkill.length > 0) {
    const parsed = Number(rawFromSkill);
    if (!VALID_SKILLS.includes(parsed as (typeof VALID_SKILLS)[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的 fromSkill 參數："${rawFromSkill}"，須為 1/2/3 其中之一`,
      });
    }
    fromPhase = parsed as SkillPhase;
  }

  const data = resolveCandidatesByPhase(supportOperators, targetClass, fromPhase);

  return { data };
});
