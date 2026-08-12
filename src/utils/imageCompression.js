const MAX_SOURCE_BYTES = 12 * 1024 * 1024
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.82

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No fue posible leer una de las imágenes.')) }
    image.src = url
  })
}

function canvasToWebp(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Este navegador no pudo convertir la imagen a WebP.'))
    }, 'image/webp', WEBP_QUALITY)
  })
}

export async function optimizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} no es una imagen válida.`)
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`${file.name} supera el límite de 12 MB.`)

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const blob = await canvasToWebp(canvas)

  return new File([blob], `${crypto.randomUUID()}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}
