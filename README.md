# Calendar Scheduler

React + Tailwind CSS + Axios. DummyJSON is used for login, users and seed events.

## Setup
```
npm install
npm run dev
```
Build: `npm run build`. Deploy on Vercel (vercel.json handles page refresh on routes).

## Test login
Username: emilys
Password: emilyspass
(public DummyJSON test user)

## Finished
- [x] Login with POST /auth/login, error message, protected pages, logout, double-click safe
- [x] One shared Axios instance: token attach, one shared refresh on 401 then retry, one error shape
- [x] Multi-tab logout (storage event)
- [x] Week view with Prev / Next / Today, date stored in URL, bad date falls back to today
- [x] 100 seed events from /todos with a fixed time rule
- [x] Overlapping events side by side (own layout algorithm)
- [x] Drag on empty slot to create, 15 minute snap, validated form (title, end after start)
- [x] Undo / redo with buttons and Ctrl+Z / Ctrl+Shift+Z (command pattern)
- [x] Fake sync (fails about 20%), saving / saved / failed, failed change is rolled back
- [x] Events stored in localStorage with schema version, corrupted data is reset and re-seeded
- [x] /events/:id details page, "Event not found" for bad id, survives refresh
- [x] Plain Date and Intl only, no date, calendar or drag-drop library

## Known limitations (not done)
- Month view, timezone switcher, attendee filter in URL
- Move and resize events by drag or keyboard
- Recurring events
- Attendees multi-select and busy warning, all-day toggle, reminder
- Accessibility work (role="grid", focus trap, aria-live)
- Race-condition handling for overlapping pending saves, drag performance tuning for 500+ events
- Edit event (only create and delete)

## Persistence
DummyJSON saves nothing, so events live in localStorage under one key as `{ version, events }`. If the data is missing, has another version or is not valid JSON, it is removed and events are seeded again from /todos.
