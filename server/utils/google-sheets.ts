import { JWT } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

let cachedClient: JWT | null = null

function getJwtClient(): JWT {
  const { googleSheets } = useRuntimeConfig()
  const { clientEmail, privateKey } = googleSheets

  if (!clientEmail || !privateKey) {
    const missing = [
      !clientEmail && 'NUXT_GOOGLE_SHEETS_CLIENT_EMAIL',
      !privateKey && 'NUXT_GOOGLE_SHEETS_PRIVATE_KEY',
    ].filter(Boolean).join('、')

    throw createError({
      statusCode: 500,
      statusMessage: `缺少 Google Sheets 服務帳戶環境變數：${missing}`,
    })
  }

  if (!cachedClient) {
    cachedClient = new JWT({
      email: clientEmail,
      // .env 中以跳脫過的 \n 儲存私鑰，這裡還原成真正的換行符號給 JWT client
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    })
  }

  return cachedClient
}

/**
 * 讀取指定 Google Sheet 分頁範圍內的原始儲存格資料（字串二維陣列，未做任何型別轉換）。
 */
export async function getSheetValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const client = getJwtClient()

  let accessToken: string | null | undefined
  try {
    const tokenResponse = await client.authorize()
    accessToken = tokenResponse.access_token
  } catch (error) {
    console.error('[google-sheets] service account 驗證失敗', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Sheets 服務帳戶驗證失敗，請確認 NUXT_GOOGLE_SHEETS_PRIVATE_KEY 格式是否正確',
    })
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    console.error(`[google-sheets] 讀取 ${range} 失敗：${response.status} ${await response.text()}`)
    throw createError({
      statusCode: 502,
      statusMessage: 'Google Sheets API 讀取失敗，請確認試算表已分享給服務帳戶',
    })
  }

  const body = await response.json() as { values?: string[][] }
  return body.values ?? []
}
