# Guía de uso — Meridiano Cero

Esta guía explica cómo usar la plataforma en el día a día, sin entrar en detalles técnicos. Si buscas cómo está construido el sistema por dentro, revisa `docs/SISTEMA.md`.

## ¿Qué es Meridiano Cero?

Una plataforma para seguir giras escolares (viajes de curso) mientras están en terreno: dónde está el grupo ahora, qué actividad están haciendo, y avisos importantes (llegadas, logros, alertas), todo en tiempo real.

Hay tres tipos de personas que la usan:

- **Administrador** — El equipo de la empresa que organiza las giras. La usa en el panel web, desde un computador.
- **Monitor / Coordinador** — La persona que acompaña al grupo en el viaje. La usa en la app del celular.
- **Apoderado** — La familia del alumno, siguiendo desde casa. La usa en la app del celular.

## Cómo entrar por primera vez

- **Administrador**: te crean una cuenta o te dan acceso de administrador directamente. Entras con tu correo en la página de inicio de sesión del panel.
- **Monitor y Apoderado**: el administrador te entrega un **código** (una combinación de letras y números, por ejemplo `A3F9K2`). Con ese código te registras o inicias sesión en la app, y el sistema te conecta automáticamente al grupo correspondiente. Si tienes más de un grupo asociado a tu cuenta (por ejemplo, dos hijos en giras distintas), la app te deja elegir cuál ver.
- Si perdiste tu código o no te llegó, pídele uno nuevo al administrador — cada código sirve solo para un rol y un grupo específico, y se puede generar de nuevo cuantas veces sea necesario.

---

## Para el Administrador

Todo el trabajo del administrador ocurre en el panel web. El menú lateral tiene estas secciones:

### Crear un grupo (gira)

Hay dos formas:

1. **Uno por uno**, con el botón "Nuevo grupo": llenas colegio, curso, ejecutivo, destino, fechas, cantidad de alumnos y acompañantes (separados por género), hotel y el programa (itinerario) que va a seguir. El nombre del grupo se arma solo a partir de esos datos, pero lo puedes cambiar si quieres. Al final se generan automáticamente tres códigos: uno para apoderados, uno para el monitor y uno para alumnos.

2. **Carga masiva desde Excel**, en la sección "Importar": subes la planilla de planificación que usa el equipo de operaciones, y el sistema arma una fila por grupo, resolviendo solo el destino, el colegio, la duración y los códigos de acceso. Solo tienes que revisar las filas, indicar a qué programa corresponde cada una, y confirmar. Las filas con algún dato faltante o dudoso quedan marcadas con una advertencia y no se importan hasta que las revises.

### Ver el estado de los grupos

La sección **Giras** (o "Grupos") muestra una tabla con todos los grupos: colegio, ejecutivo, cantidad de pasajeros, destino, estado actual y fechas. Se puede buscar y filtrar por colegio, destino, coordinador o ejecutivo. El botón "Columnas" permite ocultar las que no necesites ver.

El **Mapa operativo** muestra en un mapa a todos los grupos que están en terreno en este momento, con su última ubicación conocida.

### Armar el itinerario de un grupo

Cada grupo tiene una ficha con pestañas: **Resumen**, **Itinerario** (día por día, cada actividad con hora, lugar y descripción), **Comunicados** (historial de avisos enviados) y **Personas** (apoderados, monitores y sus códigos).

Los itinerarios se arman a partir de **Programas**: plantillas reutilizables de actividades que se pueden aplicar a cualquier grupo. Así no hay que escribir el mismo itinerario cada vez que sale un grupo al mismo destino con el mismo programa.

### Notificaciones

La campana arriba a la derecha avisa cuando pasa algo importante en terreno: un coordinador reporta una **alerta** o un **logro**, un coordinador nuevo se une a un grupo, o un coordinador cambia el estado del grupo. El número rojo indica cuántas no has visto; al abrir la campana se marcan como vistas, y al hacer clic en una vas directo a la ficha del grupo.

