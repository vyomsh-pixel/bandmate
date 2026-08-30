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
    <>
      {/* Desktop Vertical Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col justify-between border-r border-border/80 bg-card/50 py-4 px-3 backdrop-blur-md">
        <div>
          {/* Brand Header */}
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-md shadow-amber-500/20">
              <TrebleClefIcon className="size-5.5 fill-current" />
            </div>
            <div className="flex flex-col leading-tight">
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
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-primary/15 text-primary shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                  )}
                  <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                  <span className="flex-1 truncate text-left">{mod.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer Roadmap Teaser */}
        <div className="px-2 pt-4 border-t border-border/60">
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

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 h-13 items-center justify-around border-t border-border/80 bg-background/95 px-2 backdrop-blur-xl shadow-lg"
      >
        <div className="flex items-center gap-1.5 mr-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-xs">
            <TrebleClefIcon className="size-4.5 fill-current" />
          </div>
          <span className="font-mono text-xs font-black text-foreground">BandMate</span>
        </div>

        <div className="flex items-center gap-1">
          {activeModules.map((mod) => {
            const Icon = mod.icon
            const isActive = mod.id === active
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelect(mod.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{mod.name}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
