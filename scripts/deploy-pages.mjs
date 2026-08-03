import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const dist = join(root, 'dist')
const tmp = join(root, '.pages-tmp')
const owner = 'a1sbgau'
const repo = 'book-catalog'
const remoteData = `https://${owner}.github.io/${repo}/data.json`

if (!existsSync(dist)) {
  console.error('dist 不存在，请先 npm run build')
  process.exit(1)
}

// 尽量保留线上已发布的 data.json，避免重新部署把书库覆盖成种子数据
try {
  const res = await fetch(`${remoteData}?t=${Date.now()}`, { cache: 'no-store' })
  if (res.ok) {
    const text = await res.text()
    JSON.parse(text)
    writeFileSync(join(dist, 'data.json'), text, 'utf-8')
    console.log('已保留线上 data.json')
  } else {
    console.log('线上暂无 data.json，使用构建产物中的种子数据')
  }
} catch (err) {
  console.log('拉取线上 data.json 失败，使用本地构建数据', err)
}

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
cpSync(dist, tmp, { recursive: true })

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: owner,
  GIT_AUTHOR_EMAIL: `${owner}@users.noreply.github.com`,
  GIT_COMMITTER_NAME: owner,
  GIT_COMMITTER_EMAIL: `${owner}@users.noreply.github.com`,
}

execSync('git init -b gh-pages', { cwd: tmp, stdio: 'inherit' })
execSync('git add .', { cwd: tmp, stdio: 'inherit' })
execSync('git commit -m "Deploy app to GitHub Pages"', { cwd: tmp, stdio: 'inherit', env: gitEnv })
execSync(`git remote add origin https://github.com/${owner}/${repo}.git`, { cwd: tmp, stdio: 'inherit' })
execSync('git push -f origin gh-pages', { cwd: tmp, stdio: 'inherit' })
rmSync(tmp, { recursive: true, force: true })
console.log('部署完成')
