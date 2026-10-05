import { useState } from 'react'
export default function useHistory() {
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])

  const run = (cmd) => { cmd.do(); setPast((p) => [...p, cmd]); setFuture([]) }
  const undo = () => {
    const cmd = past[past.length - 1]
    if (!cmd) return
    cmd.undo(); setPast(past.slice(0, -1)); setFuture([cmd, ...future])
  }
  const redo = () => {
    const cmd = future[0]
    if (!cmd) return
    cmd.do(); setFuture(future.slice(1)); setPast([...past, cmd])
  }
  const rollback = (cmd) => { cmd.undo(); setPast((p) => p.filter((c) => c !== cmd)) }

  return { run, undo, redo, rollback, canUndo: past.length > 0, canRedo: future.length > 0 }
}
