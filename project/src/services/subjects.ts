import supabase from '../supabaseClient';

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

export class SubjectService {
  // Subject Management
  static async getSubjects(): Promise<Subject[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        isActive: subject.is_active,
        createdAt: new Date(subject.created_at),
        updatedAt: new Date(subject.updated_at)
      }));
    } catch (error) {
      console.error('Failed to load subjects:', error);
      return [];
    }
  }

  static async createSubject(
    name: string,
    description?: string,
    color: string = '#8B5CF6',
    icon: string = 'BookOpen'
  ): Promise<Subject | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim(),
          color,
          icon,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Failed to create subject:', error);
      return null;
    }
  }

  static async updateSubject(
    id: string,
    updates: Partial<Pick<Subject, 'name' | 'description' | 'color' | 'icon'>>
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('subjects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update subject:', error);
      return false;
    }
  }

  static async deleteSubject(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('subjects')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete subject:', error);
      return false;
    }
  }

  // Syllabus Topic Management
  static async getSyllabusTopics(subjectId: string): Promise<SyllabusTopic[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('syllabus_topics')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId)
        .order('chapter, topic');

      if (error) throw error;

      return (data || []).map(topic => ({
        id: topic.id,
        subjectId: topic.subject_id,
        chapter: topic.chapter,
        topic: topic.topic,
        description: topic.description,
        expectedMinutes: topic.expected_minutes,
        difficultyLevel: topic.difficulty_level,
        prerequisites: topic.prerequisites,
        resources: topic.resources,
        createdAt: new Date(topic.created_at),
        updatedAt: new Date(topic.updated_at)
      }));
    } catch (error) {
      console.error('Failed to load syllabus topics:', error);
      return [];
    }
  }

  static async createSyllabusTopic(
    subjectId: string,
    chapter: string,
    topic: string,
    description?: string,
    expectedMinutes: number = 60,
    difficultyLevel: number = 3,
    prerequisites?: string[],
    resources?: any[]
  ): Promise<SyllabusTopic | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('syllabus_topics')
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          chapter: chapter.trim(),
          topic: topic.trim(),
          description: description?.trim(),
          expected_minutes: expectedMinutes,
          difficulty_level: difficultyLevel,
          prerequisites,
          resources
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        subjectId: data.subject_id,
        chapter: data.chapter,
        topic: data.topic,
        description: data.description,
        expectedMinutes: data.expected_minutes,
        difficultyLevel: data.difficulty_level,
        prerequisites: data.prerequisites,
        resources: data.resources,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Failed to create syllabus topic:', error);
      return null;
    }
  }

  // Topic Progress Management
  static async getTopicProgress(): Promise<TopicProgress[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_syllabus_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_studied_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(progress => ({
        id: progress.id,
        topicId: progress.topic_id,
        timeSpentMinutes: progress.time_spent_minutes,
        completionPercentage: progress.completion_percentage,
        masteryLevel: progress.mastery_level,
        lastStudiedAt: progress.last_studied_at ? new Date(progress.last_studied_at) : undefined,
        notes: progress.notes,
        createdAt: new Date(progress.created_at),
        updatedAt: new Date(progress.updated_at)
      }));
    } catch (error) {
      console.error('Failed to load topic progress:', error);
      return [];
    }
  }

  static async updateTopicProgress(
    topicId: string,
    timeSpentMinutes: number,
    completionPercentage?: number,
    masteryLevel?: number,
    notes?: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_syllabus_progress')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          time_spent_minutes: timeSpentMinutes,
          completion_percentage: completionPercentage,
          mastery_level: masteryLevel,
          last_studied_at: new Date().toISOString(),
          notes: notes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,topic_id'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update topic progress:', error);
      return false;
    }
  }

  // Bulk Operations
  static async createBulkTopics(
    subjectId: string,
    topics: Array<{
      chapter: string;
      topic: string;
      description?: string;
      expectedMinutes?: number;
      difficultyLevel?: number;
    }>
  ): Promise<SyllabusTopic[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const topicsToInsert = topics.map(topic => ({
        user_id: user.id,
        subject_id: subjectId,
        chapter: topic.chapter.trim(),
        topic: topic.topic.trim(),
        description: topic.description?.trim(),
        expected_minutes: topic.expectedMinutes || 60,
        difficulty_level: topic.difficultyLevel || 3
      }));

      const { data, error } = await supabase
        .from('syllabus_topics')
        .insert(topicsToInsert)
        .select();

      if (error) throw error;

      return (data || []).map(topic => ({
        id: topic.id,
        subjectId: topic.subject_id,
        chapter: topic.chapter,
        topic: topic.topic,
        description: topic.description,
        expectedMinutes: topic.expected_minutes,
        difficultyLevel: topic.difficulty_level,
        prerequisites: topic.prerequisites,
        resources: topic.resources,
        createdAt: new Date(topic.created_at),
        updatedAt: new Date(topic.updated_at)
      }));
    } catch (error) {
      console.error('Failed to create bulk topics:', error);
      return [];
    }
  }

  // Analytics Helpers
  static async getSubjectAnalytics(subjectId: string, days: number = 30): Promise<{
    totalSessions: number;
    totalFocusTime: number;
    averageSessionLength: number;
    completionRate: number;
    topPerformingTopics: Array<{
      topicId: string;
      topicName: string;
      timeSpent: number;
      completionRate: number;
    }>;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get session events for the subject (event-first analytics)
      const { data: sessionEvents, error: sessionEventsError } = await supabase
        .from('session_events')
        .select('session_id, event_type, duration_since_last_event_seconds, session_phase, event_timestamp, metadata')
        .eq('user_id', user.id)
        .gte('event_timestamp', startDate.toISOString())
        .contains('metadata', { subjectId })
        .order('event_timestamp', { ascending: true })
        .order('event_sequence', { ascending: true });

      if (sessionEventsError) throw sessionEventsError;

      // Get topic progress for the subject
      const { data: progress, error: progressError } = await supabase
        .from('user_syllabus_progress')
        .select(`
          *,
          syllabus_topics!inner(
            id,
            topic,
            subject_id
          )
        `)
        .eq('user_id', user.id)
        .eq('syllabus_topics.subject_id', subjectId);

      if (progressError) throw progressError;

      const sessionMap = new Map<string, {
        focusSeconds: number;
        completionStatus: 'completed' | 'interrupted' | 'abandoned';
      }>();

      (sessionEvents || []).forEach((event: any) => {
        if (!event?.session_id) {
          return;
        }

        const current = sessionMap.get(event.session_id) || {
          focusSeconds: 0,
          completionStatus: 'abandoned' as const
        };

        const phase = String(event.session_phase || '').toLowerCase();
        const duration = typeof event.duration_since_last_event_seconds === 'number'
          ? Math.max(0, Math.floor(event.duration_since_last_event_seconds))
          : 0;
        const eventType = String(event.event_type || '').toLowerCase();

        if (phase === 'active') {
          current.focusSeconds += duration;
        }

        if (eventType === 'complete') {
          current.completionStatus = 'completed';
        } else if (eventType === 'interrupt') {
          current.completionStatus = 'interrupted';
        } else if (eventType === 'abandon' && current.completionStatus !== 'completed') {
          current.completionStatus = 'abandoned';
        }

        sessionMap.set(event.session_id, current);
      });

      const sessions = Array.from(sessionMap.values());
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.completionStatus === 'completed').length;
      const totalFocusTime = sessions.reduce((sum, s) => sum + s.focusSeconds, 0);

      return {
        totalSessions,
        totalFocusTime,
        averageSessionLength: totalSessions > 0 ? Math.round(totalFocusTime / totalSessions) : 0,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        topPerformingTopics: (progress || [])
          .map(p => ({
            topicId: p.topic_id,
            topicName: p.syllabus_topics?.topic || 'Unknown Topic',
            timeSpent: p.time_spent_minutes,
            completionRate: p.completion_percentage
          }))
          .sort((a, b) => b.timeSpent - a.timeSpent)
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Failed to get subject analytics:', error);
      return {
        totalSessions: 0,
        totalFocusTime: 0,
        averageSessionLength: 0,
        completionRate: 0,
        topPerformingTopics: []
      };
    }
  }

  // Import/Export for backup
  static async exportSubjectData(): Promise<{
    subjects: Subject[];
    topics: SyllabusTopic[];
    progress: TopicProgress[];
  }> {
    try {
      const subjects = await this.getSubjects();
      const allTopics: SyllabusTopic[] = [];
      const allProgress = await this.getTopicProgress();

      // Get topics for all subjects
      for (const subject of subjects) {
        const topics = await this.getSyllabusTopics(subject.id);
        allTopics.push(...topics);
      }

      return {
        subjects,
        topics: allTopics,
        progress: allProgress
      };
    } catch (error) {
      console.error('Failed to export subject data:', error);
      return {
        subjects: [],
        topics: [],
        progress: []
      };
    }
  }

  static async importSubjectData(data: {
    subjects: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>[];
    topics: Omit<SyllabusTopic, 'id' | 'subjectId' | 'createdAt' | 'updatedAt'>[];
  }): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Import subjects first
      const subjectMapping: Record<string, string> = {};
      
      for (const subject of data.subjects) {
        const created = await this.createSubject(
          subject.name,
          subject.description,
          subject.color,
          subject.icon
        );
        if (created) {
          subjectMapping[subject.name] = created.id;
        }
      }

      // Import topics with mapped subject IDs
      for (const topic of data.topics) {
        const subjectId = Object.values(subjectMapping)[0]; // Simplified mapping
        if (subjectId) {
          await this.createSyllabusTopic(
            subjectId,
            topic.chapter,
            topic.topic,
            topic.description,
            topic.expectedMinutes,
            topic.difficultyLevel,
            topic.prerequisites,
            topic.resources
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import subject data:', error);
      return false;
    }
  }
}
