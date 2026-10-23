import api from '../api/axios'
const KEY = 'calendar-events'
const VERSION = 1

export function loadEvents() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY))
    if (data && data.version === VERSION && Array.isArray(data.events)) return data.events
  } catch {}
  localStorage.removeItem(KEY)
  return null
}

export function saveEvents(events) {
  localStorage.setItem(KEY, JSON.stringify({ version: VERSION, events }))
}

export async function getSeedEvents() {
  const res = await api.get('/todos?limit=100&skip=0')
  const anchor = new Date(2026, 9, 5)
  return res.data.todos.map((todo) => {
    const start = new Date(anchor)
    start.setDate(anchor.getDate() + (todo.id % 7))
    start.setHours(8 + (todo.id % 9), 0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    return { id: 'todo-' + todo.id, title: todo.todo, organizer: todo.userId, start: start.toISOString(), end: end.toISOString() }
  })
}

export function fakeSync() {
  return new Promise((resolve, reject) => {
    setTimeout(() => (Math.random() < 0.2 ? reject(new Error('Sync failed')) : resolve()), 600)
  })
}
