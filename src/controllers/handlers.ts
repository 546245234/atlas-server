import { AppComponents, Context } from '../types'
import { toLegacyTiles } from '../adapters/legacy-tiles'
import { cacheWrapper } from '../logic/cache-wrapper'
import { extractParams, getFilterFromUrl } from '../logic/filter-params'

export const createTilesRequestHandler = (
  components: Pick<AppComponents, 'map'>
) => {
  const { map } = components
  return cacheWrapper(//缓存请求
    async (context: { url: URL }) => {
      if (!map.isReady()) {//需要等地图下载完毕
        return { status: 503, body: 'Not ready' }
      }
      const tiles = await map.getTiles()//获取所有方块
      const data = getFilterFromUrl(context.url, tiles)//根据url参数返回合适的tiles方块组

      return {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ok: true, data }),
      }
    },
    [map.getLastUpdatedAt]
  )
}

export const createLegacyTilesRequestHandler = (
  components: Pick<AppComponents, 'map'>
) => {
  const { map } = components
  return cacheWrapper(
    async (context: { url: URL }) => {
      if (!map.isReady()) {
        return { status: 503, body: 'Not ready' }
      }
      const tiles = await map.getTiles()
      const data = toLegacyTiles(getFilterFromUrl(context.url, tiles))

      return {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ok: true, data }),
      }
    },
    [map.getLastUpdatedAt]
  )
}

export async function miniMapHandler(context: Context) {
  const { renderMiniMap, map, metrics } = context.components
  //metrics.ts指标文件
  const timer = metrics.startTimer('dcl_mini_map_render_time')
  try {
    if (!map.isReady()) {
      return { status: 503, body: 'Not ready' }
    }
    const stream = await renderMiniMap.getStream()
    timer.end({ status: 200 })
    return {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public,s-maxage=600,max-age=600',
      },
      body: stream,
    }
  } catch (error:any) {
    timer.end({ status: 500 })
    return {
      status: 500,
      body: { ok: false, error: error.message },
    }
  }
}

export async function estateMapHandler(context: Context) {
  const { renderEstateMiniMap, map, metrics } = context.components
  const timer = metrics.startTimer('dcl_mini_map_render_time')
  try {
    if (!map.isReady()) {
      return { status: 503, body: 'Not ready' }
    }
    const stream = await renderEstateMiniMap.getStream()
    timer.end({ status: 200 })
    return {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public,s-maxage=600,max-age=600',
      },
      body: stream,
    }
  } catch (error:any) {
    timer.end({ status: 500 })
    return {
      status: 500,
      body: { ok: false, error: error.message },
    }
  }
}
//根据url参数生成对应的map图片
///v1/map.png?center=23,-23&selected=23,-23&size=20&width
export const mapPngRequestHandler = async (context: {
  components: Pick<AppComponents, 'image' | 'map' | 'metrics'>
  url: URL
}) => {
  const { image, map, metrics } = context.components
  const timer = metrics.startTimer('dcl_map_render_time')
  try {
    if (!map.isReady()) {
      return { status: 503, body: 'Not ready' }
    }
    const { width, height, size, center, showOnSale, selected } = extractParams(
      context.url
    )
    const stream = await image.getStream(
      width,
      height,
      size,
      center,
      selected,
      showOnSale
    )
    timer.end({ status: 200 })
    return {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
      body: stream,
    }
  } catch (error:any) {
    timer.end({ status: 500 })
    return {
      status: 500,
      body: { ok: false, error: error.message },
    }
  }
}

///v1/parcels/:x/:y/map.png, 通过传入具体需要选中方块的坐标，返回一个选中方块居中显示
//的图片
export const parcelMapPngRequestHandler = async (context: {
  components: Pick<AppComponents, 'image' | 'map'>
  params: {
    x: string
    y: string
  }
  url: URL
}) => {
  const { components, params } = context
  const { image, map } = components
  try {
    if (!map.isReady()) {
      return { status: 503, body: 'Not ready' }
    }
    const { width, height, size, showOnSale } = extractParams(context.url)
    const center = {
      x: parseInt(params.x) || 0,
      y: parseInt(params.y) || 0,
    }
    const selected = [center]
    const stream = await image.getStream(
      width,
      height,
      size,
      center,
      selected,
      showOnSale
    )
    return {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
      body: stream,
    }
  } catch (error:any) {
    return {
      status: 500,
      body: { ok: false, error: error.message },
    }
  }
}

