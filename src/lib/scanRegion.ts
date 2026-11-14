export interface Size {
  width: number
  height: number
}
export interface Rect extends Size {
  x: number
  y: number
}

/**
 * Traduce el recuadro guía (fracciones de la vista) a píxeles del video. La vista muestra el
 * video con `object-fit: cover`, que recorta los bordes: el recuadro es una fracción de la parte
 * visible, no del cuadro completo. Así se lee solo lo que el revisor está apuntando.
 */
export function guideRectInVideo(video: Size, view: Size, guide: Rect): Rect | null {
  if (!video.width || !video.height || !view.width || !view.height) return null
  const scale = Math.max(view.width / video.width, view.height / video.height)
  const visibleWidth = view.width / scale
  const visibleHeight = view.height / scale
  const offsetX = (video.width - visibleWidth) / 2
  const offsetY = (video.height - visibleHeight) / 2
  return {
    x: Math.round(offsetX + guide.x * visibleWidth),
    y: Math.round(offsetY + guide.y * visibleHeight),
    width: Math.round(guide.width * visibleWidth),
    height: Math.round(guide.height * visibleHeight),
  }
}
