import { ApiError } from '@/lib/api/errors'

// Reads the project's Trello board (the team's Scrum board) for /admin/proyecto. The token only
// ever lives on the server: TRELLO_API_KEY + a read-only TRELLO_TOKEN, and TRELLO_BOARD_ID.

const TRELLO_API = 'https://api.trello.com/1'
/** Trello is asked again at most every 5 minutes; the page is a status view, not a live editor. */
const REVALIDATE_SECONDS = 300

export type ListKind = 'backlog' | 'refined' | 'sprint' | 'doing' | 'review' | 'done'
export type Layer = 'App' | 'Backend' | 'Web' | 'Infra' | 'Tiendas' | 'Docs' | 'Otro'

export type ProjectCard = {
  id: string
  code: string
  title: string
  layer: Layer
  epic: string | null
  labels: string[]
  listName: string
  listKind: ListKind
  sprint: number | null
  points: number | null
  completedAt: string | null
  story: string | null
  summary: string | null
  files: string | null
  snippet: { where: string; lang: string; code: string } | null
  checklists: { name: string; items: { name: string; done: boolean }[] }[]
  attachments: { id: string; name: string }[]
  url: string
}

export type ProjectEdge = { from: string; to: string; kind: 'depends' | 'closes' }

export type ProjectBoard = {
  boardName: string
  boardUrl: string
  currentSprint: number | null
  cards: ProjectCard[]
  edges: ProjectEdge[]
}

type TrelloLabel = { id: string; name: string }
type TrelloList = { id: string; name: string; pos: number }
type TrelloCheckItem = { name: string; state: 'complete' | 'incomplete'; pos: number }
type TrelloChecklist = { id: string; idCard: string; name: string; pos: number; checkItems: TrelloCheckItem[] }
type TrelloAttachment = { id: string; name: string; mimeType: string | null }
type TrelloCard = {
  id: string
  name: string
  desc: string
  idList: string
  idLabels: string[]
  due: string | null
  dueComplete: boolean
  shortUrl: string
  attachments: TrelloAttachment[]
}
type TrelloBoard = {
  name: string
  url: string
  labels: TrelloLabel[]
  lists: TrelloList[]
  cards: TrelloCard[]
  checklists: TrelloChecklist[]
}

function credentials() {
  const key = process.env.TRELLO_API_KEY
  const token = process.env.TRELLO_TOKEN
  const boardId = process.env.TRELLO_BOARD_ID
  if (!key || !token || !boardId) {
    throw new ApiError('NOT_FOUND', 'El tablero del proyecto no está configurado en este entorno.')
  }
  return { boardId, authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"` }
}

async function trelloFetch(path: string, authorization: string, init?: { revalidate?: number }) {
  const res = await fetch(`${TRELLO_API}${path}`, {
    headers: { Authorization: authorization, Accept: 'application/json' },
    next: { revalidate: init?.revalidate ?? REVALIDATE_SECONDS },
  })
  if (!res.ok) throw new Error(`Trello respondió ${res.status} en ${path.split('?')[0]}`)
  return res
}

const LAYERS: Layer[] = ['App', 'Backend', 'Web', 'Infra', 'Tiendas', 'Docs']
const CODE_PATTERN = /^([A-Z]\d{2}) · (?:\[([^\]]+)\] )?(.*?)(?: \((\d+)\))?$/

function listKind(name: string): ListKind {
  if (name.startsWith('Hecho')) return 'done'
  if (name.startsWith('En revisión')) return 'review'
  if (name.startsWith('En progreso')) return 'doing'
  if (name.startsWith('Sprint Backlog')) return 'sprint'
  if (name.startsWith('Refinado')) return 'refined'
  return 'backlog'
}

const sprintNumber = (name: string) => Number(name.match(/Sprint (\d+)/)?.[1]) || null

