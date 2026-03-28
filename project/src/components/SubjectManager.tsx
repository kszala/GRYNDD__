import React, { useState, useEffect } from 'react';
import { 
  Plus, BookOpen, Edit3, Trash2, Save, X, ChevronDown, ChevronUp,
  Target, Clock, BarChart3, Award, Settings, Upload, Download,
  Search, Filter, Grid, List, Eye, EyeOff
} from 'lucide-react';
import { SubjectService, Subject, SyllabusTopic, TopicProgress } from '../services/subjects';

interface SubjectManagerProps {
  onSubjectSelect?: (subject: Subject) => void;
  selectedSubjectId?: string;
  compact?: boolean;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  onSubjectSelect,
  selectedSubjectId,
  compact = false
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [syllabusTopics, setSyllabusTopics] = useState<SyllabusTopic[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    icon: 'BookOpen'
  });
  
  // Topic Form State
  const [showTopicForm, setShowTopicForm] = useState<string | null>(null);
  const [topicFormData, setTopicFormData] = useState({
    chapter: '',
    topic: '',
    description: '',
    expectedMinutes: 60,
    difficultyLevel: 3
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjectsData, progressData] = await Promise.all([
        SubjectService.getSubjects(),
        SubjectService.getTopicProgress()
      ]);
      
      setSubjects(subjectsData);
      setTopicProgress(progressData);
      setError(null);
    } catch (err) {
      setError('Failed to load subjects');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopicsForSubject = async (subjectId: string) => {
    try {
      const topics = await SubjectService.getSyllabusTopics(subjectId);
      setSyllabusTopics(prev => [
        ...prev.filter(t => t.subjectId !== subjectId),
        ...topics
      ]);
    } catch (err) {
      console.error('Error loading topics:', err);
    }
  };

  const handleCreateSubject = async () => {
    if (!formData.name.trim()) return;
    
    try {
      const subject = await SubjectService.createSubject(
        formData.name,
        formData.description || undefined,
        formData.color,
        formData.icon
      );
      
      if (subject) {
        setSubjects(prev => [...prev, subject]);
        setFormData({ name: '', description: '', color: '#8B5CF6', icon: 'BookOpen' });
        setShowCreateForm(false);
        
        if (onSubjectSelect) {
          onSubjectSelect(subject);
        }
      }
    } catch (err) {
      setError('Failed to create subject');
      console.error('Error creating subject:', err);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !formData.name.trim()) return;
    
    try {
      const success = await SubjectService.updateSubject(editingSubject.id, {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
        icon: formData.icon
      });
      
      if (success) {
        setSubjects(prev => prev.map(s => 
          s.id === editingSubject.id 
            ? { ...s, ...formData, updatedAt: new Date() }
            : s
        ));
        setEditingSubject(null);
        setFormData({ name: '', description: '', color: '#8B5CF6', icon: 'BookOpen' });
      }
    } catch (err) {
      setError('Failed to update subject');
      console.error('Error updating subject:', err);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to delete "${subject.name}"? This will also remove all associated topics and progress.`)) {
      return;
    }
    
    try {
      const success = await SubjectService.deleteSubject(subject.id);
      if (success) {
        setSubjects(prev => prev.filter(s => s.id !== subject.id));
        setSyllabusTopics(prev => prev.filter(t => t.subjectId !== subject.id));
      }
    } catch (err) {
      setError('Failed to delete subject');
      console.error('Error deleting subject:', err);
    }
  };

  const handleCreateTopic = async (subjectId: string) => {
    if (!topicFormData.chapter.trim() || !topicFormData.topic.trim()) return;
    
    try {
      const topic = await SubjectService.createSyllabusTopic(
        subjectId,
        topicFormData.chapter,
        topicFormData.topic,
        topicFormData.description || undefined,
        topicFormData.expectedMinutes,
        topicFormData.difficultyLevel
      );
      
      if (topic) {
        setSyllabusTopics(prev => [...prev, topic]);
        setTopicFormData({
          chapter: '',
          topic: '',
          description: '',
          expectedMinutes: 60,
          difficultyLevel: 3
        });
        setShowTopicForm(null);
      }
    } catch (err) {
      setError('Failed to create topic');
      console.error('Error creating topic:', err);
    }
  };

  const toggleSubjectExpansion = async (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
      // Load topics when expanding
      await loadTopicsForSubject(subjectId);
    }
    
    setExpandedSubjects(newExpanded);
  };

  const startEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      color: subject.color,
      icon: subject.icon
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingSubject(null);
    setFormData({ name: '', description: '', color: '#8B5CF6', icon: 'BookOpen' });
    setShowCreateForm(false);
  };

  const filteredSubjects = subjects.filter(subject =>
    !searchQuery || 
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTopicsForSubject = (subjectId: string) => {
    return syllabusTopics.filter(topic => topic.subjectId === subjectId);
  };

  const getProgressForTopic = (topicId: string) => {
    return topicProgress.find(p => p.topicId === topicId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => {
              const subject = subjects.find(s => s.id === e.target.value);
              if (subject && onSubjectSelect) {
                onSubjectSelect(subject);
              }
            }}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select a subject...</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="Add Subject"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {/* Quick Create Form */}
        {showCreateForm && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Subject name"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <button
                onClick={editingSubject ? handleUpdateSubject : handleCreateSubject}
                disabled={!formData.name.trim()}
                className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {editingSubject ? 'Update' : 'Create'}
              </button>
              <button
                onClick={cancelEdit}
                className="py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Subject Management</h1>
          <p className="text-gray-400">Organize your study subjects, chapters, and topics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={16} />
            </button>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Add Subject
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="mb-6 p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingSubject ? 'Edit Subject' : 'Create New Subject'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Advanced Mathematics"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#8B5A2B'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      formData.color === color ? 'border-white scale-110' : 'border-gray-500 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the subject..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={cancelEdit}
              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={editingSubject ? handleUpdateSubject : handleCreateSubject}
              disabled={!formData.name.trim()}
              className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingSubject ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        </div>
      )}

      {/* Subjects List/Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">No subjects yet</h3>
            <p>Create your first subject to start organizing your studies</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Subject
            </button>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const isExpanded = expandedSubjects.has(subject.id);
            const topics = getTopicsForSubject(subject.id);
            const isSelected = selectedSubjectId === subject.id;
            
            return (
              <div
                key={subject.id}
                className={`bg-gray-800 rounded-xl border transition-all ${
                  isSelected ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-lg font-semibold text-white cursor-pointer hover:text-purple-300 transition-colors"
                          onClick={() => onSubjectSelect?.(subject)}
                        >
                          {subject.name}
                        </h3>
                        {subject.description && (
                          <p className="text-gray-400 text-sm mt-1">{subject.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAnalytics(showAnalytics === subject.id ? null : subject.id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(subject)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit Subject"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleSubjectExpansion(subject.id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Toggle Topics"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Subject Analytics Preview */}
                  {showAnalytics === subject.id && (
                    <SubjectAnalyticsPreview subjectId={subject.id} />
                  )}

                  {/* Topics Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-white">Topics & Chapters</h4>
                        <button
                          onClick={() => setShowTopicForm(subject.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          <Plus size={14} />
                          Add Topic
                        </button>
                      </div>

                      {/* Add Topic Form */}
                      {showTopicForm === subject.id && (
                        <div className="mb-4 p-4 bg-gray-700 rounded-lg space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={topicFormData.chapter}
                              onChange={(e) => setTopicFormData({ ...topicFormData, chapter: e.target.value })}
                              placeholder="Chapter name"
                              className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <input
                              type="text"
                              value={topicFormData.topic}
                              onChange={(e) => setTopicFormData({ ...topicFormData, topic: e.target.value })}
                              placeholder="Topic name"
                              className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Expected Minutes</label>
                              <input
                                type="number"
                                value={topicFormData.expectedMinutes}
                                onChange={(e) => setTopicFormData({ ...topicFormData, expectedMinutes: parseInt(e.target.value) || 60 })}
                                min="5"
                                max="480"
                                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Difficulty (1-5)</label>
                              <select
                                value={topicFormData.difficultyLevel}
                                onChange={(e) => setTopicFormData({ ...topicFormData, difficultyLevel: parseInt(e.target.value) })}
                                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                {[1, 2, 3, 4, 5].map(level => (
                                  <option key={level} value={level}>
                                    {level} {level === 1 ? '(Easy)' : level === 5 ? '(Hard)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowTopicForm(null)}
                              className="flex-1 py-2 px-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCreateTopic(subject.id)}
                              disabled={!topicFormData.chapter.trim() || !topicFormData.topic.trim()}
                              className="flex-1 py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
                            >
                              Add Topic
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Topics List */}
                      <div className="space-y-2">
                        {topics.length === 0 ? (
                          <div className="text-center py-6 text-gray-400">
                            <Target size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No topics yet</p>
                            <p className="text-xs">Add topics to track your progress</p>
                          </div>
                        ) : (
                          topics.map((topic) => {
                            const progress = getProgressForTopic(topic.id);
                            return (
                              <div
                                key={topic.id}
                                className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h5 className="text-white font-medium text-sm">
                                      {topic.chapter} - {topic.topic}
                                    </h5>
                                    {topic.description && (
                                      <p className="text-gray-400 text-xs mt-1">{topic.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                      <span>⏱️ {topic.expectedMinutes}min</span>
                                      <span>📊 Level {topic.difficultyLevel}</span>
                                      {progress && (
                                        <>
                                          <span>✅ {progress.completionPercentage}%</span>
                                          <span>🕒 {progress.timeSpentMinutes}min spent</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {progress && (
                                    <div className="text-right">
                                      <div className="w-12 h-12 relative">
                                        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                          <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-gray-600"
                                          />
                                          <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeDasharray={`${2 * Math.PI * 16}`}
                                            strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress.completionPercentage / 100)}`}
                                            className="text-purple-500"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-xs font-bold text-white">
                                            {progress.completionPercentage}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Subject Analytics Preview Component
const SubjectAnalyticsPreview: React.FC<{ subjectId: string }> = ({ subjectId }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await SubjectService.getSubjectAnalytics(subjectId, 30);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load subject analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-600 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-4 bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-center text-gray-400">
        <BarChart3 size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No analytics data available</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg">
      <h5 className="text-white font-medium mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-purple-400" />
        30-Day Analytics
      </h5>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-purple-400 font-bold text-lg">{analytics.totalSessions}</div>
          <div className="text-gray-400">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-blue-400 font-bold text-lg">{formatTime(analytics.totalFocusTime)}</div>
          <div className="text-gray-400">Focus Time</div>
        </div>
        <div className="text-center">
          <div className="text-green-400 font-bold text-lg">{analytics.completionRate.toFixed(1)}%</div>
          <div className="text-gray-400">Completion</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold text-lg">{formatTime(analytics.averageSessionLength)}</div>
          <div className="text-gray-400">Avg Session</div>
        </div>
      </div>
      
      {analytics.topPerformingTopics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-600">
          <h6 className="text-gray-300 text-xs font-medium mb-2">Top Topics</h6>
          <div className="space-y-1">
            {analytics.topPerformingTopics.slice(0, 3).map((topic: any) => (
              <div key={topic.topicId} className="flex justify-between text-xs">
                <span className="text-gray-300 truncate">{topic.topicName}</span>
                <span className="text-purple-400">{topic.timeSpent}min</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManager;