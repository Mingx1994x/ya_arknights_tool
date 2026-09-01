import type {
  ArknightsClass,
  SupportOperatorCategory,
  SupportOperatorRecord,
} from '#shared/types/support-operator';
import { getSheetValues } from './google-sheets';

const SPREADSHEET_ID = '18F_W-TFndGOEGCVH2cpal0CAdjnQujp9Qp3H3IM9QPU';
// 從第 2 列開始，跳過表頭；分頁名稱含 ":" 需以單引號包住（A1 notation）
const RANGE = "'資料表:陪練幹員'!A2:H";

const CATEGORIES: SupportOperatorCategory[] = [
  'critical',
  'specific',
  'general',
  'skill',
];
const PROFESSIONS: ArknightsClass[] = [
  '近衛',
  '特種',
  '重裝',
  '醫療',
  '先鋒',
  '輔助',
  '狙擊',
  '術師',
];
const PHASES = [0, 1, 2, 3] as const;

function parseRow(row: string[], rowIndex: number): SupportOperatorRecord {
  function fail(message: string): never {
    throw createError({
      statusCode: 502,
      statusMessage: `支援幹員資料表第 ${rowIndex + 2} 列解析失敗：${message}`,
    });
  }

  const [
    rawId,
    rawCodeName,
    rawCategory,
    rawTargetProfession,
    rawTargetPhase,
    rawBaseEfficiency,
    rawConditionEfficiency,
    rawMemo,
  ] = row;

  const id = rawId?.trim();
  if (!id) fail('id 為空');

  const codeName = rawCodeName?.trim();
  if (!codeName) fail('codeName 為空');

  const category = rawCategory?.trim() as SupportOperatorCategory;
  if (!CATEGORIES.includes(category)) fail(`category 不合法："${rawCategory}"`);

  const targetProfessionRaw = rawTargetProfession?.trim();
  const targetProfessionParts = (targetProfessionRaw ?? '')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (targetProfessionParts.length === 0) fail('targetProfession 為空');
  for (const part of targetProfessionParts) {
    if (!PROFESSIONS.includes(part as ArknightsClass))
      fail(`targetProfession 含未知職業："${part}"`);
  }
  const targetProfession = targetProfessionParts as ArknightsClass[];

  const targetPhaseNum = Number(rawTargetPhase);
  if (!PHASES.includes(targetPhaseNum as (typeof PHASES)[number]))
    fail(`targetPhase 不合法："${rawTargetPhase}"`);
  const targetPhase = targetPhaseNum as SupportOperatorRecord['targetPhase'];

  const baseEfficiencyRaw = (rawBaseEfficiency ?? '').replace('%', '').trim();
  if (!baseEfficiencyRaw) fail('baseEfficiency 為空');
  const baseEfficiency = Number(baseEfficiencyRaw);
  if (!Number.isFinite(baseEfficiency))
    fail(`baseEfficiency 不是有效數字："${rawBaseEfficiency}"`);

  const conditionEfficiencyRaw = (rawConditionEfficiency ?? '')
    .replace('%', '')
    .trim();
  if (!conditionEfficiencyRaw) fail('conditionEfficiency 為空');
  const conditionEfficiency = Number(conditionEfficiencyRaw);
  if (!Number.isFinite(conditionEfficiency))
    fail(`conditionEfficiency 不是有效數字："${rawConditionEfficiency}"`);

  const memo = rawMemo?.trim() || undefined;

  return {
    id,
    codeName,
    category,
    targetProfession,
    targetPhase,
    baseEfficiency,
    conditionEfficiency,
    memo,
  };
}

async function fetchSupportOperators(): Promise<SupportOperatorRecord[]> {
  const rows = await getSheetValues(SPREADSHEET_ID, RANGE);
  const records = rows.map((row, index) => parseRow(row, index));

  if (records.length === 0) {
    throw createError({
      statusCode: 502,
      statusMessage: '支援幹員資料表讀取結果為空，請確認 Google Sheet 內容',
    });
  }

  return records;
}

export const getSupportOperators = defineCachedFunction(fetchSupportOperators, {
  maxAge: 60 * 5,
  name: 'support-operators',
  getKey: () => 'all',
});
