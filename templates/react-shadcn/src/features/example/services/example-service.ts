import type { ExampleContent } from '../types'

export function getExampleContent(): ExampleContent {
  return {
    headline: 'Build from a clean React architecture',
    description:
      'Start new apps with pages, features, shared components, and data logic separated from the app shell.',
    highlights: [
      {
        title: 'App shell',
        description: 'Keep providers, routes, and global composition in src/app.',
      },
      {
        title: 'Feature folders',
        description: 'Add screens, hooks, services, and local UI inside src/features.',
      },
      {
        title: 'Shared layers',
        description: 'Use shared, domain, application, and infrastructure for reusable logic.',
      },
    ],
  }
}
