import { FileText } from "lucide-react"
import { LegalDocContent } from "@/components/auth/legal-modals"

export const metadata = {
  title: "Terms of Service — BandMate Studio",
}

export default function TermsPage() {
  return (
    <main className="min-h-dvh w-full bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="size-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-black tracking-tight text-white">
              BandMate Terms of Service
            </h1>
            <p className="text-xs font-mono text-zinc-400">
              Creative Studio Aid Disclaimers &amp; Usage Terms
            </p>
          </div>
        </div>
        <LegalDocContent type="terms" />
      </div>
    </main>
  )
}
