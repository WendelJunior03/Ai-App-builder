import { AppProviders } from './providers'
import { routes } from './routes'

export function App() {
  return <AppProviders>{routes[0]?.element}</AppProviders>
}
