import { Link, useParams } from 'react-router-dom'
import { loadEvents } from '../services/eventService'

export default function EventDetails() {
  const { id } = useParams()
  const event = (loadEvents() || []).find((e) => e.id === id)

  if (!event) {
    return (
      <div className="p-6">
        <p className="mb-4">Event not found</p>
        <Link className="text-blue-600 underline" to="/">Back to calendar</Link>
      </div>
    )
  }

  const start = new Date(event.start)
  const end = new Date(event.end)
  return (
    <div className="p-6 space-y-2">
      <h1 className="text-xl font-semibold">{event.title}</h1>
      <p>Start: {start.toLocaleString()}</p>
      <p>End: {end.toLocaleString()}</p>
      <p>Organizer user id: {event.organizer}</p>
      <Link className="text-blue-600 underline" to="/">Back to calendar</Link>
    </div>
  )
}
