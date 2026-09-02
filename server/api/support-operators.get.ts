import type { ArknightsClass } from '#shared/types/support-operator'

const VALID_CLASSES: ArknightsClass[] = [
  '先鋒',
  '近衛',
  '重裝',
  '狙擊',
  '術師',
  '醫療',
  '輔助',
  '特種',
]

const VALID_SKILLS = [1, 2, 3] as const

/**
 * GET /api/support-operators?class=狙擊&skill=3
 *
 * 篩選規則對照 docs/domain/arknights_tools_init.md 第 8、9 節：
 * - 不帶 class：不做職業篩選。
 * - 不帶 skill：只回傳 skillScope 為 null 的 main/general 類幹員。
 * - 帶 skill：回傳 skillScope 為 null 的幹員，加上 skillScope 等於該技能編號的 skill_specific 幹員。
 */
export default defineEventHandler((event) => {
  const query = getQuery(event)

  const rawClass = query.class
  const rawSkill = query.skill

  let targetClass: ArknightsClass | undefined
  if (typeof rawClass === 'string' && rawClass.length > 0) {
    if (!VALID_CLASSES.includes(rawClass as ArknightsClass)) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的 class 參數："${rawClass}"，須為 ${VALID_CLASSES.join('/')} 其中之一`,
      })
    }
    targetClass = rawClass as ArknightsClass
  }

  let targetSkill: 1 | 2 | 3 | undefined
  if (typeof rawSkill === 'string' && rawSkill.length > 0) {
    const parsed = Number(rawSkill)
    if (!VALID_SKILLS.includes(parsed as (typeof VALID_SKILLS)[number])) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的 skill 參數："${rawSkill}"，須為 1/2/3 其中之一`,
      })
    }
    targetSkill = parsed as 1 | 2 | 3
  }

  const filtered = supportOperators.filter((operator) => {
    if (targetClass && !operator.targetClasses.includes(targetClass)) {
      return false
    }
    if (operator.skillScope === null) {
      return true
    }
    return targetSkill !== undefined && operator.skillScope === targetSkill
  })

  return { data: filtered }
})
