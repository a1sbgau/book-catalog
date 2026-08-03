import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { DEFAULT_BOOKS, DEFAULT_CATEGORIES } from './src/data/books'

function seedPayload() {
  return JSON.stringify(
    {
      categories: DEFAULT_CATEGORIES,
      books: DEFAULT_BOOKS,
      version: 1,
      updatedAt: Date.now(),
    },
    null,
    2,
  )
}

function emitDataJson(): Plugin {
  return {
    name: 'emit-data-json',
    buildStart() {
      const dir = resolve(__dirname, 'public')
      const file = resolve(dir, 'data.json')
      mkdirSync(dir, { recursive: true })
      if (!existsSync(file)) {
        writeFileSync(file, seedPayload(), 'utf-8')
      }
    },
    generateBundle() {
      const file = resolve(__dirname, 'public', 'data.json')
      const source = existsSync(file) ? readFileSync(file, 'utf-8') : seedPayload()
      this.emitFile({
        type: 'asset',
        fileName: 'data.json',
        source,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), emitDataJson()],
  base: './',
})
