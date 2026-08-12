import { useEffect, useRef, useState } from 'react'
import { deleteProductImage, listProductImages, setPrimaryProductImage } from '../services/productImages.js'
import { optimizeImage } from '../utils/imageCompression.js'

const MAX_IMAGES = 8

export default function ProductImages({ productId, images, pendingFiles, onImagesChange, onPendingChange, disabled }) {
  const inputRef = useRef(null)
  const [processing, setProcessing] = useState(false)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [previews, setPreviews] = useState([])

  useEffect(() => {
    const next = pendingFiles.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPreviews(next)
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [pendingFiles])

  async function refreshImages() {
    if (!productId) return
    const { data, error: loadError } = await listProductImages(productId)
    if (loadError) setError(loadError.message)
    else onImagesChange(data || [])
  }

  async function handleFiles(event) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')
    if (images.length + pendingFiles.length + selected.length > MAX_IMAGES) {
      setError(`Puedes guardar un máximo de ${MAX_IMAGES} fotografías por producto.`)
      return
    }

    setProcessing(true)
    const optimized = []
    try {
      for (const file of selected) optimized.push(await optimizeImage(file))
      onPendingChange([...pendingFiles, ...optimized])
    } catch (optimizationError) {
      setError(optimizationError.message)
    } finally {
      setProcessing(false)
    }
  }

  async function makePrimary(image) {
    setActionId(image.id)
    setError('')
    const { error: updateError } = await setPrimaryProductImage(productId, image.id)
    if (updateError) setError(updateError.message)
    else await refreshImages()
    setActionId('')
  }

  async function removeImage(image) {
    if (!window.confirm('¿Eliminar esta fotografía del producto? Esta acción no se puede deshacer.')) return
    setActionId(image.id)
    setError('')
    const remaining = images.filter((item) => item.id !== image.id)
    const { error: deleteError } = await deleteProductImage(image, remaining)
    if (deleteError) setError(deleteError.message)
    else await refreshImages()
    setActionId('')
  }

  return (
    <section className="form-section images-section">
      <div className="form-section-heading"><span>04</span><div><h2>Fotografías</h2><p>Hasta {MAX_IMAGES} imágenes. Se reducen y convierten a WebP antes de subir.</p></div></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={handleFiles} disabled={disabled || processing} />
      <button className="image-picker" type="button" onClick={() => inputRef.current?.click()} disabled={disabled || processing || images.length + pendingFiles.length >= MAX_IMAGES}>
        <span>+</span><strong>{processing ? 'Optimizando imágenes…' : 'Seleccionar fotografías'}</strong><small>Desde cámara, galería o archivos · JPG, PNG, WebP</small>
      </button>

      {(images.length > 0 || previews.length > 0) && (
        <div className="image-grid">
          {images.map((image) => (
            <article className="image-tile" key={image.id}>
              <img src={image.signedUrl} alt="Fotografía del producto" />
              {image.is_primary && <span className="primary-image-badge">Principal</span>}
              <div>
                {!image.is_primary && <button type="button" onClick={() => makePrimary(image)} disabled={disabled || actionId === image.id}>Hacer principal</button>}
                <button className="remove-image" type="button" onClick={() => removeImage(image)} disabled={disabled || actionId === image.id}>Eliminar</button>
              </div>
            </article>
          ))}
          {previews.map((preview, index) => (
            <article className="image-tile pending" key={preview.file.name + index}>
              <img src={preview.url} alt={`Fotografía pendiente ${index + 1}`} />
              {images.length === 0 && index === 0 && <span className="primary-image-badge">Principal</span>}
              <span className="pending-badge">Pendiente</span>
              <div><button className="remove-image" type="button" onClick={() => onPendingChange(pendingFiles.filter((_, fileIndex) => fileIndex !== index))} disabled={disabled}>Quitar</button></div>
            </article>
          ))}
        </div>
      )}
      <p className="image-help">{images.length + pendingFiles.length}/{MAX_IMAGES} fotografías. Las pendientes se subirán al guardar el producto.</p>
    </section>
  )
}
