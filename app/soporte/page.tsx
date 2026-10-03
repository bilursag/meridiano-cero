import type { Metadata } from 'next'
import Link from 'next/link'
import { EmailLink, List, PublicPage, Section } from '@/components/public-page'
import { COMPANY } from '@/lib/company'

// Public page: Apple requires a support URL for the app, and Google Play an account-deletion URL
// (this page's #eliminar-cuenta section). Keep the steps in sync with the mobile app.
export const metadata: Metadata = {
  title: 'Soporte · Meridiano Cero',
  description: 'Ayuda para usar la app de Meridiano Cero: acceso a la gira, contraseña, ubicación y eliminación de la cuenta.',
}

export default function SupportPage() {
  return (
    <PublicPage title="Soporte">
      <p>
        La app de Meridiano Cero permite a apoderados, alumnos y coordinadores seguir una gira de estudio: el
        itinerario día por día, los comunicados del equipo y, para los apoderados, la ubicación del grupo. Si tienes un
        problema, revisa estas respuestas o escríbenos.
      </p>

      <Section title="Contacto">
        <List
          items={[
            <>
              <strong>Correo:</strong> <EmailLink email={COMPANY.email} />
            </>,
            <>
              <strong>Teléfono:</strong> {COMPANY.phones.join(' / ')}
            </>,
          ]}
        />
        <p>Indícanos tu nombre, el correo de tu cuenta y el colegio o grupo de la gira, para ayudarte más rápido.</p>
      </Section>

      <Section title="Preguntas frecuentes">
        <Question title="¿Cómo entro a la gira de mi hijo o de mi curso?">
          Crea tu cuenta en la app con tu correo y canjea el código que te entregó el colegio o el equipo de Meridiano
          Cero. Hay un código para apoderados, uno para alumnos y uno para coordinadores: cada uno abre la vista que
          corresponde. Si no tienes código, pídelo al colegio.
        </Question>
        <Question title="Olvidé mi contraseña">
          Entra a <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">app.meridianocero.cl</Link>{' '}
          desde el navegador, escribe tu correo y elige «¿Olvidaste tu contraseña?». Recibirás un código por correo para
          crear una nueva; después vuelve a la app e inicia sesión con ella.
        </Question>
        <Question title="Me pide un código al iniciar sesión">
          Por seguridad, al entrar desde un teléfono nuevo te enviamos un código a tu correo. Revisa también la carpeta
          de spam.
        </Question>
        <Question title="La ubicación del grupo no se actualiza">
          La ubicación la envía el teléfono del coordinador mientras tiene la app abierta y la transmisión activada. Si
          el grupo pasa por zonas sin señal, se pausa y vuelve sola al recuperar cobertura. En el mapa verás cuánto
          hace de la última actualización («Actualizado hace 5 min»).
        </Question>
        <Question title="Ya no veo mi gira">
          Puede que el colegio o el equipo te haya quitado del grupo, o que la gira haya terminado y se haya eliminado.
          Si crees que es un error, pide un código nuevo.
        </Question>
      </Section>

      <Section id="eliminar-cuenta" title="Eliminar tu cuenta">
        <p>Puedes eliminar tu cuenta y tus datos de acceso cuando quieras, desde la app:</p>
        <List
          ordered
          items={[
            'Abre la app de Meridiano Cero e inicia sesión.',
            'Ve a la pestaña «Perfil».',
            'Toca «Eliminar cuenta» y confirma.',
          ]}
        />
        <p>
          Se eliminan tu nombre, tu correo, tu contraseña y tu acceso a las giras. Si no puedes entrar a la app, o
          quieres que eliminemos cualquier otro dato asociado a ti, escríbenos a <EmailLink email={COMPANY.email} />{' '}
          desde el correo de tu cuenta y lo haremos en un plazo máximo de 30 días corridos. Los datos generales de la
          gira (itinerario, comunicados del equipo) no son datos tuyos y se mantienen según los plazos de la{' '}
          <Link href="/privacidad" className="font-medium text-foreground underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
      </Section>

      <Section title="Privacidad">
        <p>
          Cómo tratamos tus datos, quién los ve y cómo ejercer tus derechos está en la{' '}
          <Link href="/privacidad" className="font-medium text-foreground underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
      </Section>
    </PublicPage>
  )
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p>{children}</p>
    </div>
  )
}
