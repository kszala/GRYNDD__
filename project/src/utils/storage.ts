import { PomodoroSession, TodoItem, ScheduleEvent } from '../types';

// Add lecture session interface
export interface LectureSession {
  id: string;
  title: string;
  videoId?: string;
  duration: number; // in seconds
  startTime: Date;
  endTime?: Date;
  playlistName?: string;
  channelTitle?: string;
}

const STORAGE_KEYS = {
  SESSIONS: 'grynd_sessions',
  TODOS: 'grynd_todos',
  SCHEDULE: 'grynd_schedule',
  LECTURES: 'grynd_lectures',
} as const;

export const storage = {
  // Sessions
  getSessions(): PomodoroSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!data) return [];
    return JSON.parse(data).map((session: any) => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
    }));
  },

  saveSessions(sessions: PomodoroSession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  addSession(session: PomodoroSession): void {
    const sessions = this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);
  },

  // Todos
  getTodos(): TodoItem[] {
    const data = localStorage.getItem(STORAGE_KEYS.TODOS);
    if (!data) return [];
    return JSON.parse(data).map((todo: any) => ({
      ...todo,
      createdAt: new Date(todo.createdAt),
      completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
    }));
  },

  saveTodos(todos: TodoItem[]): void {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
  },

  // Schedule
  getScheduleEvents(): ScheduleEvent[] {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (!data) return [];
    return JSON.parse(data).map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
    }));
  },

  saveScheduleEvents(events: ScheduleEvent[]): void {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(events));
  },

  // Lecture sessions
  getLectureSessions(): LectureSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.LECTURES);
    if (!data) return [];
    return JSON.parse(data).map((lecture: any) => ({
      ...lecture,
      startTime: new Date(lecture.startTime),
      endTime: lecture.endTime ? new Date(lecture.endTime) : undefined,
    }));
  },

  saveLectureSessions(lectures: LectureSession[]): void {
    localStorage.setItem(STORAGE_KEYS.LECTURES, JSON.stringify(lectures));
  },

  addLectureSession(lecture: LectureSession): void {
    const lectures = this.getLectureSessions();
    lectures.push(lecture);
    this.saveLectureSessions(lectures);
    console.log('Lecture session saved to storage:', lecture);
  },

  updateLectureSession(id: string, updates: Partial<LectureSession>): void {
    const lectures = this.getLectureSessions();
    const index = lectures.findIndex(l => l.id === id);
    if (index !== -1) {
      lectures[index] = { ...lectures[index], ...updates };
      this.saveLectureSessions(lectures);
      console.log('Lecture session updated in storage:', lectures[index]);
    }
  },
};