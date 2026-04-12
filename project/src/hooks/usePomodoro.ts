import React, { useCallback, useMemo, useEffect } from 'react';
import { useTimerStore } from '../store/timestore';
import { PomodoroSession, SessionData } from '../types/session';
import supabase from '../supabaseClient';

// Enhanced subject interface
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

// Enhanced topic interface
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
}

// Enhanced progress tracking
export interface TopicProgress {
  id: string;
  topicId: string;
  timeSpentMinutes: number;
  completionPercentage: number;
  masteryLevel: number;
  lastStudiedAt?: Date;
  notes?: string;
}

// Extended PomodoroSession interface to include analytics
export interface ExtendedPomodoroSession extends Omit<PomodoroSession, 'pauseCount' | 'totalPauseDuration' | 'interruptionCount' | 'activeFocusSeconds' | 'productivityScore'> {
  pauseCount?: number;
  totalPauseDuration?: number;
  interruptionCount?: number;
  activeFocusSeconds?: number;
  productivityScore?: number;
  syllabusId?: string | null;
}

export const usePomodoro = () => {
  const {
    currentSessionId,
    timeLeft,
    preciseTimeLeft,
    isRunning,
    sessionType,
    subject,
    subjectId,
    topicId,
    totalTime,
    startSession: startTimerSession,
    pause,
    requestResume,
    stop,
    complete,
    sessionStartTime,
    isInterruptedMode,
    interruptedTime,
    // Enhanced analytics fields
    pauseCount,
    totalPauseTime,
    interruptionCount,
    activeFocusTime,
    recordInterruption,
    updateActiveFocusTime,
  } = useTimerStore();

  // Safe time calculation with proper fallbacks
  const safeTimeLeft = useMemo(() => {
    if (typeof preciseTimeLeft === 'number' && !isNaN(preciseTimeLeft) && preciseTimeLeft >= 0) {
      return Math.floor(preciseTimeLeft);
    }
    
    if (typeof timeLeft === 'number' && !isNaN(timeLeft) && timeLeft >= 0) {
      return Math.floor(timeLeft);
    }
    
    return 0;
  }, [preciseTimeLeft, timeLeft]);

  // Enhanced current session with analytics
  const currentSession: ExtendedPomodoroSession | null = currentSessionId ? {
    id: currentSessionId,
    sessionId: currentSessionId,
    subject: subject || 'Untitled Session',
    duration: typeof totalTime === 'number' ? totalTime : 25 * 60,
    type: sessionType as 'focus' | 'break',
    startTime: sessionStartTime ? new Date(sessionStartTime) : new Date(),
    completed: false,
    wasEndedEarly: false,
    // Enhanced analytics
    pauseCount: pauseCount || 0,
    totalPauseDuration: totalPauseTime || 0,
    interruptionCount: interruptionCount || 0,
    activeFocusSeconds: Math.floor(activeFocusTime || 0),
    productivityScore: activeFocusTime && totalTime 
      ? Math.min(1.0, activeFocusTime / (totalTime - safeTimeLeft))
      : 0,
    syllabusId: null
  } : null;

  // Enhanced session analytics
  const sessionAnalytics = useMemo(() => {
    if (!currentSession) return null;

    const elapsedTime = totalTime - safeTimeLeft;
    const focusEfficiency = activeFocusTime > 0 && elapsedTime > 0 
      ? (activeFocusTime / elapsedTime) * 100 
      : 0;
    
    const averageFocusPeriod = pauseCount > 0 
      ? activeFocusTime / (pauseCount + 1)
      : activeFocusTime;

    return {
      elapsedTime,
      activeFocusTime: activeFocusTime || 0,
      focusEfficiency: Math.round(focusEfficiency),
      pauseCount: pauseCount || 0,
      totalPauseTime: totalPauseTime || 0,
      averagePauseLength: pauseCount > 0 ? (totalPauseTime / pauseCount) : 0,
      averageFocusPeriod: Math.round(averageFocusPeriod),
      interruptionCount: interruptionCount || 0,
      productivityScore: currentSession.productivityScore || 0,
      isInterrupted: isInterruptedMode,
      totalElapsedWithInterrupted: isInterruptedMode ? (interruptedTime || 0) + elapsedTime : elapsedTime
    };
  }, [currentSession, totalTime, safeTimeLeft, activeFocusTime, pauseCount, totalPauseTime, interruptionCount, isInterruptedMode, interruptedTime]);

  // Subject management hooks
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [syllabusTopics, setSyllabusTopics] = React.useState<SyllabusTopic[]>([]);
  const [topicProgress, setTopicProgress] = React.useState<TopicProgress[]>([]);

  // Load subjects from database
  const loadSubjects = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Failed to load subjects:', error);
        return;
      }

      const formattedSubjects = (data || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        isActive: subject.is_active,
        createdAt: new Date(subject.created_at),
        updatedAt: new Date(subject.updated_at)
      }));

      setSubjects(formattedSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }, []);

  // Load syllabus topics for a subject
  const loadSyllabusTopics = useCallback(async (subjectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('syllabus_topics')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId)
        .order('chapter, topic');

      if (error) {
        console.error('Failed to load syllabus topics:', error);
        return;
      }

      const formattedTopics = (data || []).map(topic => ({
        id: topic.id,
        subjectId: topic.subject_id,
        chapter: topic.chapter,
        topic: topic.topic,
        description: topic.description,
        expectedMinutes: topic.expected_minutes,
        difficultyLevel: topic.difficulty_level,
        prerequisites: topic.prerequisites,
        resources: topic.resources
      }));

      setSyllabusTopics(formattedTopics);
    } catch (error) {
      console.error('Error loading syllabus topics:', error);
    }
  }, []);

  // Load topic progress
  const loadTopicProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_syllabus_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to load topic progress:', error);
        return;
      }

      const formattedProgress = (data || []).map(progress => ({
        id: progress.id,
        topicId: progress.topic_id,
        timeSpentMinutes: progress.time_spent_minutes,
        completionPercentage: progress.completion_percentage,
        masteryLevel: progress.mastery_level,
        lastStudiedAt: progress.last_studied_at ? new Date(progress.last_studied_at) : undefined,
        notes: progress.notes
      }));

      setTopicProgress(formattedProgress);
    } catch (error) {
      console.error('Error loading topic progress:', error);
    }
  }, []);

  // Create new subject
  const createSubject = useCallback(async (name: string, description?: string, color?: string, icon?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim(),
          color: color || '#8B5CF6',
          icon: icon || 'BookOpen',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create subject:', error);
        return null;
      }

      await loadSubjects(); // Refresh subjects list
      return data;
    } catch (error) {
      console.error('Error creating subject:', error);
      return null;
    }
  }, [loadSubjects]);

  // Create syllabus topic
  const createSyllabusTopic = useCallback(async (
    subjectId: string,
    chapter: string,
    topic: string,
    description?: string,
    expectedMinutes?: number,
    difficultyLevel?: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('syllabus_topics')
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          chapter: chapter.trim(),
          topic: topic.trim(),
          description: description?.trim(),
          expected_minutes: expectedMinutes || 60,
          difficulty_level: difficultyLevel || 3
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create syllabus topic:', error);
        return null;
      }

      await loadSyllabusTopics(subjectId); // Refresh topics list
      return data;
    } catch (error) {
      console.error('Error creating syllabus topic:', error);
      return null;
    }
  }, [loadSyllabusTopics]);

  // Update topic progress
  const updateTopicProgress = useCallback(async (
    topicId: string,
    timeSpentMinutes: number,
    completionPercentage?: number,
    masteryLevel?: number,
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_syllabus_progress')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          time_spent_minutes: timeSpentMinutes,
          completion_percentage: completionPercentage,
          mastery_level: masteryLevel,
          last_studied_at: new Date().toISOString(),
          notes: notes
        }, {
          onConflict: 'user_id,topic_id'
        });

      if (error) {
        console.error('Failed to update topic progress:', error);
      } else {
        await loadTopicProgress(); // Refresh progress
      }
    } catch (error) {
      console.error('Error updating topic progress:', error);
    }
  }, [loadTopicProgress]);

  // Enhanced start session with subject/topic tracking
  const startSession = useCallback((
    subjectName: string, 
    duration?: number, 
    selectedSubjectId?: string,
    selectedTopicId?: string
  ) => {
    if (!subjectName || typeof subjectName !== 'string') {
      console.error('Invalid subject provided to startSession');
      return;
    }
    
    const sessionDuration = duration && duration > 0 ? duration : 25 * 60;
    
    try {
      startTimerSession(subjectName, sessionDuration, 'focus', selectedSubjectId, selectedTopicId);
    } catch (error) {
      console.error('Failed to start timer session:', error);
    }
  }, [startTimerSession]);

  // Enhanced stop session with analytics
  const stopSession = useCallback((reason?: string, details?: string, wasEndedEarly: boolean = true) => {
    try {
      // Update active focus time before stopping
      if (updateActiveFocusTime) {
        updateActiveFocusTime();
      }

      if (wasEndedEarly) {
        stop(reason, details, true);
      } else {
        complete();
      }
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  }, [stop, complete, updateActiveFocusTime]);

  const toggleTimer = useCallback(() => {
    try {
      if (isRunning) {
        pause();
      } else {
        requestResume();
      }
    } catch (error) {
      console.error('Failed to toggle timer:', error);
    }
  }, [isRunning, pause, requestResume]);

  const resetTimer = useCallback(() => {
    try {
      if (currentSessionId) {
        stop('manual_reset', 'Timer was reset manually', true);
      }
    } catch (error) {
      console.error('Failed to reset timer:', error);
    }
  }, [currentSessionId, stop]);

  // Record interruption for analytics
  const handleInterruption = useCallback(() => {
    if (recordInterruption) {
      recordInterruption();
    }
  }, [recordInterruption]);

  // Load initial data
  useEffect(() => {
    loadSubjects();
    loadTopicProgress();
  }, [loadSubjects, loadTopicProgress]);

  // Load topics when subject changes
  useEffect(() => {
    if (subjectId) {
      loadSyllabusTopics(subjectId);
    }
  }, [subjectId, loadSyllabusTopics]);

  // Auto-update topic progress during sessions
  useEffect(() => {
    if (currentSession && topicId && currentSession.type === 'focus') {
      const interval = setInterval(() => {
        const elapsedMinutes = Math.floor((totalTime - safeTimeLeft) / 60);
        if (elapsedMinutes > 0) {
          updateTopicProgress(topicId, elapsedMinutes);
        }
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [currentSession, topicId, totalTime, safeTimeLeft, updateTopicProgress]);

  return {
    // Current session state
    timeLeft: safeTimeLeft,
    isRunning: Boolean(isRunning),
    currentSession,
    sessionType: sessionType || 'focus',
    sessionAnalytics,
    
    // Enhanced analytics
    isInterruptedMode: Boolean(isInterruptedMode),
    interruptedTime: interruptedTime || 0,
    totalElapsedTime: isInterruptedMode 
      ? (interruptedTime || 0) + (totalTime - safeTimeLeft)
      : totalTime - safeTimeLeft,
    
    // Actions
    startSession,
    stopSession,
    toggleTimer,
    resetTimer,
    handleInterruption,
    
    // Subject management
    subjects,
    syllabusTopics,
    topicProgress,
    loadSubjects,
    loadSyllabusTopics,
    loadTopicProgress,
    createSubject,
    createSyllabusTopic,
    updateTopicProgress,
    
    // Current selections
    selectedSubjectId: subjectId,
    selectedTopicId: topicId,
  };
};
