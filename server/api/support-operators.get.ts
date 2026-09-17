import type {
  OperatorProfession,
  SkillPhase,
} from '#shared/types/support-operator';
import { getSupportOperators } from '../utils/support-operators.data';
import { resolveCandidatesByPhase } from '../utils/support-operator-candidates';

const VALID_CLASSES: OperatorProfession[] = [
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
 * - 不帶 class：不做職業篩選；帶 class：`general`／`skill` 只保留 targetProfession 包含
 *   該職業的幹員，`critical`／`specific` 不受職業篩選限制（見 docs/domain/arknights_tools_init.md
 *   第 9 節）。
 * - fromSkill 代表「起始階段」，缺省預設為 1；回傳範圍是 fromSkill → 專精三，
 *   依階段分組，每組各自依現有規則篩選（所有類別統一用 targetPhase 通用判斷：0 代表
 *   不限階段、每組都會出現，1/2/3 只在對應 phase 的那組出現；目前只有 skill 類別的
 *   資料有非 0 的 targetPhase）並算 realEfficiency：`critical`／`specific` 兩類只有職業
 *   命中 targetProfession 才計入 conditionEfficiency（未命中只剩 baseEfficiency，
 *   critical 類別的 5hr 生效條件也尚未套用），`general`／`skill` 兩類是
 *   baseEfficiency + conditionEfficiency 無條件相加（見 docs/domain/arknights_tools_init.md
 *   第 9 節），組內依此由高到低排序。
 * - 回應：{ data: SupportOperatorPhaseGroup[] }，依 phase 升冪排列。
 */
export default defineEventHandler(async (event) => {
  const supportOperators = await getSupportOperators();

  const query = getQuery(event);
  const { class: operatorProfession, fromSkill: rawFromSkill } = query;

  let targetClass: OperatorProfession | undefined;
  if (typeof operatorProfession === 'string' && operatorProfession.length > 0) {
    if (!VALID_CLASSES.includes(operatorProfession as OperatorProfession)) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的 class 參數："${operatorProfession}"，須為 ${VALID_CLASSES.join('/')} 其中之一`,
      });
    }
    targetClass = operatorProfession as OperatorProfession;
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
