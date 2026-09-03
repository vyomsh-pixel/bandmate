import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { Workspace } from "@/components/workspace/workspace"

export default function Page() {
  return (
    <AuthProvider>
      <Workspace />
      <AuthModal />
    </AuthProvider>
  )
}
