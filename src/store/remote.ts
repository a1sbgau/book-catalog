import {
  DATA_BRANCH,
  DATA_FILE,
  GITHUB_OWNER,
  GITHUB_REPO,
  getPublicDataUrl,
  getRawDataUrl,
} from '../config'
import type { AppData } from '../types'

const TOKEN_KEY = 'book-catalog-gh-token'

export function getGithubToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setGithubToken(token: string) {
  if (token.trim()) sessionStorage.setItem(TOKEN_KEY, token.trim())
  else sessionStorage.removeItem(TOKEN_KEY)
}

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function validateData(data: unknown): AppData {
  if (!data || typeof data !== 'object') throw new Error('远程数据格式错误')
  const obj = data as AppData
  if (!Array.isArray(obj.categories) || !Array.isArray(obj.books)) {
    throw new Error('远程数据缺少 categories / books')
  }
  return obj
}

/** 从 GitHub Pages / raw 拉取所有人共用的数据 */
export async function fetchRemoteData(): Promise<AppData> {
  const urls = [getPublicDataUrl(), getRawDataUrl()]
  let lastError: Error | null = null

  for (const url of urls) {
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        lastError = new Error(`拉取失败 HTTP ${res.status}`)
        continue
      }
      return validateData(await res.json())
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('拉取失败')
    }
  }

  throw lastError || new Error('无法连接远程数据')
}

/** 发布到 gh-pages 的 data.json，手机端立刻可读 */
export async function publishRemoteData(data: AppData, token: string) {
  if (!token.trim()) throw new Error('请先填写 GitHub Token')

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let sha: string | undefined
  const getRes = await fetch(`${apiBase}?ref=${DATA_BRANCH}`, { headers })
  if (getRes.ok) {
    const current = (await getRes.json()) as { sha?: string }
    sha = current.sha
  } else if (getRes.status !== 404) {
    const err = await getRes.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message || `读取远程文件失败 (${getRes.status})`)
  }

  const body = {
    message: `publish: catalog data v${data.version || 1}`,
    content: toBase64(JSON.stringify(data, null, 2)),
    branch: DATA_BRANCH,
    ...(sha ? { sha } : {}),
  }

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message || `发布失败 (${putRes.status})`)
  }

  return putRes.json()
}
