import { useEffect, useState } from 'react'
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
  const history = useHistory()
  const navigate = useNavigate()

  const date = parseDate(params.get('date'))
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i))

  useEffect(() => {
    if (events === null) getSeedEvents().then(setEvents).catch(() => setEvents([]))
  }, [])

  useEffect(() => { if (events) saveEvents(events) }, [events])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setDrag(null); setForm(null) }
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo(); else history.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const goTo = (d) => setParams({ view: 'week', date: toISODate(d) })

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

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button className="border rounded px-3 py-1" onClick={() => goTo(addDays(date, -7))}>Prev</button>
        <button className="border rounded px-3 py-1" onClick={() => goTo(new Date())}>Today</button>
        <button className="border rounded px-3 py-1" onClick={() => goTo(addDays(date, 7))}>Next</button>
        <span className="font-medium">{days[0].toDateString()} - {days[6].toDateString()}</span>
        <button disabled={!history.canUndo} className="border rounded px-3 py-1 disabled:opacity-40" onClick={history.undo}>Undo</button>
        <button disabled={!history.canRedo} className="border rounded px-3 py-1 disabled:opacity-40" onClick={history.redo}>Redo</button>
        <span className={status === 'failed' ? 'text-red-600' : 'text-gray-500'}>{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'failed' ? 'Failed, change rolled back' : ''}</span>
        <span className="ml-auto">{user.firstName}</span>
        <button className="border rounded px-3 py-1" onClick={logout}>Logout</button>
      </div>

      <div className="flex border-t border-l">
        <div className="w-14">
          <div className="h-8" />
          {Array.from({ length: 24 }, (_, h) => <div key={h} style={{ height: HOUR }} className="text-xs text-gray-500 pr-1 text-right">{h}:00</div>)}
        </div>
        {days.map((d, i) => {
          const dayEvents = events.filter((ev) => sameDay(new Date(ev.start), d))
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
                      className="absolute bg-blue-500 text-white text-xs rounded p-1 overflow-hidden cursor-pointer"
                      style={{ top: (s / 60) * HOUR, height: (len / 60) * HOUR - 2, left: (col / cols) * 100 + '%', width: 100 / cols + '%' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => navigate('/events/' + event.id)}
                    >{event.title}<button className="absolute top-0 right-0 px-1" title="Delete" onClick={(e) => { e.stopPropagation(); if (confirm('Delete "' + event.title + '"?')) removeEvent(event) }}>x</button></div>
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
