import type { ModuleDef } from "./modules"

export function ModulePlaceholder({ module }: { module: ModuleDef }) {
  const Icon = module.icon
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-card text-primary">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-balance text-xl font-semibold">{module.name}</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{module.description}</p>
        <p className="pt-2 font-mono text-xs uppercase tracking-widest text-primary/70">Coming in a later phase</p>
      </div>
    </div>
  )
}
