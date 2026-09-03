"use client"

import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogIn, LogOut, CloudCheck, Sparkles, Music } from "lucide-react"

export interface UserProfileButtonProps {
  savedSongsCount?: number
}

export function UserProfileButton({ savedSongsCount = 0 }: UserProfileButtonProps) {
  const { user, openAuthModal, logout } = useAuth()

  if (!user || user.isGuest) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => openAuthModal("login")}
        className="h-8.5 px-2.5 gap-1.5 rounded-xl border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 text-xs font-bold shadow-xs cursor-pointer"
        title="Sign in or create an account to sync songs"
      >
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">Log In / Sign Up</span>
        <span className="sm:hidden">Log In</span>
      </Button>
    )
  }

  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2 py-1 hover:border-amber-400/50 transition-all cursor-pointer shadow-xs"
          aria-label="User account menu"
        >
          {/* Avatar Badge */}
          <div className="size-6.5 rounded-lg bg-amber-400 text-black font-mono font-black text-[11px] flex items-center justify-center shadow-xs">
            {initials || "U"}
          </div>

          <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
            <span className="font-mono text-xs font-bold text-white truncate max-w-[100px]">
              {user.displayName}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Synced
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2 space-y-2 z-50 bg-zinc-950 border-zinc-800 text-zinc-100 rounded-xl shadow-2xl">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
          <div className="size-8 rounded-lg bg-amber-400 text-black font-mono font-black text-xs flex items-center justify-center shrink-0">
            {initials || "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono font-bold text-white truncate">{user.displayName}</span>
            <span className="text-[10px] text-zinc-400 truncate">{user.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1">
          <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-center">
            <Music className="size-3.5 text-amber-400 mb-0.5" />
            <span className="font-mono text-xs font-bold text-white">{savedSongsCount}</span>
            <span className="text-[9px] text-zinc-400 font-mono">Songs Saved</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-center">
            <CloudCheck className="size-3.5 text-emerald-400 mb-0.5" />
            <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">Cloud Active</span>
            <span className="text-[9px] text-zinc-400 font-mono">Auto-Sync</span>
          </div>
        </div>

        <div className="my-1 border-t border-zinc-800" />

        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-rose-400 focus:bg-rose-950/40 focus:text-rose-300 font-bold text-xs py-2 rounded-lg"
        >
          <LogOut className="mr-2 size-3.5" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
