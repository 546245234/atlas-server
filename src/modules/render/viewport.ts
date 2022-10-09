import { Coord } from './types'

export type Viewport = {
  width: number
  height: number
  nw: Coord //左上角坐标
  se: Coord //右下角坐标
  area: number //面积
}

export function getViewport(args: {
  width: number
  height: number
  center: Coord
  size: number
  padding: number
  pan?: Coord
}): Viewport {
  const { width, height, center, pan, size, padding } = args
  const dimensions = {
    width: Math.ceil(width / size + padding),
    height: Math.ceil(height / size + padding),
  }
  const panX = pan ? Math.ceil(pan.x / size) : 0
  const panY = pan ? Math.ceil(pan.y / size) : 0
  const nw = {
    x: center.x - Math.ceil(dimensions.width / 2) + panX,
    y: center.y + Math.ceil(dimensions.height / 2) - panY,
  }
  const se = {
    x: center.x + Math.ceil(dimensions.width / 2) + panX,
    y: center.y - Math.ceil(dimensions.height / 2) - panY,
  }
  const area = (se.x - nw.x) * (nw.y - se.y)

  return {
    ...dimensions,
    nw,
    se,
    area,
  }
}
