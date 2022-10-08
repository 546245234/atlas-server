import * as nodeFetch from 'node-fetch'
import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createMetricsComponent } from '@well-known-components/metrics'
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
  const logs = createLogComponent()
  const batchLogs = {
    getLogger(name: string) {
      const logger = logs.getLogger(name)
      // We don't want to show info for each batched subgraph query
      return { ...logger, info: () => {} }
    },
  }

  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    { cors, compression: {} }
  )
  const metrics = await createMetricsComponent(metricDeclarations, {
    server,
    config,
  })
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
  const map = await createMapComponent({ config, api, batchApi })
  const image = createImageComponent({ map })
  //从district文件夹下的data获取数据，表示每个建筑占地面积和拥有者地址还有名称
  //包含getDistricts，getDistrict，getContributionsByAddress
  const district = createDistrictComponent()
  const statusChecks = await createStatusCheckComponent({ server, config })

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
  }
}
