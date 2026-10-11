import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { StudioGate } from "@/components/auth/studio-gate"
import { Workspace } from "@/components/workspace/workspace"

export default function Page() {
  return (
    <AuthProvider>
      <StudioGate>
        <Workspace />
      </StudioGate>
      <AuthModal />
    </AuthProvider>
  )
}