export const estateMapPngRequestHandler = async (context: {
  components: Pick<AppComponents, 'image' | 'map'>
  params: { estateId: string }
  url: URL
}) => {
  const { image, map } = context.components
  try {
    if (!map.isReady()) {
      return { status: 503, body: 'Not ready' }
    }
    const { width, height, size, showOnSale } = extractParams(context.url)
    const { estateId } = context.params
    const tiles = await map.getTiles()
    const selected = Object.values(tiles).filter(
      (tile) => tile.estateId && tile.estateId === estateId
    )
    if (selected.length === 0) {
      const headers: Record<string, string> = {
        location: 'https://ui.decentraland.org/dissolved_estate.png',
      }
      return {
        status: 302,
        headers,
      }
    }
    const xs = selected.map((coords) => coords.x).sort()
    const ys = selected.map((coords) => coords.y).sort()
    const x = xs[(xs.length / 2) | 0] || 0
    const y = ys[(ys.length / 2) | 0] || 0
    const center = { x, y }
    const stream = await image.getStream(
      width,
      height,
      size,
      center,
      selected,
      showOnSale
    )
    return {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
      body: stream,
    }
  } catch (error:any) {
    return {
      status: 500,
      body: { ok: false, error: error.message },
    }
  }
}

export const parcelRequestHandler = async (context: {
  components: Pick<AppComponents, 'map'>
  params: { x: string; y: string }
}) => {
  const { map } = context.components
  const { x, y } = context.params

  if (!map.isReady()) {
    return { status: 503, body: 'Not ready' }
  }

  const parcel = await map.getParcel(x, y)

  if (parcel) {
    return { status: 200, body: parcel }
  } else {
    return { status: 404, body: { ok: false, error: 'Not Found' } }
  }
}

export const estateRequestHandler = async (context: {
  components: Pick<AppComponents, 'map'>
  params: { id: string }
}) => {
  const { map } = context.components
  const { id } = context.params

  if (!map.isReady()) {
    return { status: 503, body: 'Not ready' }
  }

  const estate = await map.getEstate(id)

  if (estate) {
    return { status: 200, body: estate }
  } else {
    const dissolvedEstate = await map.getDissolvedEstate(id)
    if (dissolvedEstate) {
      return { status: 200, body: dissolvedEstate }
    } else {
      return { status: 404, body: { ok: false, error: 'Not Found' } }
    }
  }
}

export const tokenRequestHandler = async (context: {
  components: Pick<AppComponents, 'map' | 'config'>
  params: { address: string; id: string }
}) => {
  const { map, config } = context.components
  const { address, id } = context.params

  if (!map.isReady()) {
    return { status: 503, body: 'Not ready' }
  }

  const token = await map.getToken(address, id)

  if (token) {
    const headers: Record<string, string> = {}
    const landContractAddress = await config.requireString(
      'LAND_CONTRACT_ADDRESS'
    )

    if (address === landContractAddress) {
      headers['cache-control'] = 'public, max-age=3600,s-maxage=3600, immutable'
    }

    return { status: 200, headers, body: token }
  } else {
    const estateContractAddress = await config.requireString(
      'ESTATE_CONTRACT_ADDRESS'
    )

    if (address === estateContractAddress) {
      const dissolvedEstate = await map.getDissolvedEstate(id)
      if (dissolvedEstate) {
        return { status: 200, body: dissolvedEstate }
      }
    }
    return { status: 404, body: { ok: false, error: 'Not Found' } }
  }
}

export async function pingRequestHandler() {
  return {
    status: 200,
    body: 'ok',
  }
}

export async function readyRequestHandler(context: {
  components: Pick<AppComponents, 'map'>
}) {
  const { map } = context.components
  if (!map.isReady()) {
    return { status: 503, body: 'Not ready' }
  }
  return {
    status: 200,
    body: 'ok',
  }
}

export async function tilesInfoRequestHandler(context: {
  components: Pick<AppComponents, 'map'>
}) {
  const { map } = context.components
  if (!map.isReady()) {
    return { status: 503, body: 'Not ready' }
  }

  const lastUpdatedAt = map.getLastUpdatedAt()
  return {
    status: 200,
    body: { lastUpdatedAt },
  }
}