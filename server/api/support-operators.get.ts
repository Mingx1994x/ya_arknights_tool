import type {
  ArknightsClass,
  SkillPhase,
} from '#shared/types/support-operator';
import { getSupportOperators } from '../utils/support-operators.data';

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
 * GET /api/support-operators?class=狙擊&skill=3
 *
 * - 不帶 class：不做職業篩選。
 * - 帶 class：只保留 targetProfession 包含該職業的幹員。
 * - skill 類幹員必須 targetPhase 命中 targetSkill 才保留，否則整筆濾除（不帶 skill 時 skill 類一律濾除）；
 *   非 skill 類（critical/specific/general）不受此限制。
 * - 篩選後依 baseEfficiency + conditionEfficiency 由高到低排序回傳。
 */
export default defineEventHandler(async (event) => {
  const supportOperators = await getSupportOperators();

  const query = getQuery(event);
  const { class: operatorProfession, skill: operatorSkill } = query;

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

  let targetSkill: SkillPhase | undefined;
  if (typeof operatorSkill === 'string' && operatorSkill.length > 0) {
    const parsed = Number(operatorSkill);
    if (!VALID_SKILLS.includes(parsed as (typeof VALID_SKILLS)[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的 skill 參數："${operatorSkill}"，須為 1/2/3 其中之一`,
      });
    }
    targetSkill = parsed as SkillPhase;
  }

  const filteredData = supportOperators.filter((operator) => {
    if (targetClass && !operator.targetProfession.includes(targetClass)) {
      return false;
    }
    if (operator.category === 'skill' && operator.targetPhase !== targetSkill) {
      return false;
    }
    return true;
  });

  const sortedData = filteredData
    .slice()
    .sort(
      (a, b) =>
        b.baseEfficiency + b.conditionEfficiency - (a.baseEfficiency + a.conditionEfficiency),
    );

  return { data: sortedData };
});
