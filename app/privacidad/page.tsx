import type { Metadata } from 'next'
import Link from 'next/link'

// Public page: app stores require a reachable privacy-policy URL. The mobile app opens this same page,
// so it is the single source of truth — keep it in sync with what the platform actually collects.
export const metadata: Metadata = {
  title: 'Política de privacidad · Meridiano Cero',
  description: 'Cómo Meridiano Cero trata los datos personales en su plataforma de giras de estudio y su app móvil.',
}

const LAST_UPDATED = '3 de octubre de 2026'

const COMPANY = {
  name: 'Sociedad Anónima Meridiano Cero SpA',
  rut: '76.016.556-5',
  address: 'Avenida Presidente Bulnes 209, oficina 71, Santiago, Chile',
  email: 'contacto@meridianocero.cl',
  phones: ['+56 2 6469 1951', '+56 9 3269 1136'],
}

const collectedData = [
  {
    who: 'Todo usuario con cuenta',
    data: 'Nombre, correo electrónico, contraseña y, si se habilita, datos básicos de su cuenta de Google',
    source: 'Los entrega el usuario al registrarse, o el equipo de Meridiano Cero al invitarlo',
  },
  {
    who: 'Todo usuario con cuenta',
    data: 'Datos técnicos de la sesión: dirección IP, tipo de dispositivo, navegador, fecha y hora de acceso',
    source: 'Se generan automáticamente al usar la plataforma',
  },
  {
    who: 'Coordinadores',
    data: 'Ubicación del teléfono mientras transmiten la ruta del grupo (ver sección 4)',
    source: 'La app la lee del GPS, solo con permiso y con la transmisión activada',
  },
  {
    who: 'Coordinadores',
    data: 'Fotos de actividades y avisos, y su nombre como autor de cada aviso',
    source: 'Las sube el coordinador desde la cámara o la galería',
  },
  {
    who: 'Apoderados y estudiantes',
    data: 'Gira a la que pertenecen y rol dentro de ella',
    source: 'Se vinculan con un código de acceso o una invitación por correo',
  },
  {
    who: 'Equipo de Meridiano Cero',
    data: 'Registro de cambios y alertas de las giras',
    source: 'Se genera al usar el panel de administración',
  },
]

const purposes = [
  ['Crear y administrar cuentas, y dar a cada persona acceso solo a sus giras', 'Ejecución del contrato de servicio de la gira'],
  ['Mostrar a apoderados el itinerario, los avisos, las fotos y la ubicación del grupo', 'Ejecución del contrato de servicio de la gira'],
  ['Mostrar al equipo de Meridiano Cero el estado y la ubicación de los grupos en viaje', 'Ejecución del contrato y seguridad de los pasajeros'],
  ['Transmitir la ubicación del coordinador', 'Consentimiento, otorgado al activar el permiso de ubicación'],
  ['Enviar correos de verificación, invitación y recuperación de contraseña', 'Ejecución del contrato'],
  ['Prevenir accesos indebidos, limitar intentos de códigos y detectar errores técnicos', 'Interés legítimo en mantener la plataforma segura'],
  ['Cumplir obligaciones legales o requerimientos de autoridades', 'Obligación legal'],
]

const providers = [
  ['Clerk', 'Inicio de sesión y gestión de cuentas', 'Nombre, correo, contraseña (guardada cifrada; Meridiano Cero no puede verla) y datos técnicos de la sesión'],
  ['Vercel', 'Alojamiento de la plataforma, almacenamiento de fotos y estadísticas de visitas', 'Todo lo que pasa por la plataforma, incluidas las fotos'],
  ['Neon', 'Base de datos', 'Datos de giras, itinerarios, avisos, ubicaciones y vínculos de usuarios'],
  ['Google (Google Maps)', 'Mapa dentro de la app móvil', 'Zona del mapa consultada y dirección IP'],
  ['OpenStreetMap', 'Mapa en la plataforma web', 'Zona del mapa consultada y dirección IP'],
]

