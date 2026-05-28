import { ExampleCard } from './components/ExampleCard'
import { useExampleData } from './hooks/useExampleData'

export function ExampleView() {
  const { headline, description, highlights } = useExampleData()

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            AI App Builder
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{headline}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((highlight) => (
            <ExampleCard key={highlight.title} highlight={highlight} />
          ))}
        </div>
      </section>
    </main>
  )
}
