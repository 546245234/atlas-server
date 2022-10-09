import { createCanvas } from 'canvas'
import { Coord, Layer, getViewport, renderMap } from '../render'
import { IMapComponent, Tile, TileType } from '../map/types'
import { coordsToId, isExpired } from '../map/utils'
import { IImageComponent } from './types'

export function createImageComponent(components: {
  map: IMapComponent
}): IImageComponent {
  const { map } = components

  function getColor(tile: Tile) {
    switch (tile.type) {
      case TileType.DISTRICT://区
        return '#5054D4'
      case TileType.PLAZA://广场
        return '#70AC76'
        // return '#2b7de1'//自定义广场
      case TileType.ROAD://路
        return '#716C7A'
      case TileType.OWNED: //被拥有，一般地图多数为owned
        return '#3D3A46'
      case TileType.UNOWNED:
        return '#09080A'
    }
  }
  //返回图片流数据
  async function getStream(
    width: number,
    height: number,
    size: number,
    center: Coord,
    selected: Coord[],
    showOnSale: boolean
  ) {
    const pan = { x: 0, y: 0 }
    const { nw, se } = getViewport({ width, height, center, size, padding: 1 })
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const tiles = await map.getTiles()
    const layer: Layer = (x, y) => { //通过传入方块的坐标生成result，result有color属性
      const id = coordsToId(x, y)
      const tile = tiles[id]
      const result = tile
        ? {
          color: showOnSale && tile.price && !isExpired(tile) ? '#1FBCFF' : getColor(tile),//color是方块显示的颜色
          top: tile.top,
          left: tile.left,
          topLeft: tile.topLeft,
        }
        : {
          color: (x + y) % 2 === 0 ? '#110e13' : '#0d0b0e',
        }
      return result
    }
    const layers = [layer]

    // render selected tiles
    if (selected.length > 0) {
      const selection = new Set(
        selected.map((coords) => coordsToId(coords.x, coords.y))
      )
      const strokeLayer: Layer = (x, y) =>
        selection.has(coordsToId(x, y))
          ? { color: '#ff0044', scale: 1.4 }
          : null
      const fillLayer: Layer = (x, y) =>
        selection.has(coordsToId(x, y))
          ? { color: '#ff9990', scale: 1.2 }
          : null
      layers.push(strokeLayer)
      layers.push(fillLayer)
    }

    renderMap({
      ctx,
      width,
      height,
      size,
      pan,
      center,
      nw,
      se,
      layers,//包含了多个方法，用于生成不同颜色块信息的对象
    })
    return canvas.createPNGStream()
  }
  return {
    getStream,
  }
}
