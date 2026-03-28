// services/storage.ts

export interface LectureSession {
  id: string;
  title: string;
  videoId: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  playlistName: string;
  channelTitle: string;
}

export interface StudyStats {
  totalStudyTime: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  longestSession: number;
  studyDays: number;
}

class StorageService {
  private readonly LECTURE_SESSIONS_KEY = 'grynd_lecture_sessions';
  private readonly STUDY_STATS_KEY = 'grynd_study_stats';

  // Lecture Sessions Management
  addLectureSession(session: LectureSession): void {
    try {
      const sessions = this.getLectureSessions();
      sessions.push(session);
      
      // Keep only the last 100 sessions to avoid storage bloat
      const limitedSessions = sessions.slice(-100);
      
      localStorage.setItem(this.LECTURE_SESSIONS_KEY, JSON.stringify(limitedSessions));
      console.log('✅ Lecture session saved:', session.title);
      
      // Update study stats
      this.updateStudyStats(session);
    } catch (error) {
      console.error('❌ Failed to save lecture session:', error);
    }
  }

  getLectureSessions(): LectureSession[] {
    try {
      const sessions = localStorage.getItem(this.LECTURE_SESSIONS_KEY);
      if (!sessions) return [];
      
      const parsedSessions = JSON.parse(sessions);
      
      // Convert date strings back to Date objects
      return parsedSessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime)
      }));
    } catch (error) {
      console.error('❌ Failed to load lecture sessions:', error);
      return [];
    }
  }

  getRecentLectureSessions(limit: number = 10): LectureSession[] {
    const sessions = this.getLectureSessions();
    return sessions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  getLectureSessionsByPlaylist(playlistName: string): LectureSession[] {
    const sessions = this.getLectureSessions();
    return sessions.filter(session => 
      session.playlistName.toLowerCase().includes(playlistName.toLowerCase())
    );
  }

  deleteLectureSession(sessionId: string): void {
    try {
      const sessions = this.getLectureSessions();
      const filteredSessions = sessions.filter(session => session.id !== sessionId);
      localStorage.setItem(this.LECTURE_SESSIONS_KEY, JSON.stringify(filteredSessions));
      console.log('✅ Lecture session deleted');
    } catch (error) {
      console.error('❌ Failed to delete lecture session:', error);
    }
  }

  clearAllLectureSessions(): void {
    try {
      localStorage.removeItem(this.LECTURE_SESSIONS_KEY);
      localStorage.removeItem(this.STUDY_STATS_KEY);
      console.log('✅ All lecture sessions cleared');
    } catch (error) {
      console.error('❌ Failed to clear lecture sessions:', error);
    }
  }

  // Study Stats Management
  private updateStudyStats(session: LectureSession): void {
    try {
      const stats = this.getStudyStats();
      
      stats.totalStudyTime += session.duration;
      stats.sessionsCompleted += 1;
      stats.averageSessionLength = Math.round(stats.totalStudyTime / stats.sessionsCompleted);
      
      if (session.duration > stats.longestSession) {
        stats.longestSession = session.duration;
      }

      // Calculate unique study days
      const sessions = this.getLectureSessions();
      const uniqueDays = new Set(
        sessions.map(s => s.startTime.toDateString())
      );
      stats.studyDays = uniqueDays.size;

      localStorage.setItem(this.STUDY_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('❌ Failed to update study stats:', error);
    }
  }

  getStudyStats(): StudyStats {
    try {
      const stats = localStorage.getItem(this.STUDY_STATS_KEY);
      if (!stats) {
        return {
          totalStudyTime: 0,
          sessionsCompleted: 0,
          averageSessionLength: 0,
          longestSession: 0,
          studyDays: 0
        };
      }
      return JSON.parse(stats);
    } catch (error) {
      console.error('❌ Failed to load study stats:', error);
      return {
        totalStudyTime: 0,
        sessionsCompleted: 0,
        averageSessionLength: 0,
        longestSession: 0,
        studyDays: 0
      };
    }
  }

  // Get study stats for a specific time period
  getStudyStatsForPeriod(days: number): StudyStats {
    const sessions = this.getLectureSessions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentSessions = sessions.filter(session => 
      session.startTime >= cutoffDate
    );

    if (recentSessions.length === 0) {
      return {
        totalStudyTime: 0,
        sessionsCompleted: 0,
        averageSessionLength: 0,
        longestSession: 0,
        studyDays: 0
      };
    }

    const totalTime = recentSessions.reduce((sum, session) => sum + session.duration, 0);
    const longestSession = Math.max(...recentSessions.map(s => s.duration));
    const uniqueDays = new Set(recentSessions.map(s => s.startTime.toDateString())).size;

    return {
      totalStudyTime: totalTime,
      sessionsCompleted: recentSessions.length,
      averageSessionLength: Math.round(totalTime / recentSessions.length),
      longestSession: longestSession,
      studyDays: uniqueDays
    };
  }

  // Export data for backup
  exportData(): { sessions: LectureSession[], stats: StudyStats } {
    return {
      sessions: this.getLectureSessions(),
      stats: this.getStudyStats()
    };
  }

  // Import data from backup
  importData(data: { sessions: LectureSession[], stats: StudyStats }): void {
    try {
      localStorage.setItem(this.LECTURE_SESSIONS_KEY, JSON.stringify(data.sessions));
      localStorage.setItem(this.STUDY_STATS_KEY, JSON.stringify(data.stats));
      console.log('✅ Data imported successfully');
    } catch (error) {
      console.error('❌ Failed to import data:', error);
    }
  }

  // Utility methods
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getTodaysStudyTime(): number {
    const today = new Date().toDateString();
    const sessions = this.getLectureSessions();
    const todaySessions = sessions.filter(session => 
      session.startTime.toDateString() === today
    );
    return todaySessions.reduce((sum, session) => sum + session.duration, 0);
  }

  getWeeklyStudyTime(): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const sessions = this.getLectureSessions();
    const weeklySessions = sessions.filter(session => 
      session.startTime >= oneWeekAgo
    );
    return weeklySessions.reduce((sum, session) => sum + session.duration, 0);
  }

  // Get study streak (consecutive days)
  getStudyStreak(): number {
    const sessions = this.getLectureSessions();
    if (sessions.length === 0) return 0;

    // Get unique study dates and sort them
    const studyDates = [...new Set(sessions.map(s => s.startTime.toDateString()))]
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    if (studyDates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if the most recent study day is today or yesterday
    const mostRecentStudyDate = studyDates[0];
    mostRecentStudyDate.setHours(0, 0, 0, 0);

    if (mostRecentStudyDate.getTime() !== today.getTime() && 
        mostRecentStudyDate.getTime() !== yesterday.getTime()) {
      return 0; // Streak is broken
    }

    // Count consecutive days
    let streak = 1;
    for (let i = 1; i < studyDates.length; i++) {
      const currentDate = new Date(studyDates[i]);
      const previousDate = new Date(studyDates[i - 1]);
      
      const dayDifference = Math.floor(
        (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (dayDifference === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}

// Create and export singleton instance
export const storage = new StorageService();
export default storage;