import { getExampleContent } from '../services/example-service'

export function useExampleData() {
  return getExampleContent()
}
