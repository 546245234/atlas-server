import * as nodeFetch from 'node-fetch'
import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import {
  createMetricsComponent,
  instrumentHttpServerWithMetrics,
} from '@well-known-components/metrics'
import {
  createServerComponent,
  createStatusCheckComponent,
  IFetchComponent,
} from '@well-known-components/http-server'
import { createSubgraphComponent } from '@well-known-components/thegraph-component'
import { createLogComponent } from '@well-known-components/logger'
import { createApiComponent } from './modules/api/component'
import { createDistrictComponent } from './modules/district/component'
import { createImageComponent } from './modules/image/component'
import { createMapComponent } from './modules/map/component'
import { AppComponents, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import { createEstatesRendererComponent, createMiniMapRendererComponent } from './adapters/mini-map-renderer'

export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent(
    { path: ['.env.defaults', '.env'] },
    process.env
  )

  const cors = {
    origin: await config.getString('CORS_ORIGIN'),
    method: await config.getString('CORS_METHOD'),
  }
  const subgraphURL = await config.requireString('SUBGRAPH_URL')

  const fetch: IFetchComponent = { fetch: nodeFetch.default }
  const metrics = await createMetricsComponent(metricDeclarations, {
    config,
  })
  const logs = await createLogComponent({ metrics })
  const batchLogs = {
    getLogger(name: string) {
      const logger = logs.getLogger(name)
      // We don't want to show info for each batched subgraph query
      return { ...logger, info: () => {} }
    },
  }

  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    { cors }
  )

  await instrumentHttpServerWithMetrics({ metrics, server, config })
  const subgraph = await createSubgraphComponent(
    { config, logs, fetch, metrics },
    subgraphURL
  )
  const batchSubgraph = await createSubgraphComponent(
    { config, logs: batchLogs, fetch, metrics },
    subgraphURL
  )
  const api = await createApiComponent({ config, subgraph })
  const batchApi = await createApiComponent({ config, subgraph: batchSubgraph })
  //初始化地图，获取所有tile和其他数据，生成一个map对象，挂载了多个map数据相关的方法
  const map = await createMapComponent({ config, api, batchApi })
  const image = createImageComponent({ map })
  //从district文件夹下的data获取数据，表示每个建筑占地面积和拥有者地址还有名称
  //包含getDistricts，getDistrict，getContributionsByAddress
  const district = createDistrictComponent()
  const statusChecks = await createStatusCheckComponent({ server, config })
  const renderMiniMap = await createMiniMapRendererComponent({ map })
  const renderEstateMiniMap = await createEstatesRendererComponent({ map })

  return {
    config,
    api,
    batchApi,
    subgraph,
    map,
    metrics,
    server,
    logs,
    image,
    district,
    statusChecks,
    renderMiniMap,
    renderEstateMiniMap
  }
}