import { ISubgraphComponent } from '@well-known-components/thegraph-component'
import { IApiComponent } from './modules/api/types'
import { IMapComponent } from './modules/map/types'
import { IImageComponent } from './modules/image/types'
import { IDistrictComponent } from './modules/district/types'
import {
  IConfigComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent,
} from '@well-known-components/interfaces'
import { metricDeclarations } from './metrics'

export type GlobalContext = {
  components: BaseComponents
}

export type BaseComponents = {
  config: IConfigComponent
  api: IApiComponent
  batchApi: IApiComponent
  subgraph: ISubgraphComponent
  map: IMapComponent
  server: IHttpServerComponent<GlobalContext>
  logs: ILoggerComponent
  image: IImageComponent
  district: IDistrictComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
}

// production components
export type AppComponents = BaseComponents & {
  statusChecks: {}
}

// test environment components
export type TestComponents = BaseComponents & {}
