/** GitHub 仓库信息：线上数据文件所在位置 */
export const GITHUB_OWNER = 'a1sbgau'
export const GITHUB_REPO = 'book-catalog'
export const DATA_FILE = 'data.json'
export const DATA_BRANCH = 'gh-pages'

/** App 端读取的公开地址（所有手机共用） */
export function getPublicDataUrl() {
  try {
    const page = window.location.href.split('#')[0]
    // 保证目录以 / 结尾，避免 .../book-catalog + data.json 变成错误路径
    const dir = page.endsWith('/')
      ? page
      : page.replace(/\/[^/]*\.[a-zA-Z0-9]+$/, '/').replace(/\/?$/, '/')
    if (dir.includes(`${GITHUB_REPO}/`) || dir.endsWith(`${GITHUB_REPO}/`)) {
      return new URL(DATA_FILE, dir).toString()
    }
  } catch {
    /* fallthrough */
  }
  return `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${DATA_FILE}`
}

export function getRawDataUrl() {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${DATA_BRANCH}/${DATA_FILE}`
}
