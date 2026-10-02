import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerk-appearance'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <SignIn appearance={authAppearance} />
      <Link href="/privacidad" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
        Política de privacidad
      </Link>
    </div>
  )
}
