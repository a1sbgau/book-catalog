import * as pdfjs from 'pdfjs-dist'

// Vite worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** 将 PDF 每一页渲染为 JPEG dataURL（适合手机本地保存） */
export async function pdfFileToImages(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const images: string[] = []
  const total = pdf.numPages

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.4 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.82))
    onProgress?.(i, total)
  }

  return images
}

export async function filesToImageDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files)
  const out: string[] = []
  for (const file of list) {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      out.push(...(await pdfFileToImages(file)))
      continue
    }
    if (!file.type.startsWith('image/')) continue
    out.push(await readAsDataURL(file))
  }
  return out
}

function readAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}
