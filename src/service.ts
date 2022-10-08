import { setupLogs } from "./controllers/logs"
import { setupRouter } from "./controllers/routes"
import { AppComponents, GlobalContext, TestComponents } from "./types"

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(components: AppComponents | TestComponents) {
  //components的方法在components.ts里配置
  const globalContext: GlobalContext = {
    components,
  }

  // wire the HTTP router (make it automatic? TBD)
  const router = await setupRouter(components)
  components.server.use(router.middleware())
  components.server.setContext(globalContext)//设置全局上下文

  setupLogs(components)
}
