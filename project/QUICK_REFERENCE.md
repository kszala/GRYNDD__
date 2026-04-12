# 🚀 Quick Reference: New Analytics System

## In 30 Seconds

**Old Way** ❌
```javascript
// Async, slow, unreliable
const metrics = await aggregateSessionsFromEvents(userId);
// Broken aggregation logic
// Hardcoded dashboard values
```

**New Way** ✅
```javascript
// Fast, reliable, real-time
const summary = await getAttentionSummary(userId, from, to);
const metrics = calculateFocusMetrics(summary);
// Automatically displays in dashboard
```

---

## How to Use the New System

### Get Attention Summary
```javascript
import { getAttentionSummary, type AttentionSummary } from '@/services/attentionAnalyticsService';

// Get today's data
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const summary = await getAttentionSummary(userId, today, tomorrow);

// Result: { focus, video, idle, away, paused, total }
console.log(`Focus: ${summary.focus}s, Video: ${summary.video}s, Total: ${summary.total}s`);
```

### Calculate Metrics
```javascript
import { calculateFocusMetrics } from '@/services/attentionAnalyticsService';

const metrics = calculateFocusMetrics(summary);

// Result: { realFocus, lostTime, paused, total, focusScore }
console.log(`Focus Score: ${metrics.focusScore}%`);
console.log(`Real Focus: ${metrics.realFocus}s`);
```

### Find Biggest Leak
```javascript
import { findBiggestLeak } from '@/services/attentionAnalyticsService';

const leak = findBiggestLeak(summary);

// Result: { category, duration, percentage }
if (leak.category !== 'none') {
  console.log(`Biggest leak: ${leak.category} (${leak.duration}s)`);
}
```

### Format Duration
```javascript
import { formatDuration } from '@/services/attentionAnalyticsService';

console.log(formatDuration(3665)); // "1h 1m"
console.log(formatDuration(45));  // "45s"
```

### Get Attention Breakdown
```javascript
import { getAttentionBreakdown } from '@/services/attentionAnalyticsService';

const breakdown = getAttentionBreakdown(summary);

console.log(breakdown.focus);          // { duration, percentage, label, details }
console.log(breakdown.distraction);    // { duration, percentage, label, details }
console.log(breakdown.paused);         // { duration, percentage, label }
```

---

## Key Interfaces

```typescript
interface AttentionSummary {
  focus: number;      // seconds
  video: number;      // seconds
  idle: number;       // seconds
  away: number;       // seconds
  paused: number;     // seconds
  total: number;      // seconds
}

interface FocusMetrics {
  realFocus: number;   // focus + video (seconds)
  lostTime: number;    // idle + away (seconds)
  paused: number;      // paused (seconds)
  total: number;       // total (seconds)
  focusScore: number;  // percentage (0-100)
}

interface BiggestLeak {
  category: 'idle' | 'away' | 'paused' | 'none';
  duration: number;    // seconds
  percentage: number;  // 0-100
}
```

---

## Common Patterns

### Pattern 1: Dashboard Card
```jsx
const Dashboard = () => {
  const [summary, setSummary] = useState<AttentionSummary | null>(null);
  const [metrics, setMetrics] = useState<FocusMetrics | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    getAttentionSummary(userId, today, tomorrow).then(s => {
      if (s) {
        setSummary(s);
        setMetrics(calculateFocusMetrics(s));
      }
    });
  }, [userId]);

  return (
    <Card>
      <h2>Focus Score</h2>
      <p>{metrics?.focusScore}%</p>
    </Card>
  );
};
```

### Pattern 2: Analytics Chart
```jsx
import { getChartDataAttentionStatesGrouped } from '@/services/analyticsChartService';

const Analytics = () => {
  const [grouped, setGrouped] = useState<GroupedAttentionStateData[]>([]);

  useEffect(() => {
    getChartDataAttentionStatesGrouped(userId, 7).then(setGrouped);
  }, [userId]);

  return (
    <div>
      {grouped.map(item => (
        <div key={item.category}>
          <p>{item.label}: {item.percentage}%</p>
          <p>{Math.round(item.totalMinutes)} minutes</p>
        </div>
      ))}
    </div>
  );
};
```

