import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useHistory from '../hooks/useHistory'
import { getSeedEvents, loadEvents, saveEvents, fakeSync } from '../services/eventService'
import { layoutDay } from '../utils/layout'
import { parseDate, toISODate, addDays, startOfWeek, sameDay, minutesOfDay, minutesToText, textToMinutes } from '../utils/date'

const HOUR = 48
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Calendar() {
  const { user, logout } = useAuth()
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState(loadEvents)
  const [drag, setDrag] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [mv, setMv] = useState(null)
  const [kb, setKb] = useState(null)
  const [announce, setAnnounce] = useState('')
  const mvRef = useRef(null)
  const history = useHistory()
  const navigate = useNavigate()

  const view = params.get('view') === 'month' ? 'month' : 'week'
  const date = parseDate(params.get('date'))
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i))

  useEffect(() => {
    if (events === null) getSeedEvents().then(setEvents).catch(() => setEvents([]))
  }, [])

  useEffect(() => { if (events) saveEvents(events) }, [events])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setDrag(null); setForm(null); setKb(null); if (mvRef.current) cancelAnimationFrame(mvRef.current.raf); mvRef.current = null; setMv(null) }
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo(); else history.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const goTo = (d) => setParams({ view, date: toISODate(d) })
  const step = (n) => goTo(view === 'month' ? new Date(date.getFullYear(), date.getMonth() + n, 1) : addDays(date, 7 * n))

  // Move / resize: drag state lives in a ref, preview is pushed via requestAnimationFrame,
  // and the change is committed on pointer up as ONE command (= one undo step).
  const snap = (m) => Math.round(m / 15) * 15
  const place = (ev, day, startMin, len) => {
    const st = new Date(day); st.setHours(0, startMin, 0, 0)
    return { ...ev, start: st.toISOString(), end: new Date(st.getTime() + len * 60000).toISOString() }
  }
  const commitMove = (before, after) => exec({
    do: () => setEvents((l) => l.map((x) => (x.id === before.id ? after : x))),
    undo: () => setEvents((l) => l.map((x) => (x.id === before.id ? before : x))),
  })
  const startMove = (e, ev, day) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - r.top
    const mode = y < 6 ? 'top' : y > r.height - 6 ? 'bottom' : 'move'
    e.currentTarget.setPointerCapture(e.pointerId)
    mvRef.current = { ev, day, mode, s: minutesOfDay(new Date(ev.start)), len: (new Date(ev.end) - new Date(ev.start)) / 60000, x0: e.clientX, y0: e.clientY, colW: e.currentTarget.parentElement.getBoundingClientRect().width, moved: false, cur: ev }
  }
  const moveMv = (e) => {
    const m = mvRef.current
    if (!m) return
    const dy = e.clientY - m.y0, dx = e.clientX - m.x0
    if (!m.moved && Math.hypot(dx, dy) < 4) return
    m.moved = true
    const dm = snap((dy / HOUR) * 60)
    let st = m.s, len = m.len, day = m.day
    if (m.mode === 'move') { st = Math.max(0, Math.min(1440 - len, m.s + dm)); day = addDays(m.day, Math.round(dx / m.colW)) }
    else if (m.mode === 'top') { st = Math.max(0, Math.min(m.s + m.len - 15, m.s + dm)); len = m.s + m.len - st }
    else len = Math.max(15, Math.min(1440 - m.s, m.len + dm))
    m.cur = place(m.ev, day, st, len)
    cancelAnimationFrame(m.raf)
    m.raf = requestAnimationFrame(() => setMv(m.cur))
  }
  const endMv = () => {
    const m = mvRef.current
    if (!m) return
    cancelAnimationFrame(m.raf); mvRef.current = null; setMv(null)
    if (!m.moved) return navigate('/events/' + m.ev.id)
    commitMove(m.ev, m.cur)
    setAnnounce(m.ev.title + (m.mode === 'move' ? ' moved' : ' resized'))
  }
  const keyMove = (e, ev) => {
    if (e.key.toLowerCase() === 'm') { setKb(kb === ev.id ? null : ev.id); setAnnounce(kb === ev.id ? 'Move mode off' : 'Move mode on, use arrow keys'); return }
    if (kb !== ev.id) return
    const d = { ArrowUp: [0, -15], ArrowDown: [0, 15], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]
    if (!d) return
    e.preventDefault()
    const st = new Date(ev.start), len = (new Date(ev.end) - st) / 60000
    const next = place(ev, addDays(st, d[0]), Math.max(0, Math.min(1440 - len, minutesOfDay(st) + d[1])), len)
    commitMove(ev, next)
    setAnnounce(ev.title + ' moved to ' + new Date(next.start).toLocaleString())
  }

  const exec = async (cmd) => {
    history.run(cmd)
    setStatus('saving')
    try { await fakeSync(); setStatus('saved') } catch { history.rollback(cmd); setStatus('failed') }
  }

  const addEvent = (event) => exec({ do: () => setEvents((e) => [...e, event]), undo: () => setEvents((e) => e.filter((x) => x.id !== event.id)) })
  const removeEvent = (event) => exec({ do: () => setEvents((e) => e.filter((x) => x.id !== event.id)), undo: () => setEvents((e) => [...e, event]) })

  const minuteAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const minutes = Math.round(((e.clientY - rect.top) / HOUR) * 60 / 15) * 15
    return Math.max(0, Math.min(1440, minutes))
  }

  const finishDrag = () => {
    if (!drag) return
    const start = Math.min(drag.a, drag.b)
    let end = Math.max(drag.a, drag.b)
    if (end - start < 15) end = Math.min(1440, start + 60)
    setForm({ day: drag.day, title: '', start: minutesToText(start), end: minutesToText(Math.min(end, 1439)) })
    setError('')
    setDrag(null)
  }

  const saveForm = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    const s = textToMinutes(form.start)
    const en = textToMinutes(form.end)
    if (en <= s) return setError('End must be after start')
    const start = new Date(form.day); start.setHours(0, s, 0, 0)
    const end = new Date(form.day); end.setHours(0, en, 0, 0)
    addEvent({ id: 'ev-' + Date.now(), title: form.title.trim(), organizer: user.id, start: start.toISOString(), end: end.toISOString() })
    setForm(null)
  }

  if (events === null) return <p className="p-6">Loading events...</p>

  const shown = mv ? events.map((x) => (x.id === mv.id ? mv : x)) : events
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i))

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button className="border rounded px-3 py-1" onClick={() => step(-1)}>Prev</button>
        <button className="border rounded px-3 py-1" onClick={() => goTo(new Date())}>Today</button>
        <button className="border rounded px-3 py-1" onClick={() => step(1)}>Next</button>
        {['week', 'month'].map((v) => <button key={v} className={'border rounded px-3 py-1 ' + (view === v ? 'bg-blue-600 text-white' : '')} onClick={() => setParams({ view: v, date: toISODate(date) })}>{v === 'week' ? 'Week' : 'Month'}</button>)}
        <span className="font-medium">{view === 'month' ? date.toLocaleString('en', { month: 'long', year: 'numeric' }) : days[0].toDateString() + ' - ' + days[6].toDateString()}</span>
        <button disabled={!history.canUndo} className="border rounded px-3 py-1 disabled:opacity-40" onClick={history.undo}>Undo</button>
        <button disabled={!history.canRedo} className="border rounded px-3 py-1 disabled:opacity-40" onClick={history.redo}>Redo</button>
        <span className={status === 'failed' ? 'text-red-600' : 'text-gray-500'}>{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'failed' ? 'Failed, change rolled back' : ''}</span>
        <span className="ml-auto">{user.firstName}</span>
        <button className="border rounded px-3 py-1" onClick={logout}>Logout</button>
      </div>

      <div className="sr-only" aria-live="polite">{announce}</div>
      {view === 'month' ? (
        <div className="grid grid-cols-7 border-t border-l">
          {dayNames.map((n) => <div key={n} className="text-center text-sm border-r border-b">{n}</div>)}
          {cells.map((c, i) => {
            const list = shown.filter((ev) => sameDay(new Date(ev.start), c))
            return (
              <div key={i} onClick={() => setParams({ view: 'week', date: toISODate(c) })} className={'h-28 border-r border-b p-1 overflow-hidden cursor-pointer text-xs ' + (c.getMonth() === date.getMonth() ? '' : 'bg-gray-50 text-gray-400')}>
                <div className="font-medium">{c.getDate()}</div>
                {list.slice(0, 3).map((ev) => <div key={ev.id} className="truncate bg-blue-100 text-blue-900 rounded px-1 mt-0.5">{ev.title}</div>)}
                {list.length > 3 && <div>+{list.length - 3} more</div>}
              </div>
            )
          })}
        </div>
      ) : (
      <div className="flex border-t border-l">
        <div className="w-14">
          <div className="h-8" />
          {Array.from({ length: 24 }, (_, h) => <div key={h} style={{ height: HOUR }} className="text-xs text-gray-500 pr-1 text-right">{h}:00</div>)}
        </div>
        {days.map((d, i) => {
          const dayEvents = shown.filter((ev) => sameDay(new Date(ev.start), d))
          return (
            <div key={i} className="flex-1 min-w-0">
              <div className="h-8 text-center text-sm border-r border-b">{dayNames[i]} {d.getDate()}</div>
              <div
                className="relative border-r select-none touch-none"
                style={{ height: HOUR * 24, backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '100% ' + HOUR + 'px' }}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const m = minuteAt(e); setDrag({ day: d, a: m, b: m }) }}
                onPointerMove={(e) => { if (drag && drag.day === d) setDrag({ ...drag, b: minuteAt(e) }) }}
                onPointerUp={finishDrag}
              >
                {layoutDay(dayEvents).map(({ event, col, cols }) => {
                  const s = minutesOfDay(new Date(event.start))
                  const len = (new Date(event.end) - new Date(event.start)) / 60000
                  return (
                    <div
                      key={event.id}
                      title={event.title + ' (click for details)'}
                      className="absolute bg-blue-500 text-white text-xs rounded p-1 overflow-hidden cursor-grab focus:ring-2 focus:ring-yellow-300"
                      style={{ top: (s / 60) * HOUR, height: (len / 60) * HOUR - 2, left: (col / cols) * 100 + '%', width: 100 / cols + '%' }}
                      onPointerDown={(e) => startMove(e, event, d)} onPointerMove={moveMv} onPointerUp={endMv} tabIndex={0} onKeyDown={(e) => keyMove(e, event)}
                    >{event.title}<button className="absolute top-0 right-0 px-1" title="Delete" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if (confirm('Delete "' + event.title + '"?')) removeEvent(event) }}>x</button></div>
                  )
                })}
                {drag && drag.day === d && (
                  <div className="absolute left-0 right-0 bg-green-400/50" style={{ top: (Math.min(drag.a, drag.b) / 60) * HOUR, height: (Math.abs(drag.b - drag.a) / 60) * HOUR }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form onSubmit={saveForm} className="bg-white p-6 rounded w-80 space-y-3">
            <h2 className="font-semibold">New event</h2>
            <input autoFocus className="w-full border rounded p-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="flex gap-2">
              <input type="time" step="900" className="border rounded p-2 flex-1" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              <input type="time" step="900" className="border rounded p-2 flex-1" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" className="border rounded px-3 py-1" onClick={() => setForm(null)}>Cancel</button>
              <button className="bg-blue-600 text-white rounded px-3 py-1">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
