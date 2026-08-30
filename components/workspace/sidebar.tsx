import { MODULES } from "./modules"
import { cn } from "@/lib/utils"
import { Sparkles, Layers } from "lucide-react"
import { TrebleClefIcon } from "@/components/ui/treble-clef-icon"

interface SidebarProps {
  active: string
  onSelect: (id: string) => void
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const activeModules = MODULES.filter((m) => m.available)
  const upcomingCount = MODULES.filter((m) => !m.available).length

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center justify-between border-r border-border/80 bg-card/50 py-4 md:w-56 md:items-stretch md:px-3 backdrop-blur-md">
      <div>
        {/* Brand Header */}
        <div className="mb-6 flex items-center gap-3 px-1 md:px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-md shadow-amber-500/20">
            <TrebleClefIcon className="size-5.5 fill-current" />
          </div>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="font-mono text-sm font-bold tracking-tight text-foreground">BandMate</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">Studio</span>
          </div>
        </div>

        {/* Active Navigation Modules */}
        <nav className="flex flex-col gap-1.5" aria-label="Workspace modules">
          {activeModules.map((mod) => {
            const Icon = mod.icon
            const isActive = mod.id === active
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelect(mod.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-0 py-2.5 text-sm font-semibold transition-all duration-150 md:px-3 cursor-pointer",
                  "justify-center md:justify-start",
                  isActive
                    ? "bg-primary/15 text-primary shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="hidden flex-1 truncate text-left md:inline">{mod.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Roadmap Teaser */}
      <div className="hidden px-2 pt-4 border-t border-border/60 md:block">
        <div className="rounded-xl border border-border/50 bg-background/40 p-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            <span>Studio Roadmap</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {upcomingCount} modules in development (Gesture Play, Setlists, AI Medleys).
          </p>
        </div>
      </div>
    </aside>
  )
}
