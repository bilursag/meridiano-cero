import { MailIcon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const FAQS = [
  {
    question: '¿Cómo creo un nuevo grupo?',
    answer:
      'Ve a "Grupos" en el menú lateral y usa el botón "Nuevo grupo". Se generarán automáticamente los códigos de acceso para apoderados y coordinador.',
  },
  {
    question: '¿Cómo genero un código de acceso adicional?',
    answer:
      'En "Códigos" puedes generar nuevos códigos para cualquier grupo existente, ya sea para apoderados o coordinadores, y revocarlos cuando ya no sean necesarios.',
  },
  {
    question: '¿Cómo invito a otro administrador?',
    answer:
      'En "Equipo" usa el botón "Invitar administrador". Si ese correo ya tiene cuenta, su acceso de administrador se activa de inmediato. Si no, la persona recibe un correo y, al registrarse con ese enlace, su acceso se activa automáticamente. Invitar de nuevo el mismo correo reenvía la invitación.',
  },
  {
    question: '¿Por qué un grupo no aparece en el mapa operativo?',
    answer:
      'El mapa operativo solo muestra grupos que no estén marcados como "Finalizado". Si un grupo no tiene señal de ubicación reciente, se muestra en su posición inicial.',
  },
  {
    question: '¿Cómo cambio el estado de un grupo manualmente?',
    answer:
      'Entra al detalle del grupo desde "Grupos" y usa el selector de estado en la parte superior. Los administradores pueden anular el estado reportado por el coordinador.',
  },
]

export default function AdminHelpPage() {
  return (
    <>
      <SiteHeader title="Ayuda" subtitle="Preguntas frecuentes y soporte" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <Card key={faq.question}>
                <CardHeader>
                  <CardTitle className="text-base">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{faq.answer}</CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">¿Necesitas más ayuda?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>Escríbenos y te ayudamos a resolver cualquier duda sobre la plataforma.</p>
              <a
                href="mailto:soporte@meridianocero.cl"
                className="flex items-center gap-2 font-medium text-foreground hover:underline"
              >
                <MailIcon className="size-4" />
                soporte@meridianocero.cl
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
