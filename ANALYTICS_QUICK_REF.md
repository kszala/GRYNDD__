---
title: Event-First Analytics Quick Reference
type: Technical Guide
---

# 🎯 Event-First Analytics - Quick Reference

Use this guide to understand and work with the new analytics system.

---

## Import & Use

### In Dashboard or any component that needs metrics:

```tsx
import { analyticsService } from '../services/analyticsService';
import { computeDailyMetrics, computeSessionMetrics } from '../core/analyticsEngine';

// Fetch events
const events = await analyticsService.getTodayEvents(userId);

// Compute metrics
const dailyMetrics = computeDailyMetrics(events);
console.log(dailyMetrics.disciplineScore); // → 72 (%)
console.log(dailyMetrics.focusTime); // → 3600 (seconds)
```

---

## Core Functions

### `computeDailyMetrics(events: SessionEvent[]): DailyMetrics`

**What it does:** Converts raw session_events into daily metrics (Today's dashboard)

**Input:** Any array of SessionEvent objects (auto-groups by session_id)

**Output:**
```ts
{
  focusTime: 3600,           // seconds (1 hour)
  pauseTime: 120,            // seconds
  interruptionTime: 180,     // seconds
  awayTime: 240,             // seconds
  lostTime: 420,             // away + interruption
  totalTime: 4140,           // all tracked time
  disciplineScore: 87,       // %
  sessionsCount: 4,
  avgSessionDuration: 17     // minutes
}
```

### `computeSessionMetrics(events: SessionEvent[]): SessionMetrics | null`

**What it does:** Computes metrics for ONE session

**Input:** Events for a single session (must be sorted by timestamp)

**Output:**
```ts
{
  sessionId: "sess_123",
  focusTime: 1800,           // 30 minutes
  pauseTime: 60,
  interruptionTime: 0,
  awayTime: 120,
  totalTime: 1980,
  completionStatus: "completed",
  startedAt: "2026-04-03T09:00:00Z",
  endedAt: "2026-04-03T09:33:00Z"
}
```

---

## Real-time Updates

### In a component that needs live metrics:

```tsx
import { useAnalyticsRealtime } from '../hooks/useAnalyticsRealtime';

const MyComponent = () => {
  const [metrics, setMetrics] = useState(null);

  // Auto-refetch when session_events table changes
  useAnalyticsRealtime({
    userId: currentUserId,
    onDataChange: async () => {
      const events = await analyticsService.getTodayEvents(currentUserId);
      setMetrics(computeDailyMetrics(events));
    }
  });

  return <div>{metrics?.disciplineScore}%</div>;
};
```

**How it works:**
1. Subscribes to real-time changes on `session_events` table
2. When new events inserted, waits 500ms (debounce)
3. Calls your callback function
4. You fetch + compute + update

**No refresh needed** ✅

---

## Event Types → State Transitions

| Event Type | Transition | Time Accumulates |
|-----------|------------|------------------|
| `start` | → focus state | Focus time starts |
| `pause` | focus → pause state | Pause time starts |
| `resume` | pause → focus state | Focus time resumes |
| `interrupt` | focus → interruption state | Interruption time starts |
| `away_detected` | → away state | Away time starts |
| `complete` | → completed status | Session ends (any state) |
| `abandon` | → abandoned status | Session ends |

---

## Common Patterns

### Get today's metrics displayed in a card:

```tsx
const [metrics, setMetrics] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  (async () => {
    const user = await supabase.auth.getUser();
    const events = await analyticsService.getTodayEvents(user.id);
    setMetrics(computeDailyMetrics(events));
    setLoading(false);
  })();
}, []);

return (
  <div>
    {loading ? 'Loading...' : (
      <>
        <p>Focus: {formatDurationSeconds(metrics.focusTime)}</p>
        <p>Lost: {formatDurationSeconds(metrics.lostTime)}</p>
        <p>Discipline: {metrics.disciplineScore}%</p>
      </>
    )}
  </div>
);
```

### Get a specific session's metrics:

```tsx
// Get events for sessionId
const sessionEvents = todayEvents.filter(e => e.session_id === sessionId);

// Sort by timestamp
const sorted = [...sessionEvents].sort((a, b) => 
  new Date(a.event_timestamp) - new Date(b.event_timestamp)
);

// Compute
const sessionMetrics = computeSessionMetrics(sorted);
console.log(`Focus: ${sessionMetrics.focusTime}s`);
```

### Get events for a date range (e.g., last 7 days):

```tsx
const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 7);

const events = await analyticsService.getEventsInRange(
  userId,
  fromDate,
  new Date()
);

const metrics = computeDailyMetrics(events);
// Now you have aggregated metrics for the last 7 days
```

---

## What NOT to do ❌

- ❌ Use `session_analytics` table as source of truth
  - It's optional cache only
  - Compute from `session_events` instead

- ❌ Mutate metrics state directly
  - Always recompute from events
  - Otherwise you'll have stale data

- ❌ Call `computeSessionMetrics()` on unsorted events
  - Must sort by `event_timestamp` first

- ❌ Assume every event has `duration_since_last_event_seconds`
  - The first event in a session might be null
  - Check for null before using

---

## Performance Tips

1. **Memoize computations:**
   ```tsx
   const metrics = useMemo(
     () => computeDailyMetrics(events),
     [events]
   );
   ```

2. **Batch updates:**
   - Don't recompute on every single event
   - The real-time hook debounces by 500ms automatically

3. **Cache events locally:**
   ```tsx
   const [events, setEvents] = useState<SessionEvent[]>([]);
   
   // Update only when needed
   useAnalyticsRealtime({
     userId,
     onDataChange: refetchEvents
   });
   ```

4. **For historical queries:**
   - Fetch one week at a time (avoid huge datasets)
   - Pre-compute and cache if showing same range repeatedly

---

## Troubleshooting

### Metrics showing 0 or incorrect values?

1. Check: Are events being inserted to `session_events`?
   ```ts
   // In DB console
   SELECT * FROM session_events WHERE user_id = '...' LIMIT 10;
   ```

2. Check: Are events ordered by timestamp?
   ```ts
   const sorted = events.sort((a, b) =>
     new Date(a.event_timestamp) - new Date(b.event_timestamp)
   );
   ```

3. Check: Run formula manually
   ```ts
   const metrics = computeDailyMetrics(events);
   console.log('discipline =', 
     Math.round((metrics.focusTime / 
       (metrics.focusTime + metrics.pauseTime + metrics.awayTime + metrics.interruptionTime)) 
     * 100)
   );
   ```

### Dashboard not updating after session?

1. Check: Is real-time subscription active?
   ```ts
   console.log('Subscribed to:', userId);
   ```

2. Check: Are new events appearing in DB?
   - Refresh database browser manually

3. Check: Try manual refetch
   ```ts
   const events = await analyticsService.getTodayEvents(userId);
   const metrics = computeDailyMetrics(events);
   // Should immediately show latest data
   ```

---

## Migration Checklist

If you were using old metrics:

- [ ] Replace `storage.getSessions()` with `analyticsService.getTodayEvents()`
- [ ] Replace fake `focusScore` with `dailyMetrics.focusTime`
- [ ] Replace hardcoded `consistency` with `dailyMetrics.disciplineScore`
- [ ] Add `useAnalyticsRealtime` hook for auto-updates
- [ ] Test: manually create an event and verify dashboard updates
- [ ] Remove cache table reads from your component

---

**Last updated: 2026-04-03**
