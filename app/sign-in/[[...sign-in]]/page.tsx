import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { authAppearance } from '@/lib/clerk-appearance'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <SignIn appearance={authAppearance} />
      <div className="flex gap-4 text-xs text-muted-foreground">
        <Link href="/privacidad" className="underline-offset-4 hover:underline">
          Política de privacidad
        </Link>
        <Link href="/soporte" className="underline-offset-4 hover:underline">
          Soporte
        </Link>
      </div>
    </div>
  )
}
