create or replace function get_session_metrics(uid text)
returns json as $$
declare result json;
begin
  select json_build_object(
    'focus_time', sum(case when session_phase = 'active' then duration_since_last_event_seconds else 0 end),
    'distraction_time', sum(case when session_phase = 'inactive' then duration_since_last_event_seconds else 0 end),
    'reflection_time', sum(case when session_phase = 'reflection' then duration_since_last_event_seconds else 0 end),
    'total_time', sum(duration_since_last_event_seconds),
    'interruptions', count(*) filter (where event_type = 'interrupt'),
    'sessions_completed', count(*) filter (where event_type = 'complete')
  )
  into result
  from session_events
  where user_id = uid;

  return result;
end;
$$ language plpgsql;

create or replace function get_peak_hours(uid text)
returns table(hour int, focus_time bigint) as $$
  select
    extract(hour from event_timestamp) as hour,
    sum(duration_since_last_event_seconds) as focus_time
  from session_events
  where user_id = uid
    and session_phase = 'active'
  group by hour
  order by focus_time desc;
$$ language sql;

create or replace function get_distraction_profile(uid text)
returns json as $$
declare result json;
begin
  select json_build_object(
    'idle_count', count(*) filter (where event_type = 'idle_detected'),
    'away_count', count(*) filter (where event_type = 'away_detected'),
    'interrupt_count', count(*) filter (where event_type = 'interrupt')
  )
  into result
  from session_events
  where user_id = uid;

  return result;
end;
$$ language plpgsql;