### Pattern 3: Weekly Trend
```jsx
const WeeklyTrend = () => {
  const [data, setData] = useState<AttentionSummary[]>([]);

  useEffect(() => {
    const promises = [];
    for (let i = 7; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      promises.push(getAttentionSummary(userId, date, nextDate));
    }
    
    Promise.all(promises).then(setData);
  }, [userId]);

  return (
    <Chart>
      {data.map((summary, i) => ({
        day: i,
        focus: summary.focus / 3600, // convert to hours
        distraction: (summary.idle + summary.away) / 3600,
      }))}
    </Chart>
  );
};
```

---

## ⚠️ Gotchas

### 1. Time is in Seconds (Not Minutes)
```javascript
// ✅ Correct
const durationInSeconds = 3665;
const formatted = formatDuration(durationInSeconds); // "1h 1m"

// ❌ Wrong
const durationInMinutes = 61;
const wrongFormat = formatDuration(durationInMinutes); // "61s"
```

### 2. Timestamps Must Have end_time
```javascript
// ✅ Completed blocks only
const { data } = await supabase
  .from('attention_blocks')
  .select('*')
  .not('end_time', 'is', null); // Excludes incomplete

// ❌ Includes incomplete (wrong)
const { data } = await getAttentionSummary(...); // Already handles this
```

### 3. Focus Score is Percentage
```javascript
// ✅ Returns 0-100
const score = metrics.focusScore; // 73

// Display as percentage
<p>{score}%</p> // "73%"
```

### 4. Dates Must Be Boundaries
```javascript
// ✅ Correct - midnight boundaries
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// ❌ Wrong - arbitrary times
const from = new Date(); // includes current time
const to = new Date(); // inaccurate
```

---

## 🔧 Testing

### Test getAttentionSummary
```javascript
// In browser console
const userId = '...'; // your user id
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const summary = await getAttentionSummary(userId, today, tomorrow);
console.log('Today:', summary);
```

### Test calculateFocusMetrics
```javascript
const metrics = calculateFocusMetrics(summary);
console.log('Focus Score:', metrics.focusScore);
console.log('Real Focus (hours):', metrics.realFocus / 3600);
console.log('Lost Time (hours):', metrics.lostTime / 3600);
```

### Test findBiggestLeak
```javascript
const leak = findBiggestLeak(summary);
console.log('Biggest leak:', leak);
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `src/services/attentionAnalyticsService.ts` | Core analytics functions |
| `src/components/Dashboard.tsx` | 3-card dashboard |
| `src/services/analyticsChartService.ts` | Chart data generation |
| `src/components/Analytics.tsx` | Analytics page |
| `src/lib/attentionEngine.ts` | Attention state tracking |
| `MIGRATION_COMPLETE.md` | Full migration docs |
| `ARCHITECTURE_BEFORE_AFTER.md` | Visual architecture |

---

## ❓ FAQ

**Q: Where does the data come from?**
A: `attention_blocks` table in Supabase. Populated by `attentionEngine.ts`.

**Q: How often is it updated?**
A: Real-time as user activity changes (tracked by camera, mouse, focus).

**Q: Can I query raw attention_blocks?**
A: Yes, use `getAttentionBlocks(userId, from, to, sessionId?)`.

**Q: What if there are overlapping blocks?**
A: Report as bug. Attention engine prevents this with priority system.

**Q: What if there are gaps?**
A: Normal between sessions. Only current block should lack end_time.

**Q: How do I add new metrics?**
A: Add function to `attentionAnalyticsService.ts` that uses `getAttentionSummary()`.

**Q: When should I deprecate old code?**
A: After 2 weeks of testing without issues.

---

## 🎯 Next Steps

1. **Test on staging** - Run full test cycle
2. **Monitor errors** - Check console for issues
3. **Verify accuracy** - Compare with manual calculations
4. **Deploy to production** - Roll out gradually
5. **Gather feedback** - Collect user input
6. **Iterate** - Add requested improvements

---

**Last Updated**: 2026-04-05
**Status**: ✅ Stable
**Version**: 1.0.0
