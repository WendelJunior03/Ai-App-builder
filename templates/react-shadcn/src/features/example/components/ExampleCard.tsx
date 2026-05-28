import type { ExampleHighlight } from '../types'

type ExampleCardProps = {
  highlight: ExampleHighlight
}

export function ExampleCard({ highlight }: ExampleCardProps) {
  return (
    <article className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <h2 className="text-base font-semibold">{highlight.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {highlight.description}
      </p>
    </article>
  )
}
