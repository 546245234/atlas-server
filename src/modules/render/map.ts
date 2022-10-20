import { renderTile } from './tile'
import { Coord, Layer } from './types'
import { renderAvatars } from './avatars'

export function renderMap(args: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  size: number
  pan: Coord
  nw: Coord
  se: Coord
  center: Coord
  layers: Layer[]
}) {
  const { ctx, width, height, size, pan, nw, se, center, layers } = args

  ctx.fillStyle = '#18141a'//地图背景颜色,方块之间的缝隙颜色
  ctx.fillRect(0, 0, width, height)

  const halfWidth = width / 2
  const halfHeight = height / 2

  for (const layer of layers) {
    for (let x = nw.x; x < se.x; x++) {
      for (let y = se.y; y < nw.y; y++) {
        const offsetX = (center.x - x) * size + (pan ? pan.x : 0) //坐标距离中心点的距离
        const offsetY = (y - center.y) * size + (pan ? pan.y : 0)

        const tile = layer(x, y)
        if (!tile) {
          continue
        }
        const { color, top, left, topLeft, scale } = tile

        const halfSize = scale ? (size * scale) / 2 : size / 2

        renderTile({
          ctx,
          x: halfWidth - offsetX + halfSize, //这里的x坐标是canvas的x坐标，canvas原点为左上角，往右和往下为正
          y: halfHeight - offsetY + halfSize,
          size,
          padding: size < 7 ? 0.5 : size < 12 ? 1 : size < 18 ? 1.5 : 2,
          offset: 1,
          color,
          left,
          top,
          topLeft,
          scale,
        })
      }
    }
  }

  renderAvatars({ctx, width, height, size, pan, nw, se, center})
}
