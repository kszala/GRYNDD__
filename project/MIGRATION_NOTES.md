# Analytics Migration to attention_blocks

## 🔥 Single Source of Truth: `attention_blocks` table

All analytics now derive from `attention_blocks`. This is the authoritative source for user behavior tracking.

## ✅ What's New

### 1. New Analytics Service
- **File**: `src/services/attentionAnalyticsService.ts`
- **Core Functions**:
  - `getAttentionSummary(userId, from, to)` - Get attention breakdown for date range
  - `calculateFocusMetrics(summary)` - Calculate real focus vs lost time
  - `findBiggestLeak(summary)` - Identify largest time sink
  - `getAttentionBlocks(userId, from, to)` - Raw data for granular analysis
  - `formatDuration(seconds)` - Human-readable time formatting
  - `getAttentionBreakdown(summary)` - Categorized breakdown for charts

### 2. Enhanced Dashboard
- **File**: `src/components/Dashboard.tsx`
- **3 Core Cards**:
  1. **Truth Summary**: Real focus time (FOCUS_ACTIVE + VIDEO_ENGAGED) vs Lost time (IDLE + AWAY)
  2. **Focus Score**: Percentage with labels (80%+ = Locked in, 60-80% = Decent, <60% = Needs work)
  3. **Biggest Leak**: Max distraction category with duration and percentage
- These cards update in real-time with today's attention data

### 3. Grouped Attention States
- **File**: `src/services/analyticsChartService.ts` (new function)
- **Function**: `getChartDataAttentionStatesGrouped(userId, days)`
- **Grouping**:
  - **FOCUS** = FOCUS_ACTIVE + VIDEO_ENGAGED (Green)
  - **DISTRACTION** = IDLE + AWAY (Red)
  - **PAUSE** = PAUSED (Amber)
- Shows both percentage and minutes
- **Component**: Enhanced visualization in Analytics page

## ❌ Deprecated (Stop Using)

### Old RPCs
- `get_session_metrics` - DEPRECATED ❌
- `aggregateSessionsFromEvents` - DEPRECATED ❌

### Old Services
- `analyticsEngine.ts` (old) - DEPRECATED ❌
- `analyticsChartService.ts` old functions based on session_events - DEPRECATED ❌

### Old Schema References
- `session_phase` - DEPRECATED ❌
- `session_analytics` (for analytics purposes) - Being phased out

### Old Hooks
- `useAnalytics()` - being replaced with direct `attentionAnalyticsService` calls

## 📊 Analytics Stack

```
User Behavior (Activity, Focus, Away, Paused)
   ↓
Attention Engine (src/lib/attentionEngine.ts)
   ↓
attention_blocks table (single source of truth)
   ↓
attentionAnalyticsService (compute metrics)
   ↓
Dashboard & Analytics Components (UI)
```

## 🚀 Migration Checklist

- [x] Create `attentionAnalyticsService.ts` with core analytics functions
- [x] Update Dashboard with 3 core cards based on attention data
- [x] Add `getChartDataAttentionStatesGrouped()` to analyticsChartService
- [x] Update Analytics component to display grouped attention states
- [ ] Remove old RPC calls (get_session_metrics, aggregateSessionsFromEvents)
- [ ] Remove session_phase references where not needed
- [ ] Update any remaining hooks to use new service directly
- [ ] Add data validation queries to verify no gaps/overlaps in attention_blocks

## 🔍 Data Integrity Checks

Before considering migration complete, run these queries:

```sql
-- Check for gaps (incomplete blocks)
SELECT * FROM attention_blocks
WHERE end_time IS NULL;
-- Should return 0 rows

-- Check for overlaps in a session
SELECT 
  start_time, 
  end_time, 
  LAG(end_time) OVER (PARTITION BY user_id ORDER BY start_time) as prev_end_time
FROM attention_blocks
WHERE end_time IS NOT NULL
ORDER BY user_id, start_time;
-- No overlapping time ranges
```

## 📝 Notes

- All times are in UTC (ISO 8601 format) in the database
- Duration calculations use timestamps directly without timezone conversion
- Session-based filtering available via optional `sessionId` parameter
- Metadata field can store additional context (source, reason, etc.)
