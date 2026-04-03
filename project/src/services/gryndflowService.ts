import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface GryndFlowTask {
  id: string;
  user_id?: string;
  text: string;
  priority: 'urgent' | 'normal' | 'later';
  completed: boolean;
  category: string;
  time: string | null;
  endTime: string | null;
  duration: number;
  isTimeBlock: boolean;
  createdAt: number;
  googleEventId?: string;
}

export const fetchTasks = async (): Promise<GryndFlowTask[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('gryndflow_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('createdAt', { ascending: true });

  if (error) {
    console.error('Error fetching GryndFlow tasks:', error);
    return [];
  }

  // Map snake_case to camelCase
  return (data || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    text: row.text,
    priority: row.priority,
    completed: row.completed,
    category: row.category,
    time: row.time,
    endTime: row.end_time,
    duration: row.duration,
    isTimeBlock: row.is_time_block,
    createdAt: row.created_at,
    googleEventId: row.google_event_id
  }));
};

export const addTask = async (task: Omit<GryndFlowTask, 'id' | 'user_id'>): Promise<GryndFlowTask | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const newTask = {
    id: uuidv4(),
    user_id: user.id,
    text: task.text,
    priority: task.priority,
    completed: task.completed,
    category: task.category,
    time: task.time,
    end_time: task.endTime,
    duration: task.duration,
    is_time_block: task.isTimeBlock,
    created_at: task.createdAt,
    google_event_id: task.googleEventId
  };

  const { error } = await supabase
    .from('gryndflow_tasks')
    .insert([newTask]);

  if (error) {
    console.error('Error adding GryndFlow task:', error);
    return null;
  }

  return {
    ...task,
    id: newTask.id,
    user_id: newTask.user_id
  };
};

export const updateTask = async (id: string, updates: Partial<GryndFlowTask>): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const dbUpdates: any = {};
  if (updates.text !== undefined) dbUpdates.text = updates.text;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.time !== undefined) dbUpdates.time = updates.time;
  if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.isTimeBlock !== undefined) dbUpdates.is_time_block = updates.isTimeBlock;
  if (updates.googleEventId !== undefined) dbUpdates.google_event_id = updates.googleEventId;

  const { error } = await supabase
    .from('gryndflow_tasks')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating GryndFlow task:', error);
    return false;
  }

  return true;
};

export const deleteTask = async (id: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('gryndflow_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting GryndFlow task:', error);
    return false;
  }

  return true;
};
