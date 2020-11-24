import express, { Application, Request, Response } from 'express'
import future from 'fp-future'
import cors from 'cors'
import { SingleBar } from 'cli-progress'
import { Subgraph } from './api/subgraph'
import { Tile } from './types'
import { LegacyTile, toLegacyTile } from './legacy'

export type ServerOptions = {
  host: string
  port: number
  subgraphUrl: string
  subgraphConcurrency: number
  subgraphBatchSize: number
  subgraphRefreshInterval: number
}

const defaultValues: ServerOptions = {
  host: '0.0.0.0',
  port: 5000,
  subgraphUrl:
    'https://api.thegraph.com/subgraphs/name/decentraland/marketplace',
  subgraphConcurrency: 10,
  subgraphBatchSize: 1000,
  subgraphRefreshInterval: 60,
}

function getValue<T extends string | number = string>(
  options: Partial<ServerOptions>,
  key: keyof ServerOptions,
  type: 'string' | 'number' = 'string'
) {
  return (key in options && typeof options[key] !== 'undefined'
    ? type === 'number' && isNaN(options[key] as number)
      ? defaultValues[key]
      : options[key]!
    : defaultValues[key]) as T
}

export class Server {
  // server
  public host: string
  public port: number
  public app: Application = express()

  // data
  public tiles = future<Record<string, Tile>>()

  // subgraph
  public subgraph: Subgraph
  public subgraphRefreshInterval: number
  public subgraphTimeout: NodeJS.Timeout | null = null
  public subgraphLastUpdatedAt: number = 0

  constructor(options: Partial<ServerOptions>) {
    this.host = getValue(options, 'host')
    this.port = getValue<number>(options, 'port', 'number')
    const subgraphUrl = getValue<string>(options, 'subgraphUrl', 'string')
    const subgraphConcurrency = getValue<number>(
      options,
      'subgraphConcurrency',
      'number'
    )
    const subgraphBatchSize = getValue<number>(
      options,
      'subgraphBatchSize',
      'number'
    )
    this.subgraph = new Subgraph(
      subgraphUrl,
      subgraphConcurrency,
      subgraphBatchSize
    )
    this.subgraphRefreshInterval = getValue<number>(
      options,
      'subgraphRefreshInterval',
      'number'
    )
  }

  async start() {
    // start server
    await this.mount()

    // fetch data
    await this.fetchInitialData()

    // keep data updated
    await this.startPolling()
  }

  private mount() {
    const listen = future<boolean>()

    // middlewares
    this.app.use(cors())

    // routes
    this.app.get(
      '/v1/tiles',
      this.handle<Record<string, LegacyTile>>(() => this.getLegacyTiles())
    )
    this.app.get(
      '/v2/tiles',
      this.handle<Record<string, Tile>>(() => this.tiles)
    )

    // bind it
    this.app.listen(this.port, () => {
      console.log(`Listening on port ${this.port}`)
      listen.resolve(true)
    })

    return listen
  }

  private handle<T>(handler: (req: Request, res: Response) => Promise<T>) {
    return (req: Request, res: Response) => {
      handler(req, res)
        .then((data) => res.json({ ok: true, data }))
        .catch((error) => res.status(500).send({ ok: false, error }))
    }
  }

  private async fetchInitialData() {
    console.log(`\nFetching blockchain data...`)
    console.log(`Subgraph: ${this.subgraph.url}`)
    console.log(`Concurrency: ${this.subgraph.concurrency}`)
    console.log(`Batch Size: ${this.subgraph.batchSize}`)
    const bar = new SingleBar({ format: '[{bar}] {percentage}%' })
    bar.start(100, 0)
    try {
      const tiles = await this.subgraph.fetchTiles((progress) =>
        bar.update(progress)
      )
      bar.stop()
      this.tiles.resolve(tiles)
      console.log(
        `\nTotal: ${Object.keys(tiles).length.toLocaleString()} parcels`
      )
    } catch (error) {
      this.tiles.reject(new Error(error.message))
    }
  }

  private async startPolling() {
    console.log(
      `Polling changes every ${this.subgraphRefreshInterval.toLocaleString()} seconds...`
    )
    // find last timestamp
    const tiles = await this.tiles
    this.subgraphLastUpdatedAt = Object.values(tiles).reduce(
      (last, tile) => (tile.updatedAt > last ? tile.updatedAt : last),
      0
    )

    // kick timeout
    this.subgraphTimeout = setTimeout(
      () => this.updateSubgraphData(),
      this.subgraphRefreshInterval * 1000
    )
  }

  private async updateSubgraphData() {
    try {
      // get new tiles
      const newTiles = await this.subgraph.fetchUpdatedTiles(
        this.subgraphLastUpdatedAt
      )

      // perform updates if any
      if (newTiles.length > 0) {
        console.log(`Found ${newTiles.length} updates`)
        const oldTiles = await this.tiles
        const tiles = { ...oldTiles }
        let lastUpdatedAt = 0
        for (const newTile of newTiles) {
          tiles[newTile.id] = newTile
          lastUpdatedAt =
            newTile.updatedAt > lastUpdatedAt
              ? newTile.updatedAt
              : lastUpdatedAt
        }
        this.subgraphLastUpdatedAt = lastUpdatedAt
        this.tiles = future<Record<string, Tile>>()
        this.tiles.resolve(this.subgraph.computeEstates(tiles))
      }
    } catch (error) {
      console.error(error.message)
    }

    // wait for next refresh
    this.subgraphTimeout = setTimeout(
      () => this.updateSubgraphData(),
      this.subgraphRefreshInterval * 1000
    )
  }

  async getLegacyTiles() {
    const tiles = await this.tiles
    const legacyTiles: Record<string, LegacyTile> = {}
    for (const tile of Object.values(tiles)) {
      legacyTiles[tile.id] = toLegacyTile(tile)
    }
    return legacyTiles
  }
}
