export interface PomodoroSession {
  id: string;
  subject: string;
  duration: number; // in seconds
  completed: boolean;
  startTime: Date;
  endTime?: Date;
  wasEndedEarly?: boolean;
  stopReason?: string;
  stopReasonDetails?: string;
  focusRating?: number;
  reflection?: string;
  tags?: string[];
  type: 'focus' | 'break';
  productivityScore?: number;
  subjectId?: string;
  topicId?: string;
  syllabusId?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  videoId: string;
  duration: string;
  thumbnail?: string;
  channelTitle?: string;
}

export type StopReason = 
  | 'distraction'
  | 'urgent_task'
  | 'lost_focus'
  | 'phone'
  | 'no_motivation'
  | 'break_needed'
  | 'other';

export const STOP_REASONS: { value: StopReason; label: string }[] = [
  { value: 'distraction', label: 'Got Distracted' },
  { value: 'urgent_task', label: 'Urgent Task Came Up' },
  { value: 'lost_focus', label: 'Lost Focus' },
  { value: 'phone', label: 'Phone/Social Media' },
  { value: 'no_motivation', label: 'No Motivation' },
  { value: 'break_needed', label: 'Needed a Break' },
  { value: 'other', label: 'Other' },
];

export const SUBJECTS = [
  'Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English',
  'History',
  'Psychology',
  'Economics',
  'Art',
  'Music',
  'General Study',
];

// Enhanced Subject Management Types
export interface Subject {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyllabusTopic {
  id: string;
  subjectId: string;
  chapter: string;
  topic: string;
  description?: string;
  expectedMinutes: number;
  difficultyLevel: number;
  prerequisites?: string[];
  resources?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicProgress {
  id: string;
  topicId: string;
  timeSpentMinutes: number;
  completionPercentage: number;
  masteryLevel: number;
  lastStudiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}