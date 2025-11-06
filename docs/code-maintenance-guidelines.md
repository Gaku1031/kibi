# Code Maintenance Guidelines - Diary UI Emotion Analysis

**Feature:** diary-ui-emotion-fixes
**Version:** 1.0
**Date:** 2025-11-06
**Status:** Active

---

## Overview

This document provides maintenance guidelines for the diary UI persistence and emotion analysis features implemented in the diary-ui-emotion-fixes specification. These guidelines help developers understand, debug, and extend the system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Components](#key-components)
3. [State Management](#state-management)
4. [Debugging Guide](#debugging-guide)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Extension Points](#extension-points)
7. [Testing Guidelines](#testing-guidelines)

---

## Architecture Overview

### System Flow

```
User Action (Save Diary)
    ↓
DiaryEditPage (Component)
    ↓
useDiaryActions (Hook)
    ↓
diaryRepository (API Client)
    ↓
Backend API (Hono)
    ↓
DynamoDB (Storage)
    ↓
SWR Cache Update
    ↓
UI Update (Sidebar shows new entry)

User Action (Analyze Emotion)
    ↓
DiaryEditPage (Component)
    ↓
useDiaryActions.startAsyncAnalysis (Hook)
    ↓
Backend API POST /diary/:id/analyze
    ↓
AWS Translate (Japanese → English)
    ↓
AWS Comprehend (Emotion Classification)
    ↓
useAnalysisPolling (Background Polling)
    ↓
Backend API GET /diary/:id/analyze/status/:jobId
    ↓
Emotion Icon Generation
    ↓
DynamoDB (Save Analysis)
    ↓
SWR Cache Update
    ↓
UI Update (Show emotion breakdown & icon)
```

---

## Key Components

### Frontend Components

#### 1. BlockNoteEditor.tsx
**Purpose:** Rich text editor wrapper for diary content

**Key Features:**
- Content serialization to JSON format
- Change detection with `onChange` callback
- Initial content parsing from string or JSON

**Logs to Check:**
```
[BlockNote] Content changed: <serialized>
```

**Maintenance Notes:**
- Content is stored as JSON string in database
- Parse errors fallback to plain text format
- Uses `@blocknote/react` and `@blocknote/mantine`

---

#### 2. DiaryEditPage.tsx
**Purpose:** Main diary editing interface

**Key Features:**
- Diary creation and update
- Content autosave detection
- Emotion analysis initiation
- Real-time analysis status display

**Logs to Check:**
```
[DiaryEditPage] handleSave called with content: <content>
[DiaryEditPage] Creating new diary with title: <title> content length: <length>
[DiaryEditPage] Updating diary: <id> with title: <title> content length: <length>
[DiaryEditPage] Editor content received, length: <length>
```

**Maintenance Notes:**
- Handles both new diary creation and existing diary updates
- Analysis starts automatically after save
- Uses `isContentInitialized` flag to prevent premature rendering
- Unsaved changes are tracked with `isDiaryModified` selector

---

#### 3. useDiary.ts (Hook)
**Purpose:** Diary CRUD operations and cache management

**Key Features:**
- `useDiary(id)` - Fetch single diary with SWR
- `createDiary(data)` - Create new diary
- `updateDiary(id, data)` - Update existing diary
- `deleteDiary(id)` - Delete diary
- `startAsyncAnalysis(id)` - Start emotion analysis job

**Logs to Check:**
```
[useDiary] createDiary called
[useDiary] createDiary API response
[useDiary] Invalidating cache: diary-list
[useDiary] Invalidating cache: diary-{id}
[useDiary] updateDiary called
[useDiary] updateDiary API response
```

**Maintenance Notes:**
- Uses SWR for cache management
- Cache keys: `diary-list`, `diary-{id}`
- Always invalidate both list and detail caches after mutations
- Content must be serialized JSON from BlockNote

---

#### 4. useAnalysisPolling.ts (Hook)
**Purpose:** Background polling for emotion analysis jobs

**Key Features:**
- Persists job state in localStorage (`kibi_analysis_jobs`)
- Polls every 3 seconds when jobs are active
- Automatically updates SWR cache when jobs complete
- Cleans up completed/failed jobs

**Logs to Check:**
```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: <count> jobs
[useAnalysisPolling] Adding job: { diaryId, jobId }
[useAnalysisPolling] Polling job: { diaryId, jobId, currentStatus }
[useAnalysisPolling] Poll response: { diaryId, status, progress }
[useAnalysisPolling] Analysis completed for diary: <diaryId>
[useAnalysisPolling] Analysis failed for diary: <diaryId>
```

**Maintenance Notes:**
- Runs globally (not tied to specific page)
- Survives page navigation and browser refresh
- Job states: `SUBMITTED` (10%), `IN_PROGRESS` (50%), `COMPLETED` (100%), `FAILED`
- Failed jobs are logged and removed automatically

---

### Backend Components

#### 5. routes/diary.ts
**Purpose:** REST API endpoints for diary operations

**Key Endpoints:**
- `GET /diary` - List all diaries
- `GET /diary/:id` - Get single diary
- `POST /diary` - Create diary
- `PUT /diary/:id` - Update diary
- `DELETE /diary/:id` - Delete diary
- `POST /diary/:id/analyze` - Start analysis job
- `GET /diary/:id/analyze/status/:jobId` - Check job status

**Logs to Check:**
```
[Analyze Start] Starting analysis job
[Analyze Start] Diary retrieved, starting analysis job
[Analyze Start] Analysis job started successfully
[Analyze Status] Checking job status
[Analyze Status] Job completed, fetching results
[Analyze Status] Emotion results fetched from S3
[Analyze Status] Analysis saved to DynamoDB successfully
[Analyze Status] Emotion icon generated
```

**Maintenance Notes:**
- Analysis endpoint returns `jobId` immediately (async pattern)
- Status endpoint returns job progress or completed diary with emotion data
- Icon data is generated server-side using `generateEmotionIcon()`
- Comprehensive error handling for AWS service failures

---

#### 6. services/comprehend.ts
**Purpose:** AWS Comprehend emotion analysis integration

**Key Methods:**
- `startAnalysisJob(diaryId, text)` - Initiates async classification job
- `checkJobStatus(jobId)` - Checks job progress
- `getJobResult(diaryId, jobId)` - Retrieves completed results from S3

**Logs to Check:**
```
Starting async classification job for diary <diaryId>
Started job: <jobId>
Failed to start analysis job: <error>
Failed to check job status: <error>
Failed to get job result: <error>
```

**Maintenance Notes:**
- Uses AWS Translate for Japanese → English
- Stores input text in S3 (`input/{diaryId}.txt`)
- Comprehend outputs to S3 (`output/{diaryId}/output.tar.gz`)
- Results are in JSONL format
- Requires IAM role: `ComprehendDataAccessRole`

---

#### 7. utils/emotionIcon.ts
**Purpose:** Generate unique emotion icons from analysis data

**Key Features:**
- Deterministic generation (same emotions = same icon)
- Supports 8 emotions (joy, trust, fear, surprise, sadness, disgust, anger, anticipation)
- Generates triangles based on emotion scores
- Filters out emotions below 0.1 threshold

**Logs to Check:**
```
[IconGen] Starting icon generation with emotion scores: <scores>
[IconGen] Using seed: <seed>
[IconGen] Significant emotions (≥0.1): <emotions>
[IconGen] Generated triangles: <count>
[IconGen] Icon generation complete
```

**Maintenance Notes:**
- Uses seeded random generator for consistency
- Seed is derived from diary ID (last 6 hex digits)
- Triangle size correlates with emotion strength
- Validates all triangle data before returning
- Returns empty triangles array if all emotions < 0.1

---

## State Management

### SWR Cache

**Cache Keys:**
- `diary-list` - All diaries
- `diary-{id}` - Single diary by ID

**Cache Invalidation Rules:**
1. After creating diary → invalidate `diary-list` and `diary-{id}`
2. After updating diary → invalidate `diary-list` and `diary-{id}`
3. After deleting diary → invalidate `diary-list` and set `diary-{id}` to null
4. After analysis completes → invalidate `diary-list` and `diary-{id}`

**Example:**
```typescript
// After creating diary
mutate(DIARY_LIST_KEY);
mutate(getDiaryKey(newDiary.id), newDiary);

// After analysis completes
mutate(DIARY_LIST_KEY);
mutate(getDiaryKey(diaryId), updatedDiary);
```

---

### localStorage (Analysis Jobs)

**Key:** `kibi_analysis_jobs`

**Structure:**
```typescript
interface AnalysisJob {
  diaryId: string;
  jobId: string;
  startedAt: Date;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
}

// Stored as: AnalysisJob[]
```

**Lifecycle:**
1. Job added when analysis starts
2. Job updated every 3 seconds during polling
3. Job removed when completed or failed
4. Jobs persist across page reloads and browser sessions

---

## Debugging Guide

### Scenario 1: Diary Not Appearing After Save

**Symptoms:**
- User saves diary
- Diary doesn't appear in sidebar
- No error shown

**Debug Steps:**

1. Check BlockNote content serialization:
   ```
   Look for: [BlockNote] Content changed: <serialized>
   ```

2. Check save operation:
   ```
   Look for: [useDiary] createDiary called
   Look for: [useDiary] createDiary API response
   ```

3. Check cache invalidation:
   ```
   Look for: [useDiary] Invalidating cache: diary-list
   ```

4. Verify API response:
   - Open Network tab
   - Check POST /diary response
   - Verify `content` field is not empty

**Common Causes:**
- Content is empty or undefined
- Cache not invalidated
- API error not caught
- BlockNote onChange not firing

---

### Scenario 2: Emotion Analysis Stuck

**Symptoms:**
- Analysis starts but never completes
- Progress bar frozen
- No error shown

**Debug Steps:**

1. Check job initiation:
   ```
   Look for: [Analyze Start] Analysis job started successfully
   ```

2. Check polling is active:
   ```
   Look for: [useAnalysisPolling] Starting polling for <count> jobs
   Look for: [useAnalysisPolling] Polling interval triggered
   ```

3. Check AWS job status:
   ```
   Look for: [Analyze Status] Job status checked: { status, progress }
   ```

4. Check localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('kibi_analysis_jobs'))
   ```

5. Check AWS Console:
   - Open AWS Comprehend
   - Find job by ID
   - Check job status and error logs

**Common Causes:**
- AWS job failed (check Comprehend console)
- Network errors during polling
- localStorage quota exceeded
- Polling interval not running

---

### Scenario 3: Emotion Icon Not Displaying

**Symptoms:**
- Analysis completes
- Emotion breakdown shows
- Icon doesn't render

**Debug Steps:**

1. Check icon generation:
   ```
   Look for: [IconGen] Icon generation complete
   Look for: [IconGen] Generated triangles: <count>
   ```

2. Check API response includes iconData:
   ```
   Look for: [Analyze Status] Emotion icon generated
   Check Network tab: GET /diary/:id/analyze/status/:jobId
   ```

3. Verify icon data structure:
   ```typescript
   console.log('Icon data:', diary.iconData);
   // Should have: { triangles: [], seed: number }
   ```

4. Check EmotionIcon component rendering:
   - Inspect React DevTools
   - Verify `icon` prop is passed
   - Check for console errors

**Common Causes:**
- All emotion scores below 0.1 (no triangles generated)
- Icon data not saved to DynamoDB
- Component not receiving icon prop
- SVG rendering error

---

### Scenario 4: Analysis Results Not Persisting

**Symptoms:**
- Analysis completes
- Results displayed
- Results disappear after reload

**Debug Steps:**

1. Check DynamoDB save:
   ```
   Look for: [Analyze Status] Analysis saved to DynamoDB successfully
   ```

2. Check API response includes emotionAnalysis:
   ```
   Check Network tab: GET /diary/:id
   Verify emotionAnalysis field exists
   ```

3. Query DynamoDB directly:
   ```bash
   aws dynamodb get-item \
     --table-name EmotionAnalysis \
     --key '{"diaryId": {"S": "<diary-id>"}}'
   ```

**Common Causes:**
- DynamoDB save failed silently
- Analysis not merged into diary response
- SWR cache not updated after completion

---

## Common Issues and Solutions

### Issue 1: Content Lost After Save

**Problem:** Diary content is empty after saving

**Solution:**
1. Verify BlockNote onChange is firing:
   ```typescript
   useEffect(() => {
     const unsubscribe = editor.onChange(() => {
       const serialized = JSON.stringify(editor.document);
       console.log('[BlockNote] Content changed:', serialized);
       onChange(serialized);
     });
     return unsubscribe;
   }, [editor, onChange]);
   ```

2. Ensure parent component stores content:
   ```typescript
   const [content, setContent] = useState("");

   <Editor
     initialContent={content}
     onChange={(newContent) => {
       console.log('[DiaryEditPage] Editor content received, length:', newContent.length);
       setContent(newContent);
     }}
   />
   ```

---

### Issue 2: Analysis Polling Stops Working

**Problem:** Polling stops after page navigation

**Solution:**
1. Verify `useAnalysisPolling` is called at app root level (not page level)
2. Check localStorage is being saved:
   ```typescript
   useEffect(() => {
     saveJobsToStorage(jobs);
   }, [jobs]);
   ```

3. Verify interval cleanup:
   ```typescript
   useEffect(() => {
     if (jobs.length === 0) return;

     const interval = setInterval(() => {
       jobs.forEach(job => pollJob(job));
     }, POLLING_INTERVAL);

     return () => clearInterval(interval);
   }, [jobs, pollJob]);
   ```

---

### Issue 3: AWS Service Errors

**Problem:** Analysis fails with AWS errors

**Common AWS Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `ResourceNotFoundException` | Classifier or bucket not found | Verify ARN and bucket name in env vars |
| `AccessDeniedException` | IAM permissions missing | Add permissions to ComprehendDataAccessRole |
| `ThrottlingException` | Too many requests | Implement exponential backoff |
| `ValidationException` | Invalid content | Validate content before sending |

**Debug AWS Issues:**
1. Check environment variables:
   ```typescript
   console.log('AWS Config:', {
     COMPREHEND_CLASSIFIER_ARN: process.env.COMPREHEND_CLASSIFIER_ARN,
     CONTENT_BUCKET_NAME: process.env.CONTENT_BUCKET_NAME
   });
   ```

2. Verify IAM role has permissions:
   - S3: GetObject, PutObject
   - Comprehend: StartDocumentClassificationJob, DescribeDocumentClassificationJob
   - Translate: TranslateText

3. Check AWS CloudWatch logs for Comprehend job failures

---

### Issue 4: Cache Not Updating

**Problem:** UI doesn't reflect latest data

**Solution:**
1. Always call `mutate` after mutations:
   ```typescript
   await mutate(DIARY_LIST_KEY);
   await mutate(getDiaryKey(id));
   ```

2. Use optimistic updates for better UX:
   ```typescript
   mutate(getDiaryKey(id), updatedDiary, false);
   ```

3. Force revalidation if needed:
   ```typescript
   mutate(DIARY_LIST_KEY, undefined, { revalidate: true });
   ```

---

## Extension Points

### Adding New Emotion Types

1. Update backend types (`backend/src/types/index.ts`):
   ```typescript
   export type EmotionType = 'joy' | 'trust' | '...' | 'newEmotion';

   export interface EmotionAnalysis {
     // ...existing emotions...
     newEmotion: number;
   }
   ```

2. Add color mapping (`backend/src/utils/emotionIcon.ts`):
   ```typescript
   const EMOTION_COLORS: Record<EmotionType, { startColor: string; endColor: string }> = {
     // ...existing colors...
     newEmotion: { startColor: '#HEX1', endColor: '#HEX2' }
   };
   ```

3. Update Comprehend classifier to recognize new emotion

---

### Adding Analysis Result Validation

Add validation in `routes/diary.ts`:
```typescript
function validateEmotionAnalysis(analysis: EmotionAnalysis): boolean {
  const emotions = Object.values(analysis);
  const sum = emotions.reduce((acc, val) => acc + val, 0);

  // Emotions should sum to approximately 1.0
  if (Math.abs(sum - 1.0) > 0.1) {
    console.warn('[Validation] Emotion scores do not sum to 1.0:', sum);
    return false;
  }

  return true;
}
```

---

### Adding New Analysis Status Indicators

Update `DiaryEditPage.tsx`:
```typescript
const getAnalysisStatusMessage = () => {
  if (!analysisJob) return null;

  switch (analysisJob.status) {
    case 'SUBMITTED':
      return { statusText: '分析タスクを送信しました', color: 'blue' };
    case 'IN_PROGRESS':
      return { statusText: '感情を分析中...', color: 'indigo' };
    case 'COMPLETED':
      return { statusText: '分析が完了しました', color: 'green' };
    case 'FAILED':
      return { statusText: '分析に失敗しました', color: 'red' };
    // Add new statuses here
    default:
      return { statusText: '処理中...', color: 'gray' };
  }
};
```

---

## Testing Guidelines

### Manual Testing Checklist

#### Diary Creation & Save
- [ ] Create new diary with content
- [ ] Verify diary appears in sidebar immediately
- [ ] Reload page and verify diary persists
- [ ] Edit diary and verify changes save
- [ ] Delete diary and verify removal from sidebar

#### Emotion Analysis
- [ ] Start analysis on diary with content
- [ ] Verify progress indicator appears
- [ ] Navigate to different page during analysis
- [ ] Return to diary and verify analysis completed
- [ ] Reload page and verify results persist
- [ ] Check emotion breakdown displays correct percentages
- [ ] Verify emotion icon renders

#### Edge Cases
- [ ] Save empty diary (should be prevented)
- [ ] Start analysis on empty content (should show error)
- [ ] Test with very short content (< 10 chars)
- [ ] Test with very long content (> 10,000 chars)
- [ ] Test analysis with all emotions below 0.1 (no icon)
- [ ] Simulate network failure during save
- [ ] Simulate network failure during polling

### Automated Testing (Future)

Recommended test coverage:
1. Unit tests for emotion icon generation
2. Integration tests for diary CRUD operations
3. E2E tests for save and analysis workflow
4. Mock AWS services for deterministic testing

---

## Monitoring and Observability

### Key Metrics to Monitor

1. **Diary Operations:**
   - Save success rate
   - Save latency (should be < 2s)
   - Cache invalidation success rate

2. **Emotion Analysis:**
   - Analysis job success rate
   - Analysis completion time
   - Polling frequency and efficiency
   - AWS service errors

3. **User Experience:**
   - Time to first diary display (should be < 500ms)
   - Analysis status visibility
   - Icon generation success rate

### Recommended Alerts

1. High rate of diary save failures
2. Analysis jobs stuck for > 5 minutes
3. AWS service quota exceeded
4. DynamoDB write failures
5. High localStorage usage (approaching quota)

---

## Troubleshooting Commands

### Check localStorage State
```javascript
// In browser console
JSON.parse(localStorage.getItem('kibi_analysis_jobs'))
```

### Clear Analysis Jobs
```javascript
// In browser console
localStorage.removeItem('kibi_analysis_jobs')
```

### Force Cache Refresh
```javascript
// In React DevTools console
mutate('diary-list', undefined, { revalidate: true })
```

### Check SWR Cache
```javascript
// In React DevTools
// Find component using useDiary
// Inspect SWR cache in React state
```

---

## Additional Resources

- [BlockNote Documentation](https://www.blocknotejs.org/)
- [SWR Documentation](https://swr.vercel.app/)
- [AWS Comprehend Documentation](https://docs.aws.amazon.com/comprehend/)
- [Hono Documentation](https://hono.dev/)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-06 | Initial maintenance guidelines |

---

**End of Code Maintenance Guidelines**
