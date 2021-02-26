import { SingleBar } from 'cli-progress'
import { ApiEvents, Result } from '../modules/api/types'
import { MapEvents } from '../modules/map/types'
import { ServerEvents } from '../modules/server/types'
import { AppComponents } from '../types'

export const setupLogs = (
  components: Pick<AppComponents, 'config' | 'server' | 'map' | 'api'>
) => {
  const { config, server, map, api } = components

  const bar = new SingleBar({ format: '[{bar}] {percentage}%' })

  server.events.on(ServerEvents.READY, () =>
    console.log(`Listening on port ${5000}`)
  )

  map.events.on(MapEvents.INIT, () => {
    console.log(`Fetching data...`)
    console.log(`URL: ${config.getString('API_URL')}`)
    console.log(`Concurrency: ${config.getString('API_CONCURRENCY')}`)
    console.log(`Batch Size: ${config.getString('API_BATCH_SIZE')}`)
    bar.start(100, 0)
  })

  api.events.on(ApiEvents.PROGRESS, (progress: number) => bar.update(progress))

  map.events.on(MapEvents.READY, (result: Result) => {
    bar.stop()
    console.log(`Total: ${result.tiles.length.toLocaleString()} tiles`)
    console.log(`Parcels: ${result.parcels.length.toLocaleString()}`)
    console.log(`Estates: ${result.estates.length.toLocaleString()}`)
    console.log(`Last timestamp:`, result.updatedAt)
    console.log(
      `Polling changes every ${config.getNumber('REFRESH_INTERVAL')} seconds`
    )
  })

  map.events.on(MapEvents.UPDATE, (result: Result) => {
    console.log(
      `Updating ${result.tiles.length} tiles: ${result.tiles
        .map((tile) => `${tile.x},${tile.y}`)
        .join(', ')}`
    )
    console.log(`Updating ${result.parcels.length} parcels`)
    console.log(`Updating ${result.estates.length} estates`)
    console.log(`Last timestamp:`, result.updatedAt)
  })

  server.events.on(ServerEvents.ERROR, (error: Error) =>
    console.log(`Error: ${error.message}`)
  )
}
