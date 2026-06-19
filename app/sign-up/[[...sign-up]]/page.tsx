import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp
        appearance={{
          variables: {
            colorBackground: "var(--color-card)",
            colorPrimary: "var(--color-primary)",
            borderRadius: "0.5rem",
          },
          elements: {
            card: "border border-border bg-card text-card-foreground shadow-sm",
            headerTitle: "text-card-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "border-border bg-background text-foreground",
            formFieldInput: "border-input bg-background text-foreground",
            footerActionText: "text-muted-foreground",
            footerActionLink: "text-foreground",
          },
        }}
      />
    </div>
  )
}
