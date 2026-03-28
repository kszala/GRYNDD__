// src/api/syllabusProgress.js
import supabase from '../supabaseClient'

export async function fetchUserSyllabusProgress(userId, subject) {
  const { data, error } = await supabase
    .from('user_syllabus_progress')
    .select(`
      time_spent_minutes,
      syllabus_topics (
        id,
        chapter,
        topic,
        expected_minutes
      )
    `)
    .eq('user_id', userId)
    .eq('syllabus_topics.subject', subject)

  if (error) {
    throw error
  }
  return data
}