Las alertas además aparecen como un aviso rojo en pantalla apenas llegan (dentro de unos 30 segundos), aunque estés en otra sección del panel.

Si la plataforma falla (por ejemplo, una página que no carga para un apoderado o coordinador), también aparece en la campana como **Error en el servidor** o **Error en el navegador**, con la página afectada. No hay que hacer nada con ellas en el panel: sirven para enterarse a tiempo y avisarle al equipo técnico, indicando la referencia (`ref.`) si aparece.

### Otras secciones útiles

- **Equipo**: quiénes son administradores y quiénes son monitores en la plataforma.
- **Usuarios**: todas las personas registradas, sin importar a qué grupo pertenecen.
- **Reportes**: alertas y logros que los monitores marcaron en terreno, exportables a Excel/CSV.
- **Colegios**: cuántas giras tiene cada colegio, cuántas están activas.
- **Códigos**: todos los códigos de acceso generados, para revocarlos o volver a generarlos.
- **Mensajes**: las plantillas de comunicado que puede usar el monitor (así no redacta texto libre en terreno).
- **Actividades**: actividades genéricas reutilizables para armar itinerarios más rápido.

---

## Para el Monitor / Coordinador

Se usa desde el celular durante el viaje. Al entrar, la pantalla muestra:

- **Transmitir ubicación**: un botón para activar el GPS. Mientras está activo, el grupo aparece en el mapa del administrador y de los apoderados, actualizándose cada 15 segundos.
- **Actividad actual**: la próxima actividad del itinerario, con tres botones para avisar en qué etapa está el grupo — **En ruta**, **En actividad** (te pide subir una foto) y **Terminada**. Cada cambio de estado avisa automáticamente a los apoderados, sin que tengas que escribir nada.
- **Itinerario completo**: todas las actividades del viaje agrupadas por día, con las mismas opciones de estado y foto para cada una.
- **Publicar comunicado**: elegir un mensaje ya escrito (por ejemplo, "Llegamos al hotel" o "Actividad reprogramada por lluvia") y enviarlo a todos los apoderados del grupo. No se escribe texto libre — se elige entre las plantillas que dejó preparadas el administrador.

## Para el Apoderado

Se usa desde el celular, de forma solo de consulta (no se puede editar nada):

- **Inicio**: la última ubicación conocida del grupo en el mapa, qué actividad están haciendo ahora, el último comunicado, y datos rápidos (cuántos alumnos, en qué día del viaje van, destino).
- **Itinerario**: el plan completo día por día, con el estado de cada actividad.
- **Comunicados**: el historial completo de avisos del viaje.
- **Mapa**: la vista de mapa a pantalla completa.

---

## Preguntas frecuentes

**¿Qué pasa si el monitor no tiene señal?**
El GPS y los comunicados necesitan conexión a internet para enviarse. Si el monitor recupera señal más tarde, puede retomar la transmisión y marcar las actividades pendientes; lo que haya quedado sin enviar no se guarda de forma retroactiva.

**¿Puedo cambiar el itinerario de un grupo que ya salió de viaje?**
Sí, el administrador puede editar el itinerario de una gira en cualquier momento desde su ficha, aunque el grupo ya esté en terreno.

**¿Un apoderado con dos hijos en el mismo viaje necesita dos códigos?**
No necesariamente — un mismo código de apoderado puede compartirse entre varias familias del mismo grupo, ya que el acceso es a nivel de grupo, no de alumno individual.

**¿Qué pasa si escribo mal un código al canjearlo?**
El sistema limita los intentos (10 cada 15 minutos) para evitar que alguien lo adivine por fuerza bruta. Si te quedas sin intentos, espera unos minutos o pide al administrador que te confirme el código correcto.

**¿Los administradores pueden ver todo?**
Sí. A diferencia de monitores y apoderados, que solo ven los grupos a los que fueron invitados, un administrador tiene acceso a todos los grupos de la plataforma.
