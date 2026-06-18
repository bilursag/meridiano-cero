'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { ACCESS_CODES } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const DEMO_CODES = [
  { code: 'BAR-2026', role: 'Apoderado' },
  { code: 'MON-2026', role: 'Monitor' },
  { code: 'ADMIN-2026', role: 'Administrador' },
]

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const entry = ACCESS_CODES[code.trim().toUpperCase()]
    if (!entry) {
      setError('Código no válido. Verifica e intenta nuevamente.')
      setLoading(false)
      return
    }
    sessionStorage.setItem('mc_session', JSON.stringify({ code: code.trim().toUpperCase(), ...entry }))
    setTimeout(() => {
      if (entry.role === 'admin') router.push('/admin')
      else if (entry.role === 'monitor') router.push(`/monitor/${entry.tripId}`)
      else router.push(`/apoderado/${entry.tripId}`)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-4">
            <MapPin size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Meridiano Cero</h1>
          <p className="text-slate-400 text-sm mt-1">Seguimiento de giras escolares</p>
        </div>

        {/* Login card */}
        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Ingresar</CardTitle>
            <CardDescription>
              Ingresa el código de acceso que te entregó el coordinador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código de gira</Label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ej. BAR-2026"
                    className="pl-8 font-mono tracking-widest uppercase"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={!code.trim() || loading}>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo codes */}
        <Card className="border-0 bg-white/5 backdrop-blur">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Accesos de demo
            </p>
            <div className="space-y-2">
              {DEMO_CODES.map(({ code: c, role }) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCode(c)}
                  className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                >
                  <span className="font-mono text-xs bg-white/10 text-white px-2 py-1 rounded font-semibold">
                    {c}
                  </span>
                  <span className="text-slate-400 text-sm">{role}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