const retention = [
  ['Historial de ubicación del grupo', '30 días después del término de la gira'],
  ['Fotos y avisos de la gira', '12 meses después del término de la gira'],
  ['Itinerario y datos generales de la gira', 'Mientras exista la relación con el colegio, y luego el plazo que exija la ley'],
  ['Cuenta de usuario', 'Hasta que el usuario pida eliminarla, o 24 meses sin actividad'],
  ['Registros técnicos y de errores', '12 meses'],
]

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-10 space-y-3">
        <Link href="/" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/LOGOS/logo-meridiano-naranja.svg" alt="Meridiano Cero" className="h-8 w-auto" />
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Política de privacidad</h1>
        <p className="text-sm text-muted-foreground">Última actualización: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-10 text-[15px] leading-relaxed text-foreground/90">
        <Section title="1. Quiénes somos y a qué se aplica esta política">
          <p>
            {COMPANY.name}, RUT {COMPANY.rut}, con domicilio en {COMPANY.address}, que opera bajo el nombre Meridiano
            Cero (&quot;Meridiano Cero&quot;, &quot;nosotros&quot;), es responsable del tratamiento de los datos
            personales descritos en esta política.
          </p>
          <p>La política se aplica a:</p>
          <List
            items={[
              'La plataforma web de gestión de giras de estudio, en app.meridianocero.cl.',
              'La aplicación móvil Meridiano Cero para Android y iOS.',
            ]}
          />
          <p>
            Ambas se usan para coordinar giras de estudio: el equipo de Meridiano Cero administra los grupos, los
            coordinadores informan en terreno y los apoderados siguen el avance del viaje. No se aplica al sitio
            informativo meridianocero.cl ni a otros servicios de terceros enlazados desde la plataforma.
          </p>
        </Section>

        <Section title="2. Qué datos recopilamos">
          <p>
            Recopilamos solo los datos necesarios para coordinar la gira. La ficha de cada grupo no guarda nombres, RUT,
            fechas de nacimiento ni datos de salud de los estudiantes: registra solo cuántos estudiantes y acompañantes
            viajan. Los alumnos que crean su propia cuenta para usar la app quedan registrados con su nombre y correo,
            como cualquier usuario.
          </p>
          <Table
            head={['Quién', 'Datos', 'Cómo los obtenemos']}
            rows={collectedData.map((row) => [row.who, row.data, row.source])}
          />
          <p>
            De cada gira guardamos además: colegio, curso, número de grupo, destino, fechas, itinerario, hotel,
            ejecutivo de ventas a cargo y cantidad de estudiantes y acompañantes por sexo.
          </p>
          <p>
            Para medir el rendimiento del sitio usamos estadísticas de visitas agregadas que no usan cookies
            publicitarias ni identifican a las personas.
          </p>
        </Section>

        <Section title="3. Para qué usamos los datos">
          <p>
            Usamos los datos únicamente para operar las giras y la plataforma. No los vendemos, no los arrendamos y no
            los usamos para publicidad.
          </p>
          <Table head={['Finalidad', 'Fundamento']} rows={purposes} />
        </Section>

        <Section title="4. Ubicación durante las giras">
          <p>
            Solo el teléfono del coordinador comparte ubicación, y representa la posición del grupo completo. Los
            apoderados y los estudiantes nunca comparten su ubicación.
          </p>
          <List
            items={[
              <>
                <strong>Cuándo:</strong> solo mientras el coordinador tiene activada la transmisión y la app abierta en
                pantalla. Se envía una posición cada 15 segundos aproximadamente. Si la app pasa a segundo plano, la
                transmisión se pausa.
              </>,
              <>
                <strong>Con permiso:</strong> el sistema del teléfono pide autorización la primera vez. El coordinador
                puede desactivar la transmisión en la app o retirar el permiso en los ajustes del teléfono en cualquier
                momento.
              </>,
              <>
                <strong>Qué se guarda:</strong> latitud, longitud, precisión y hora, asociadas a la gira y no a una
                persona.
              </>,
              <>
                <strong>Quién la ve:</strong> los apoderados y participantes de esa gira, que ven la última posición del
                grupo, y el equipo de Meridiano Cero.
              </>,
            ]}
          />
        </Section>

        <Section title="5. Datos de niños, niñas y adolescentes">
          <p>
            Los estudiantes que viajan suelen ser menores de edad, por lo que tratamos sus datos con especial cuidado y
            siempre en su interés superior.
          </p>
          <List
            items={[
              <>
                <strong>Fotos:</strong> las fotos de actividades pueden mostrar a estudiantes. Solo las ven los
                apoderados y participantes de esa gira y el equipo de Meridiano Cero. Se publican con un enlace difícil
                de adivinar, no aparecen en buscadores y no se usan con fines publicitarios sin una autorización aparte.
                La autorización de uso de imagen se obtiene de los apoderados al contratar la gira.
              </>,
              <>
                <strong>Pautas para coordinadores:</strong> preferir fotos grupales y evitar imágenes que muestren a un
                estudiante en situaciones privadas o que permitan ubicarlo fuera de la gira.
              </>,
              <>
                <strong>Cuentas de estudiantes:</strong> son opcionales. Un alumno puede crear su cuenta en la app y unirse
                a su gira con el código de alumno que entrega el colegio o el equipo de Meridiano Cero, o por invitación
                por correo. Con esa cuenta solo ve el itinerario y los comunicados de su gira, y no comparte su
                ubicación. Las cuentas de menores de 14 años requieren la autorización de su padre, madre o apoderado.
              </>,
              <>
                <strong>Datos mínimos:</strong> no registramos RUT, fechas de nacimiento, datos de salud ni otros datos
                sensibles de los estudiantes. De quienes crean su cuenta guardamos solo su nombre y correo.
              </>,
            ]}
          />
        </Section>

        <Section title="6. Con quién compartimos los datos">
          <p>
            Compartimos datos solo con los proveedores tecnológicos que hacen funcionar la plataforma, que los tratan
            por encargo nuestro y no pueden usarlos para fines propios.
          </p>
          <Table head={['Proveedor', 'Para qué', 'Datos que recibe']} rows={providers} />
          <p>
            También podemos entregar datos a tribunales o autoridades cuando la ley lo exija. Dentro de cada gira, los
            apoderados y participantes ven el itinerario, los avisos, las fotos y la ubicación del grupo, pero no los
            datos de contacto de otros apoderados. Los coordinadores ven el nombre y el correo de los apoderados y
            participantes de su propio grupo, para poder coordinarse con ellos.
          </p>
        </Section>

        <Section title="7. Dónde se almacenan los datos">
          <p>
            La plataforma y su base de datos funcionan en servidores ubicados en São Paulo, Brasil. Algunos
            proveedores, como Clerk, procesan datos en Estados Unidos. Las fotos se almacenan en la infraestructura de
            Vercel.
          </p>
          <p>
            Esto implica una transferencia internacional de datos. La hacemos solo con proveedores que ofrecen
            garantías de protección adecuadas, mediante contratos que los obligan a mantener la confidencialidad y
            seguridad de los datos y a usarlos solo para prestar su servicio.
          </p>
        </Section>

        <Section title="8. Cuánto tiempo conservamos los datos">
          <p>Conservamos los datos solo mientras sirven para la gira o para cumplir obligaciones legales.</p>
          <Table head={['Datos', 'Plazo']} rows={retention} />
          <p>
            Al eliminar una gira se borran también su itinerario, sus avisos, sus fotos, su historial de ubicación y los
            vínculos de los usuarios con ella.
          </p>
        </Section>

        <Section title="9. Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas para proteger los datos contra pérdida, acceso no autorizado o
            modificación:
          </p>
          <List
            items={[
              'Toda la comunicación con la plataforma y la app viaja cifrada (HTTPS).',
              'Las contraseñas se guardan cifradas por nuestro proveedor de autenticación; nadie en Meridiano Cero puede verlas.',
              'Al iniciar sesión desde un dispositivo nuevo se pide un código enviado por correo.',
              'Cada persona ve solo las giras a las que pertenece, según su rol. Solo el equipo de Meridiano Cero accede al panel de administración.',
              'Los códigos de acceso a las giras tienen un límite de intentos para evitar que se adivinen.',
              'En el teléfono, la sesión se guarda en el almacenamiento seguro del sistema.',
            ]}
          />
          <p>
            Si ocurre un incidente de seguridad que afecte datos personales, lo informaremos a la autoridad competente
            y a las personas afectadas en los plazos que exija la ley.
          </p>
        </Section>

        <Section title="10. Sus derechos">
          <p>
            Usted puede ejercer en cualquier momento, y sin costo, los derechos que le reconoce la legislación chilena
            de protección de datos personales:
          </p>
          <List
            items={[
              <><strong>Acceso:</strong> saber qué datos suyos tenemos y cómo los usamos.</>,
              <><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</>,
              <><strong>Supresión:</strong> pedir que eliminemos sus datos, incluida su cuenta.</>,
              <><strong>Oposición:</strong> oponerse a un tratamiento basado en nuestro interés legítimo.</>,
              <><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y de uso común.</>,
              <>
                <strong>Bloqueo:</strong> pedir que suspendamos temporalmente el uso de sus datos mientras se resuelve
                una solicitud.
              </>,
              <><strong>Retirar su consentimiento,</strong> por ejemplo desactivando el permiso de ubicación.</>,
            ]}
          />
          <p>
            Para ejercerlos, escriba a <EmailLink /> desde el correo asociado a su cuenta e indique qué derecho quiere
            ejercer. Responderemos en un plazo máximo de 30 días corridos. Los padres, madres y apoderados pueden
            ejercer estos derechos en nombre de los estudiantes menores de edad a su cargo.
          </p>
          <p>
            Si considera que no hemos atendido bien su solicitud, puede reclamar ante la Agencia de Protección de Datos
            Personales.
          </p>
        </Section>

        <Section title="11. Cambios y contacto">
          <p>
            Podemos actualizar esta política cuando cambien las funciones de la plataforma o la ley. Publicaremos la
            versión vigente en esta página con su fecha de actualización y, si el cambio es importante, lo avisaremos
            dentro de la plataforma o por correo antes de que entre en vigor.
          </p>
          <p>Para cualquier consulta sobre esta política o sobre sus datos:</p>
          <List
            items={[
              <><strong>Responsable:</strong> {COMPANY.name}, RUT {COMPANY.rut}</>,
              <><strong>Correo:</strong> <EmailLink /></>,
              <><strong>Teléfono:</strong> {COMPANY.phones.join(' / ')}</>,
              <><strong>Dirección:</strong> {COMPANY.address}</>,
            ]}
          />
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-3 py-2 font-medium text-foreground">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmailLink() {
  return (
    <a href={`mailto:${COMPANY.email}`} className="font-medium text-foreground underline underline-offset-4">
      {COMPANY.email}
    </a>
  )
}
