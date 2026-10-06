/**
 * How the story on the computer has gone so far, shared (like the time of
 * day: core/timeOfDay.ts): main.ts points `isDone` at the desktop's task
 * board, where the chats note what's happened ("songSent": Priya has the
 * song; "priyaGone": she said bye at six). The town reads it: when you meet
 * Priya in person after the cafe, she remembers (people/tuition.ts).
 */
export const storySoFar = {
  /** Has this happened yet (a task done, or a chat reached this mark)? */
  isDone: (_task: string): boolean => false,
};