/** The value of a `**Field:** value` line in a card description written from the board template. */
function field(desc: string, label: string) {
  const value = desc.match(new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`, 'm'))?.[1]?.trim()
  return value && !value.startsWith('_(') ? value : null
}

function snippetOf(desc: string) {
  const m = desc.match(/\*\*Snippet:\*\* (.+)\n```(\w*)\n([\s\S]*?)\n```/)
  if (!m) return null
  return { where: m[1].replaceAll('`', ''), lang: m[2], code: m[3] }
}

const codesIn = (text: string | null) => text?.match(/\b[BWAIP]\d{2}\b/g) ?? []

export async function getProjectBoard(): Promise<ProjectBoard> {
  const { boardId, authorization } = credentials()
  const query = new URLSearchParams({
    fields: 'name,url',
    labels: 'all',
    label_fields: 'name',
    lists: 'open',
    list_fields: 'name,pos',
    cards: 'open',
    card_fields: 'name,desc,idList,idLabels,due,dueComplete,shortUrl',
    card_attachments: 'true',
    card_attachment_fields: 'name,mimeType',
    checklists: 'all',
    checklist_fields: 'name,idCard,pos',
  })
  const board: TrelloBoard = await (await trelloFetch(`/boards/${boardId}?${query}`, authorization)).json()

  const labelName = new Map(board.labels.map((l) => [l.id, l.name]))
  const listById = new Map(board.lists.map((l) => [l.id, l]))
  const sprintList = board.lists.find((l) => listKind(l.name) === 'sprint')
  const currentSprint = sprintList ? sprintNumber(sprintList.name) : null

  const cards: ProjectCard[] = []
  for (const card of board.cards) {
    const m = card.name.match(CODE_PATTERN)
    if (!m) continue
    const [, code, prefix, title, points] = m
    const list = listById.get(card.idList)
    if (!list) continue
    const kind = listKind(list.name)
    const labels = card.idLabels.map((id) => labelName.get(id)).filter((n): n is string => !!n)
    // The title's [prefix] wins: "Tiendas" is also a type label on cards of other layers.
    const layer = LAYERS.find((l) => prefix === l) ?? LAYERS.find((l) => labels.includes(l)) ?? 'Otro'

    cards.push({
      id: card.id,
      code,
      title,
      layer,
      epic: labels.find((l) => l.startsWith('Épica: '))?.slice('Épica: '.length) ?? null,
      labels,
      listName: list.name,
      listKind: kind,
      // Work in progress and in review belongs to the running sprint.
      sprint: sprintNumber(list.name) ?? (kind === 'doing' || kind === 'review' ? currentSprint : null),
      points: points ? Number(points) : null,
      completedAt: card.dueComplete ? card.due : null,
      story: field(card.desc, 'Historia'),
      summary: field(card.desc, 'Qué hace') ?? field(card.desc, 'Qué y por qué'),
      files: field(card.desc, 'Archivos clave'),
      snippet: snippetOf(card.desc),
      checklists: board.checklists
        .filter((cl) => cl.idCard === card.id)
        .sort((a, b) => a.pos - b.pos)
        .map((cl) => ({
          name: cl.name,
          items: [...cl.checkItems].sort((a, b) => a.pos - b.pos).map((i) => ({ name: i.name, done: i.state === 'complete' })),
        })),
      attachments: card.attachments.filter((a) => a.mimeType?.startsWith('image/')).map((a) => ({ id: a.id, name: a.name })),
      url: card.shortUrl,
    })
  }

  // Links come from the descriptions: "Depende de: P01, P07" and "Cierra B10" / "(pendiente: P11)".
  const known = new Set(cards.map((c) => c.code))
  const edges = new Map<string, ProjectEdge>()
  const add = (from: string, to: string, kind: ProjectEdge['kind']) => {
    if (from !== to && known.has(from) && known.has(to)) edges.set(`${from}>${to}`, { from, to, kind })
  }
  for (const card of board.cards) {
    const code = card.name.match(CODE_PATTERN)?.[1]
    if (!code) continue
    for (const dep of codesIn(field(card.desc, 'Depende de'))) add(dep, code, 'depends')
    const summary = field(card.desc, 'Qué hace') ?? field(card.desc, 'Qué y por qué')
    for (const closed of codesIn(summary?.match(/Cierra ([^.]+)/)?.[1] ?? null)) add(code, closed, 'closes')
    for (const pending of codesIn(summary?.match(/\(pendiente: ([^)]+)\)/)?.[1] ?? null)) add(pending, code, 'closes')
  }

  return { boardName: board.name, boardUrl: board.url, currentSprint, cards, edges: [...edges.values()] }
}

/** Streams an image attached to a card of the project board; any other card or file is refused. */
export async function getProjectAttachment(cardId: string, attachmentId: string) {
  const { boardId, authorization } = credentials()
  const card: { idBoard: string } = await (
    await trelloFetch(`/cards/${encodeURIComponent(cardId)}?fields=idBoard`, authorization)
  ).json()
  const fullBoard: { id: string; shortLink: string } = await (
    await trelloFetch(`/boards/${boardId}?fields=id,shortLink`, authorization)
  ).json()
  if (card.idBoard !== fullBoard.id) throw new ApiError('NOT_FOUND', 'Esa imagen no pertenece al tablero del proyecto.')

  const attachment: { url: string; mimeType: string | null } = await (
    await trelloFetch(`/cards/${encodeURIComponent(cardId)}/attachments/${encodeURIComponent(attachmentId)}?fields=url,mimeType`, authorization)
  ).json()
  if (!attachment.mimeType?.startsWith('image/')) throw new ApiError('NOT_FOUND', 'Ese adjunto no es una imagen.')

  // Uploaded files are only served to an authenticated request, so they go through this server.
  // Screenshots can be larger than Next's data cache allows per entry; the browser caches them instead.
  const res = await fetch(attachment.url, { headers: { Authorization: authorization }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Trello respondió ${res.status} al descargar un adjunto`)
  return { body: await res.arrayBuffer(), contentType: attachment.mimeType }
}
