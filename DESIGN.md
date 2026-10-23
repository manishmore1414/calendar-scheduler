# Design note

**State and history.** Events live in React state in the Calendar page and are written to localStorage on every change. Each change (add event, delete event) is a command object with `do()` and `undo()`. `useHistory` keeps a past list and a future list: running a command pushes it to past and clears future, undo moves the last past command to future, redo does the opposite.

**Overlap layout.** Events of a day are sorted by start time and cut into groups; a group ends when the next event starts after every event in it has ended. Inside a group each event takes the first column whose last event has already ended. Width is 100 / number of columns in the group and left is column / columns.

**Persistence and rollback.** localStorage with a version number; bad data is reset. After each command the app calls a fake API that fails about 20% of the time. On failure the command is undone and removed from the past list only, so earlier undo steps stay correct.

**Auth.** One Axios instance attaches the token. On a 401 it calls refresh once; all parallel failing requests wait on the same promise, then retry.

**Hard problem.** Many failing requests must not trigger many refreshes. Fixed by keeping one shared refresh promise and clearing it when done.

**Not done.** See the limitations list in the README.
