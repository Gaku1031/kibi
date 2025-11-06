# Task 21: Cross-Page Analysis Tracking Test Plan

**Feature:** diary-ui-emotion-fixes
**Task:** Task 21 - End-to-end test: Cross-page analysis tracking
**Created:** 2025-11-06
**Status:** Ready for Execution

---

## Table of Contents

1. [Test Overview](#test-overview)
2. [Prerequisites](#prerequisites)
3. [Cross-Page Behavior Architecture](#cross-page-behavior-architecture)
4. [Test Scenarios](#test-scenarios)
5. [Console Log Checkpoints](#console-log-checkpoints)
6. [Navigation Patterns](#navigation-patterns)
7. [Timing Analysis](#timing-analysis)
8. [DevTools Inspection Guide](#devtools-inspection-guide)
9. [Success Criteria](#success-criteria)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Test Overview

### Purpose

This test plan validates that emotion analysis polling continues reliably across page navigations, ensuring users can navigate freely while analysis completes in the background.

### Requirements Validated

- **AC-4.1**: Analysis continues when user navigates to another page
- **AC-4.2**: Polling continues at 3-second intervals while away
- **AC-4.3**: Status is displayed when user returns to diary page
- **AC-4.4**: Results are shown immediately if completed during absence

### Test Focus

This test specifically validates:
1. **Background polling persistence** across different page types
2. **localStorage job state** maintenance during navigation
3. **Polling interval consistency** on non-diary pages
4. **Cache invalidation** when analysis completes off-page
5. **Result display** when returning to the original diary

### Test Duration

Approximately **15-20 minutes** including:
- 2 minutes: Setup and diary creation
- 10-15 seconds: Cross-page navigation testing
- 3-7 minutes: AWS Comprehend analysis completion
- 2 minutes: Verification and validation

---

## Prerequisites

### Environment Setup

1. **Backend and Frontend Running**
   ```bash
   # Terminal 1: Backend
   cd /Users/gakuinoue/workspace/JOB_Project/kibi/backend
   npm run dev

   # Terminal 2: Frontend
   cd /Users/gakuinoue/workspace/JOB_Project/kibi/front
   npm run dev
   ```

2. **Browser DevTools Open**
   - Open Chrome DevTools (Cmd+Option+I or F12)
   - Navigate to **Console** tab
   - Enable "Preserve log" checkbox (critical for cross-page logging)
   - Clear console before starting: `console.clear()`

3. **Clean Test State**
   ```javascript
   // In browser console, clear previous test data:
   localStorage.clear();
   location.reload();
   ```

4. **Test Content Prepared**
   Use this sample content for consistent testing:
   ```
   Title: クロスページテスト

   Content:
   このテストは、感情分析がページ間のナビゲーション中も継続して動作することを確認します。
   システムは3秒ごとにジョブステータスをポーリングし、分析が完了したら結果を表示する必要があります。
   ユーザーがタイムラインや他の日記ページにいる間も、バックグラウンド処理は継続されます。
   ```

### Navigation Pages Available

The application has these navigation targets:
- **Diary Detail**: `/diary/{id}` - Individual diary view
- **Timeline**: `/timeline` - Chronological diary list
- **New Diary**: `/` - Create new entry
- **Another Diary**: `/diary/{different-id}` - Different diary detail

---

## Cross-Page Behavior Architecture

### How Background Polling Works

#### Key Components

1. **`useAnalysisPolling` Hook**
   - Location: `/front/src/usecases/diary/useAnalysisPolling.ts`
   - Mounted globally across all pages
   - Manages polling interval independently of current page
   - Persists job state to localStorage

2. **localStorage Persistence**
   - Key: `kibi_analysis_jobs`
   - Data structure:
     ```typescript
     interface AnalysisJob {
       diaryId: string;
       jobId: string;
       startedAt: Date;
       status: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
       progress: number;
     }
     ```
   - Updated on every status change
   - Survives page navigation, refresh, and browser close

3. **Polling Interval**
   - Frequency: 3000ms (3 seconds)
   - Runs as long as `jobs.length > 0`
   - Continues across all pages in the application
   - Stops automatically when all jobs complete or fail

4. **Cache Invalidation**
   - When analysis completes:
     - `mutate('diary-list')` - Updates sidebar
     - `mutate('diary-{id}')` - Updates diary detail
   - Occurs regardless of current page
   - Ensures results are available when returning

### Polling Flow Diagram

```
[User starts analysis on Diary A]
    ↓
[Job added to localStorage]
    ↓
[Polling starts: 3-second interval]
    ↓
[User navigates to Timeline] ← Polling continues
    ↓
[useAnalysisPolling hook still mounted]
    ↓
[Polling continues: checks job status]
    ↓
[User navigates to Diary B] ← Polling continues
    ↓
[Still polling for Diary A job]
    ↓
[Job completes: status = COMPLETED]
    ↓
[Cache invalidated: diary-list, diary-A]
    ↓
[Job removed from localStorage]
    ↓
[Polling stops: no jobs remaining]
    ↓
[User returns to Diary A]
    ↓
[Results displayed immediately from cache]
```

### Critical Console Logs

The following logs confirm cross-page polling:

1. **Hook Mount** (on every page load)
   ```
   [useAnalysisPolling] Hook mounted, loading jobs from localStorage
   [useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
   ```

2. **Polling Active** (every 3 seconds, any page)
   ```
   [useAnalysisPolling] Polling interval triggered, checking 1 jobs
   [useAnalysisPolling] Polling job: { diaryId: "abc123", jobId: "xyz789", currentStatus: "IN_PROGRESS" }
   [useAnalysisPolling] Poll response: { diaryId: "abc123", status: "IN_PROGRESS", progress: 50 }
   ```

3. **Status Update** (any page)
   ```
   [useAnalysisPolling] Updating job status: { diaryId: "abc123", newStatus: "IN_PROGRESS", newProgress: 50 }
   [useAnalysisPolling] Saved jobs to localStorage: 1 jobs [...]
   ```

4. **Completion** (any page)
   ```
   [useAnalysisPolling] Poll response: { diaryId: "abc123", status: "COMPLETED", diary: {...} }
   [useAnalysisPolling] Analysis completed for diary: abc123
   [useAnalysisPolling] Removing job for diary: abc123
   [useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
   [useAnalysisPolling] Stopping polling interval
   ```

---

## Test Scenarios

### Scenario 1: Timeline Navigation During Analysis

**Objective:** Verify polling continues when navigating to timeline view.

**Steps:**

1. **Setup:**
   - Create new diary with test content
   - Save and trigger emotion analysis
   - Verify status banner appears with spinner

2. **Navigate Away:**
   - Click "時系列表示" (Timeline) in sidebar
   - Wait 10 seconds on timeline page
   - Observe console logs continue polling

3. **Return to Diary:**
   - Click original diary entry in sidebar
   - Verify status banner reflects current progress
   - Confirm progress bar updated during absence

**Expected Console Logs (Timeline Page):**

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs

--- Every 3 seconds ---
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "diary-id-123", ... }
[useAnalysisPolling] Poll response: { status: "IN_PROGRESS", progress: 50 }
[useAnalysisPolling] Updating job status: { newProgress: 50 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [...]
```

**Expected Console Logs (Return to Diary):**

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
(Status banner shows current progress: 50% or higher)
```

**Success Criteria:**

- [ ] Console shows polling logs every 3 seconds on timeline page
- [ ] Progress updates from 10% → 50% while away
- [ ] Status banner visible when returning to diary
- [ ] Progress bar reflects updated percentage
- [ ] No errors in console

---

### Scenario 2: Different Diary Navigation During Analysis

**Objective:** Verify polling continues when viewing a different diary.

**Steps:**

1. **Setup:**
   - Ensure at least 2 diaries exist (create if needed)
   - Start analysis on Diary A
   - Verify analysis started (10% progress)

2. **Navigate to Different Diary:**
   - Click Diary B in sidebar
   - Stay on Diary B for 10-15 seconds
   - Observe console logs continue polling for Diary A

3. **Return to Original Diary:**
   - Click Diary A in sidebar
   - Verify analysis status updated
   - Confirm polling still active for Diary A

**Expected Console Logs (Diary B Page):**

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs

--- Every 3 seconds ---
[useAnalysisPolling] Polling job: { diaryId: "diary-a-id", jobId: "job-123", ... }
(Note: Polling for Diary A, even though viewing Diary B)
[useAnalysisPolling] Poll response: { diaryId: "diary-a-id", status: "IN_PROGRESS", progress: 50 }
```

**Expected Console Logs (Return to Diary A):**

```
(Status banner appears with updated progress)
[useAnalysisPolling] Starting polling for 1 jobs
(Polling continues seamlessly)
```

**Success Criteria:**

- [ ] Diary B displays normally (no analysis status)
- [ ] Console shows polling for Diary A while on Diary B
- [ ] Returning to Diary A shows updated status
- [ ] No duplicate polling intervals created
- [ ] localStorage maintains correct job state

---

### Scenario 3: New Diary Creation During Analysis

**Objective:** Verify polling continues when creating a new diary.

**Steps:**

1. **Setup:**
   - Start analysis on existing diary
   - Verify polling active (console logs every 3 seconds)

2. **Create New Diary:**
   - Click "新しい日記" button or navigate to `/`
   - Enter title and content for new diary
   - Stay on new diary page for 10 seconds
   - Observe console logs continue polling for original diary

3. **Save New Diary:**
   - Click "保存" (Save) button
   - Navigate to newly created diary
   - Verify polling still active for original diary

4. **Return to Original Diary:**
   - Click original diary in sidebar
   - Verify analysis status/results displayed

**Expected Console Logs (New Diary Page):**

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs

--- Every 3 seconds ---
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "original-diary-id", ... }
(Polling for original diary continues during new diary creation)
```

**Expected Console Logs (After Saving New Diary):**

```
[DiaryEditPage] Creating new diary with title: ...
[useDiary] createDiary API response { diaryId: "new-diary-id", ... }

(Polling for original diary continues)
[useAnalysisPolling] Polling job: { diaryId: "original-diary-id", ... }
```

**Success Criteria:**

- [ ] Polling continues during new diary creation
- [ ] New diary save doesn't interrupt polling
- [ ] Original diary analysis completes in background
- [ ] Both diaries function independently
- [ ] No polling conflicts or errors

---

### Scenario 4: Multiple Page Navigations

**Objective:** Verify polling remains stable through multiple rapid navigations.

**Steps:**

1. **Setup:**
   - Start analysis on Diary A
   - Verify polling active

2. **Rapid Navigation Sequence:**
   - Navigate to Timeline (wait 3 seconds)
   - Navigate to Diary B (wait 3 seconds)
   - Navigate to New Diary page (wait 3 seconds)
   - Navigate back to Timeline (wait 3 seconds)
   - Navigate back to Diary A

3. **Verify Stability:**
   - Check console logs show consistent 3-second polling
   - Verify no duplicate intervals created
   - Confirm status updates correctly

**Expected Console Logs:**

```
--- Timeline (0-3 sec) ---
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Polling interval triggered, checking 1 jobs

--- Diary B (3-6 sec) ---
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Polling interval triggered, checking 1 jobs

--- New Diary (6-9 sec) ---
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Polling interval triggered, checking 1 jobs

--- Timeline (9-12 sec) ---
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Polling interval triggered, checking 1 jobs

--- Diary A (12+ sec) ---
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
(Status banner shows updated progress)
```

**Success Criteria:**

- [ ] Polling remains consistent at 3-second intervals
- [ ] No duplicate polling intervals created
- [ ] No missed polls during navigation
- [ ] localStorage state remains consistent
- [ ] Status updates correctly after rapid navigation

---

### Scenario 5: Analysis Completes While Away

**Objective:** Verify results display immediately when returning after completion.

**Steps:**

1. **Setup:**
   - Start analysis on diary
   - Verify polling begins (10% progress)

2. **Navigate Away:**
   - Navigate to Timeline
   - Wait for 5-10 minutes (for AWS Comprehend to complete)
   - Watch console logs for completion

3. **Observe Completion:**
   - Console should show:
     ```
     [useAnalysisPolling] Poll response: { status: "COMPLETED", diary: {...} }
     [useAnalysisPolling] Analysis completed for diary: abc123
     [useAnalysisPolling] Removing job for diary: abc123
     [useAnalysisPolling] Stopping polling interval
     ```

4. **Return to Diary:**
   - Click diary in sidebar
   - Verify results displayed immediately (no loading)
   - Confirm emotion icon and breakdown visible

**Expected Console Logs (Timeline - Completion):**

```
--- Polling continues ---
[useAnalysisPolling] Polling job: { diaryId: "abc123", status: "IN_PROGRESS" }
[useAnalysisPolling] Poll response: { status: "IN_PROGRESS", progress: 50 }

--- Final poll ---
[useAnalysisPolling] Polling job: { diaryId: "abc123", status: "IN_PROGRESS" }
[useAnalysisPolling] Poll response: { status: "COMPLETED", diary: {...} }
[useAnalysisPolling] Analysis completed for diary: abc123
[useAnalysisPolling] Removing job for diary: abc123
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
[useAnalysisPolling] Stopping polling interval
```

**Expected Visual State (Return to Diary):**

- **No Status Banner** (analysis complete)
- **Emotion Icon Visible** (78px colorful geometric shape)
- **Emotion Breakdown Visible** (8 emotions with percentages)
- **Date Metadata** shows "• 感情分析済み" badge
- **Sidebar Icon** changed to 🎨

**Success Criteria:**

- [ ] Analysis completes while user is away
- [ ] Console logs show completion on timeline page
- [ ] Polling stops after completion
- [ ] localStorage cleared (0 jobs)
- [ ] Results displayed immediately on return
- [ ] No analysis status banner shown
- [ ] Emotion icon and breakdown visible

---

## Console Log Checkpoints

### Phase 1: Analysis Started, Before Navigation

**Location:** Diary Detail Page

```
[DiaryEditPage] Starting async analysis for diary: diary-123
[useDiary] startAsyncAnalysis called for diary: diary-123
[useAnalysisPolling] Adding job: { diaryId: "diary-123", jobId: "job-456" }
[useAnalysisPolling] Job added: { diaryId: "diary-123", jobId: "job-456", status: "SUBMITTED", progress: 10 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [{ diaryId: "diary-123", status: "SUBMITTED", progress: 10 }]
[useAnalysisPolling] Starting polling for 1 jobs
```

**Checkpoint Verification:**
- [ ] Job ID generated and logged
- [ ] Job added to localStorage
- [ ] Polling started message visible
- [ ] Status banner visible on page

---

### Phase 2: During Navigation (Timeline Page)

**Location:** Timeline Page (`/timeline`)

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs

--- Every 3 seconds (repeat) ---
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "diary-123", jobId: "job-456", currentStatus: "SUBMITTED" }
[useAnalysisPolling] Poll response: { diaryId: "diary-123", status: "IN_PROGRESS", progress: 50 }
[useAnalysisPolling] Updating job status: { diaryId: "diary-123", newStatus: "IN_PROGRESS", newProgress: 50 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [{ diaryId: "diary-123", status: "IN_PROGRESS", progress: 50 }]
```

**Checkpoint Verification:**
- [ ] Hook mounted message appears
- [ ] Jobs loaded from localStorage (1 job)
- [ ] Polling triggered every 3 seconds
- [ ] Status updates from SUBMITTED → IN_PROGRESS
- [ ] Progress updates from 10 → 50
- [ ] localStorage saved after each update

---

### Phase 3: Return to Original Diary

**Location:** Diary Detail Page (`/diary/diary-123`)

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs

(Status banner appears with current progress: 50%)

--- Polling continues ---
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "diary-123", jobId: "job-456", currentStatus: "IN_PROGRESS" }
[useAnalysisPolling] Poll response: { diaryId: "diary-123", status: "IN_PROGRESS", progress: 50 }
```

**Checkpoint Verification:**
- [ ] Status banner visible with spinner
- [ ] Progress bar shows 50% (or current progress)
- [ ] Polling continues seamlessly
- [ ] Job ID and start time displayed correctly

---

### Phase 4: Analysis Completion (Any Page)

**Location:** Any page (Timeline, Different Diary, etc.)

```
--- Final poll ---
[useAnalysisPolling] Polling job: { diaryId: "diary-123", jobId: "job-456", currentStatus: "IN_PROGRESS" }
[useAnalysisPolling] Poll response: { diaryId: "diary-123", status: "COMPLETED", diary: { id: "diary-123", emotionAnalysis: {...}, iconData: {...} } }
[useAnalysisPolling] Analysis completed for diary: diary-123
[useAnalysisPolling] Removing job for diary: diary-123
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
[useAnalysisPolling] Stopping polling interval
```

**Checkpoint Verification:**
- [ ] COMPLETED status received
- [ ] Full diary object with emotionAnalysis received
- [ ] Job removed from polling queue
- [ ] localStorage cleared (0 jobs)
- [ ] Polling interval stopped

---

### Phase 5: Return After Completion

**Location:** Diary Detail Page (`/diary/diary-123`)

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] No jobs found in localStorage

(No polling logs - analysis complete)

[EmotionIcon] Rendering icon with size: 78
[EmotionBreakdown] Rendering breakdown with 8 emotions
```

**Checkpoint Verification:**
- [ ] No jobs loaded from localStorage
- [ ] No status banner displayed
- [ ] Emotion icon rendered
- [ ] Emotion breakdown rendered
- [ ] Date metadata shows "感情分析済み"

---

## Navigation Patterns

### Pattern 1: Linear Navigation

**Path:** Diary A → Timeline → Diary A

**Timing:**
- Start analysis on Diary A
- Navigate to Timeline (wait 5 seconds)
- Return to Diary A

**Expected Behavior:**
- Polling continues on Timeline
- Status updates while away
- Status banner shows updated progress on return

---

### Pattern 2: Cross-Diary Navigation

**Path:** Diary A → Diary B → Diary A

**Timing:**
- Start analysis on Diary A
- Navigate to Diary B (wait 5 seconds)
- Return to Diary A

**Expected Behavior:**
- Polling for Diary A continues while viewing Diary B
- Diary B shows no analysis status
- Diary A shows updated status on return

---

### Pattern 3: Complex Navigation

**Path:** Diary A → Timeline → Diary B → New Diary → Timeline → Diary A

**Timing:**
- Start analysis on Diary A
- Navigate through sequence (3 seconds each)
- Return to Diary A after 15 seconds

**Expected Behavior:**
- Polling continues through all navigations
- No duplicate intervals created
- Status updates correctly after multiple hops

---

### Pattern 4: Rapid Navigation

**Path:** Diary A → Timeline → Diary A → Timeline → Diary A (rapid succession)

**Timing:**
- Start analysis on Diary A
- Navigate back and forth quickly (1 second each)
- Observe polling stability

**Expected Behavior:**
- Polling remains stable at 3-second intervals
- No missed polls due to rapid navigation
- Status displays correctly on each return

---

### Pattern 5: Long Absence

**Path:** Diary A → Timeline (wait for completion) → Diary A

**Timing:**
- Start analysis on Diary A
- Navigate to Timeline immediately
- Wait 5-10 minutes for AWS Comprehend to complete
- Return to Diary A

**Expected Behavior:**
- Polling continues entire time on Timeline
- Completion detected while on Timeline
- Results displayed immediately on return

---

## Timing Analysis

### Polling Interval Verification

#### Test Method:

1. **Manual Timing:**
   - Start analysis
   - Navigate to Timeline
   - Use stopwatch to measure time between console logs
   - Record 10 consecutive polling intervals

2. **Expected Results:**
   ```
   Poll 1: 0 seconds (initial)
   Poll 2: 3 seconds (+3s)
   Poll 3: 6 seconds (+3s)
   Poll 4: 9 seconds (+3s)
   Poll 5: 12 seconds (+3s)
   Poll 6: 15 seconds (+3s)
   Poll 7: 18 seconds (+3s)
   Poll 8: 21 seconds (+3s)
   Poll 9: 24 seconds (+3s)
   Poll 10: 27 seconds (+3s)
   ```

3. **Success Criteria:**
   - [ ] Each interval is 3 seconds (±0.5s tolerance)
   - [ ] No missed polls
   - [ ] No duplicate polls (two polls within 1 second)

---

### Navigation Timing Scenarios

#### Scenario A: Navigate Before First Poll

**Timeline:**
```
0s: Start analysis (job added, progress 10%)
1s: Navigate to Timeline (before first poll at 3s)
3s: First poll occurs on Timeline page
```

**Expected:**
- [ ] Poll occurs at 3s on Timeline page
- [ ] Status updates correctly

---

#### Scenario B: Navigate Between Polls

**Timeline:**
```
0s: Start analysis
3s: First poll (progress 10%)
5s: Navigate to Timeline (between polls)
6s: Second poll occurs on Timeline page
```

**Expected:**
- [ ] Second poll occurs at 6s (3s interval maintained)
- [ ] No extra polls triggered by navigation

---

#### Scenario C: Navigate During Poll

**Timeline:**
```
0s: Start analysis
3s: Poll in progress (API request pending)
3.5s: Navigate to Timeline (during API request)
```

**Expected:**
- [ ] Poll completes successfully
- [ ] Next poll occurs at 6s on Timeline page
- [ ] No errors in console

---

### Progress Update Timeline

**Typical AWS Comprehend Analysis Timeline:**

```
00:00 - Analysis started (10% progress)
00:03 - First poll: SUBMITTED (10%)
00:06 - Second poll: SUBMITTED (10%)
00:09 - Third poll: IN_PROGRESS (50%)
00:12 - Fourth poll: IN_PROGRESS (50%)
...
03:00-07:00 - Final poll: COMPLETED (100%)
```

**Cross-Page Navigation During Timeline:**

```
User Timeline:
00:00 - Start analysis on Diary A
00:05 - Navigate to Timeline
00:10 - Still on Timeline (polls at 00:09, 00:12)
00:20 - Navigate to Diary B (polls at 00:15, 00:18)
00:30 - Return to Diary A (polls at 00:21, 00:24, 00:27)
05:00 - Still on Diary A, analysis completes (poll shows COMPLETED)
```

---

## DevTools Inspection Guide

### Console Tab Configuration

**Setup:**
1. Open DevTools (Cmd+Option+I / F12)
2. Navigate to **Console** tab
3. **Enable "Preserve log"** (critical for cross-page testing)
4. Set filter to show all logs: `-[HMR]` to hide hot reload messages
5. Group similar messages: Enable "Group similar messages in console"

**Useful Filters:**

```javascript
// Show only polling logs
/\[useAnalysisPolling\]/

// Show only API requests
/API|request|response/

// Show only errors
/error|Error|ERROR/

// Show status updates
/status|progress|SUBMITTED|IN_PROGRESS|COMPLETED/
```

**Console Commands:**

```javascript
// Check current jobs in localStorage
JSON.parse(localStorage.getItem('kibi_analysis_jobs'));

// Manually clear jobs (for testing)
localStorage.removeItem('kibi_analysis_jobs');
location.reload();

// Check SWR cache (requires SWR devtools)
// Not directly accessible, but cache invalidation is logged

// Simulate completion (advanced debugging)
// Not recommended - modify backend instead
```

---

### Network Tab Inspection

**Setup:**
1. Open DevTools → **Network** tab
2. Enable "Preserve log"
3. Filter by "Fetch/XHR"
4. Watch for polling requests

**Expected Network Requests:**

#### Initial Analysis Start
```
POST http://localhost:8080/diary/{id}/analyze
Status: 200 OK
Response: { jobId: "job-456", status: "SUBMITTED" }
```

#### Polling Requests (Every 3 seconds)
```
GET http://localhost:8080/diary/{id}/analyze/status/{jobId}
Status: 200 OK
Response: { status: "IN_PROGRESS", progress: 50 }

--- or on completion ---
Response: {
  status: "COMPLETED",
  diary: {
    id: "diary-123",
    emotionAnalysis: {...},
    iconData: {...}
  }
}
```

**Timing Verification:**
- Right-click request → Copy → Copy as cURL
- Check timestamps: each poll should be ~3 seconds apart
- Verify requests continue on different pages

**Network Waterfall Analysis:**

```
Timeline:
0s    POST /diary/{id}/analyze
3s    GET /diary/{id}/analyze/status/{jobId}
6s    GET /diary/{id}/analyze/status/{jobId}
9s    GET /diary/{id}/analyze/status/{jobId}
12s   GET /diary/{id}/analyze/status/{jobId}
...

Navigation occurs at 5s (Timeline page):
5s    (Navigate to Timeline - no network interruption)
6s    GET /diary/{id}/analyze/status/{jobId} (continues)
9s    GET /diary/{id}/analyze/status/{jobId} (continues)
```

---

### Application Tab (localStorage Inspection)

**Setup:**
1. Open DevTools → **Application** tab (Chrome) or **Storage** tab (Firefox)
2. Expand **Local Storage**
3. Click `http://localhost:3000`
4. Find key: `kibi_analysis_jobs`

**Expected localStorage States:**

#### Analysis Active
```json
[
  {
    "diaryId": "diary-123",
    "jobId": "job-456",
    "startedAt": "2025-11-06T12:34:56.789Z",
    "status": "IN_PROGRESS",
    "progress": 50
  }
]
```

#### Analysis Complete
```json
[]
// or null
```

**Real-Time Monitoring:**

1. Keep Application tab open
2. Watch `kibi_analysis_jobs` value change
3. Navigate between pages
4. Verify value persists across navigation
5. Confirm value clears on completion

**Manual Testing:**

```javascript
// Get jobs
const jobs = JSON.parse(localStorage.getItem('kibi_analysis_jobs'));
console.log('Current jobs:', jobs);

// Check job details
if (jobs && jobs.length > 0) {
  console.log('Job ID:', jobs[0].jobId);
  console.log('Status:', jobs[0].status);
  console.log('Progress:', jobs[0].progress);
  console.log('Started:', new Date(jobs[0].startedAt));
}

// Watch for changes (run in console)
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key === 'kibi_analysis_jobs') {
    console.log('[localStorage] Updated:', value);
  }
  originalSetItem.apply(this, arguments);
};
```

---

### Performance Tab (Advanced)

**Use Case:** Verify polling doesn't impact performance

**Setup:**
1. Open DevTools → **Performance** tab
2. Click "Record" button
3. Navigate between pages during analysis
4. Stop recording after 30 seconds
5. Analyze flame chart

**Expected Results:**
- No blocking main thread operations
- Polling requests shown as network activity
- No memory leaks from duplicate intervals
- CPU usage remains low (<5% for polling)

---

## Success Criteria

### Functional Requirements

#### AC-4.1: Analysis Continues in Background

- [ ] Polling logs appear every 3 seconds on non-diary pages
- [ ] Console shows "[useAnalysisPolling] Polling job: ..." on Timeline
- [ ] Console shows "[useAnalysisPolling] Polling job: ..." on different Diary
- [ ] Console shows "[useAnalysisPolling] Polling job: ..." on New Diary page

#### AC-4.2: 3-Second Interval Maintained

- [ ] 10 consecutive polls measured at 3-second intervals (±0.5s)
- [ ] No missed polls during navigation
- [ ] No duplicate polls (two within same second)
- [ ] Network tab shows requests spaced 3 seconds apart

#### AC-4.3: Status Visible on Return

- [ ] Status banner displays when returning to diary during analysis
- [ ] Progress bar shows updated percentage
- [ ] Job ID and start time still displayed
- [ ] Status text reflects current state (SUBMITTED/IN_PROGRESS)

#### AC-4.4: Results Shown if Completed

- [ ] Analysis completes while user is away (console logs on different page)
- [ ] Polling stops after completion (console shows "Stopping polling interval")
- [ ] localStorage cleared (0 jobs)
- [ ] Returning to diary shows emotion icon immediately
- [ ] Emotion breakdown visible without delay
- [ ] No status banner shown (analysis already complete)

---

### Technical Requirements

#### localStorage Persistence

- [ ] Jobs saved to localStorage on status update
- [ ] Jobs persist across page navigation
- [ ] Jobs loaded on every page mount
- [ ] Jobs cleared when analysis completes
- [ ] No orphaned jobs remaining after completion

#### Cache Invalidation

- [ ] `mutate('diary-list')` called on completion (console log or Network tab)
- [ ] `mutate('diary-{id}')` called on completion
- [ ] Sidebar updates to show 🎨 icon after completion
- [ ] Diary detail page shows results on next visit

#### Polling Stability

- [ ] Only one interval running (no duplicates)
- [ ] Interval stops when jobs.length === 0
- [ ] Hook mounts/unmounts cleanly on navigation
- [ ] No memory leaks (verified in Performance tab)

---

### Performance Requirements

#### Response Times

- [ ] Polling request completes within 500ms (Network tab)
- [ ] UI remains responsive during polling (no freezing)
- [ ] Navigation transitions are smooth (no lag)
- [ ] localStorage reads/writes don't block UI

#### Resource Usage

- [ ] CPU usage <5% during polling (Activity Monitor / Task Manager)
- [ ] Memory usage stable (no leaks over 10 minutes)
- [ ] Network requests consistent at 3-second intervals
- [ ] No excessive re-renders (React DevTools Profiler)

---

### User Experience Requirements

#### Visual Feedback

- [ ] Status banner visible on diary page during analysis
- [ ] Progress bar animates smoothly
- [ ] Spinner animation runs continuously
- [ ] Percentage text updates correctly
- [ ] No flashing or flickering during updates

#### Cross-Page Behavior

- [ ] No errors when navigating during analysis
- [ ] No "lost connection" or "offline" warnings
- [ ] Other pages function normally during polling
- [ ] Sidebar always accessible
- [ ] No UI blocking or freezing

#### Completion Handling

- [ ] Results appear immediately when returning
- [ ] No delay or loading state if already complete
- [ ] Icon and breakdown render correctly
- [ ] Date metadata shows "感情分析済み" badge
- [ ] Sidebar icon updated to 🎨

---

## Troubleshooting Guide

### Issue 1: Polling Stops After Navigation

**Symptoms:**
- Polling logs appear on diary page
- Navigate to Timeline
- No more polling logs appear
- Console shows "Stopping polling interval"

**Possible Causes:**
1. Jobs array becomes empty after navigation
2. Hook unmounts and doesn't remount correctly
3. localStorage not persisting jobs

**Debug Steps:**

```javascript
// Check localStorage after navigation
console.log(localStorage.getItem('kibi_analysis_jobs'));
// Should return: '[{"diaryId":"...","jobId":"...","status":"IN_PROGRESS",...}]'

// If null or empty, jobs were cleared incorrectly
```

**Solution:**
- Verify `saveJobsToStorage()` is called before navigation
- Check `useEffect` cleanup in `useAnalysisPolling.ts` (lines 122-140)
- Ensure jobs array not cleared on unmount
- Confirm `getJobsFromStorage()` is called on mount (lines 50-54)

---

### Issue 2: Duplicate Polling Intervals

**Symptoms:**
- Multiple polling logs within same second
- Network tab shows duplicate requests
- Progress updates erratically

**Possible Causes:**
1. Multiple instances of `useAnalysisPolling` hook mounted
2. Interval not cleaned up on unmount
3. Hook mounted in multiple components

**Debug Steps:**

```javascript
// Add to useAnalysisPolling.ts line 129 (inside interval setup)
console.log('[DEBUG] Creating interval, current job count:', jobs.length);

// If you see multiple "Creating interval" logs, duplicates exist
```

**Solution:**
- Verify hook is only used once in `DiaryEditPage` (line 31)
- Check interval cleanup in `useEffect` return (line 136-139)
- Ensure `clearInterval()` is called on unmount
- Consider using a singleton pattern for polling if needed

---

### Issue 3: Status Not Updating While Away

**Symptoms:**
- Polling logs appear on Timeline
- Status is same when returning to diary
- Progress bar stuck at 10%

**Possible Causes:**
1. Status response not updating job state
2. localStorage not saving updated progress
3. Polling error not logged

**Debug Steps:**

```javascript
// Check poll response in console
// Should see:
[useAnalysisPolling] Poll response: { status: "IN_PROGRESS", progress: 50 }

// If stuck at SUBMITTED (10%), backend may not be progressing job
```

**Solution:**
- Check backend logs for Comprehend job status
- Verify `updateJob()` logic in `useAnalysisPolling.ts` (lines 110-114)
- Ensure `setJobs()` is called with updated progress
- Confirm localStorage is writable (no quota exceeded)

---

### Issue 4: Analysis Completes But Results Not Shown

**Symptoms:**
- Console shows "Analysis completed for diary: {id}"
- Console shows "Stopping polling interval"
- Returning to diary shows no emotion icon or breakdown

**Possible Causes:**
1. Cache not invalidated on completion
2. Diary data not updated in backend
3. Frontend components not rendering results

**Debug Steps:**

```javascript
// Check if diary has emotionAnalysis data
fetch('http://localhost:8080/diary/{id}')
  .then(r => r.json())
  .then(data => console.log('Diary data:', data));

// Should include:
// emotionAnalysis: { joy: 0.85, trust: 0.72, ... }
// iconData: { triangles: [...], colors: [...] }
```

**Solution:**
- Verify `mutate(getDiaryKey(job.diaryId), statusResponse.diary)` is called (line 96)
- Check backend logs confirm DynamoDB save
- Ensure `EmotionIcon` and `EmotionBreakdown` components receive data
- Verify conditional rendering in `DiaryEditPage.tsx` (lines 217-222)

---

### Issue 5: LocalStorage Not Persisting Across Pages

**Symptoms:**
- Jobs saved on diary page
- Navigate to Timeline
- Console shows "No jobs found in localStorage"
- Polling doesn't start

**Possible Causes:**
1. localStorage being cleared on navigation
2. localStorage quota exceeded
3. Browser privacy settings blocking localStorage

**Debug Steps:**

```javascript
// Test localStorage functionality
localStorage.setItem('test_key', 'test_value');
console.log(localStorage.getItem('test_key'));
// Should return: "test_value"

// If null, localStorage is disabled or blocked
```

**Solution:**
- Check browser privacy settings (disable "Block third-party cookies")
- Clear localStorage quota: `localStorage.clear()`
- Verify no other code clearing localStorage on navigation
- Use Session Storage as fallback if localStorage unavailable

---

### Issue 6: Navigation Causes React Errors

**Symptoms:**
- Console shows React errors during navigation
- "Cannot read property 'id' of undefined"
- "Cannot update component while rendering different component"

**Possible Causes:**
1. State updates during unmount
2. Async operations not canceled
3. Stale closures in useEffect

**Debug Steps:**

```javascript
// Check for errors in console
// Common errors:
// - "Warning: Can't perform a React state update on an unmounted component"
// - "Cannot update during an existing state transition"
```

**Solution:**
- Add cleanup to `useEffect` in `useAnalysisPolling` (already present at line 136)
- Cancel pending API requests on unmount
- Use `useCallback` with proper dependencies
- Verify no state updates after component unmounts

---

### Issue 7: Polling Frequency Incorrect

**Symptoms:**
- Polling occurs more or less frequently than 3 seconds
- Timestamps show irregular intervals
- Network requests bunched together

**Possible Causes:**
1. `POLLING_INTERVAL` constant changed
2. Multiple intervals running simultaneously
3. Clock drift or timer issues

**Debug Steps:**

```javascript
// Measure actual intervals
let lastPoll = Date.now();
// Add to useAnalysisPolling.ts line 131 (before jobs.forEach):
const now = Date.now();
const interval = now - lastPoll;
console.log('[Timing] Poll interval:', interval, 'ms (expected 3000ms)');
lastPoll = now;
```

**Solution:**
- Verify `POLLING_INTERVAL = 3000` (line 10 in useAnalysisPolling.ts)
- Check for duplicate intervals (see Issue 2)
- Use `setInterval` instead of `setTimeout` (already using setInterval at line 129)
- Consider using `requestAnimationFrame` for more precise timing (advanced)

---

### Issue 8: AWS Comprehend Job Never Completes

**Symptoms:**
- Polling continues indefinitely
- Status never changes to COMPLETED
- Backend logs show IN_PROGRESS for hours

**Possible Causes:**
1. AWS Comprehend job actually failed
2. Classifier not processing correctly
3. S3 output not accessible
4. Network issues between AWS services

**Debug Steps:**

```bash
# Check backend logs for errors
# Look for:
[Comprehend] Error: ...
[S3] Error: ...

# Check AWS Console:
# 1. Navigate to AWS Comprehend console
# 2. Find classification jobs
# 3. Check job status (should be COMPLETED)
# 4. If FAILED, check error message
```

**Solution:**
- Verify AWS credentials have necessary permissions
- Check Comprehend classifier ARN is correct
- Verify S3 bucket name and region
- Check IAM role has S3 and Comprehend access
- Review AWS service logs for errors
- Consider implementing timeout (e.g., fail after 10 minutes)

---

### Issue 9: Multiple Jobs Conflicting

**Symptoms:**
- Started analysis on Diary A
- Started analysis on Diary B (without waiting)
- Both jobs shown in localStorage
- Polling logs mixed for both diaries

**Expected Behavior:**
- This is actually correct behavior - multiple jobs should be supported
- Polling should handle both jobs independently

**Verification:**

```javascript
// Check localStorage shows both jobs
const jobs = JSON.parse(localStorage.getItem('kibi_analysis_jobs'));
console.log('Active jobs:', jobs.length);
// Should be: 2

// Verify polling logs for both diaries
[useAnalysisPolling] Polling job: { diaryId: "diary-a-id", ... }
[useAnalysisPolling] Polling job: { diaryId: "diary-b-id", ... }
```

**If Conflicts Occur:**
- Check `getJobForDiary(diaryId)` returns correct job (line 142-144)
- Verify job removal only removes specific diary's job (line 81-84)
- Ensure status updates only affect matching diary (line 110-114)

---

### Debugging Checklist

Before reporting an issue, verify:

- [ ] Backend server is running on port 8080
- [ ] Frontend server is running on port 3000
- [ ] DevTools "Preserve log" is enabled
- [ ] localStorage is not disabled in browser
- [ ] AWS credentials are valid and not expired
- [ ] No console errors before starting test
- [ ] No network errors in Network tab
- [ ] Test content has sufficient length (>10 chars)
- [ ] Previous test jobs cleared from localStorage

---

## Test Execution Template

### Pre-Test Checklist

**Date:** ___________
**Tester:** ___________

- [ ] Backend running on http://localhost:8080
- [ ] Frontend running on http://localhost:3000
- [ ] DevTools Console open with "Preserve log" enabled
- [ ] DevTools Network tab open with "Preserve log" enabled
- [ ] localStorage cleared: `localStorage.clear()`
- [ ] Console cleared: `console.clear()`
- [ ] AWS credentials verified in backend `.env`

---

### Scenario Execution Records

#### Scenario 1: Timeline Navigation

| Checkpoint | Expected | Actual | Pass/Fail |
|------------|----------|--------|-----------|
| Analysis started on Diary A | Status banner visible, 10% progress | | ☐ Pass ☐ Fail |
| Navigate to Timeline | Hook mounted log appears | | ☐ Pass ☐ Fail |
| Polling continues (3s intervals) | 3+ polling logs on Timeline | | ☐ Pass ☐ Fail |
| Status updates to IN_PROGRESS | Progress changes to 50% | | ☐ Pass ☐ Fail |
| Return to Diary A | Status banner shows 50% | | ☐ Pass ☐ Fail |

**Notes:** ___________________________________

---

#### Scenario 2: Different Diary Navigation

| Checkpoint | Expected | Actual | Pass/Fail |
|------------|----------|--------|-----------|
| Analysis started on Diary A | Status banner visible | | ☐ Pass ☐ Fail |
| Navigate to Diary B | No analysis status on B | | ☐ Pass ☐ Fail |
| Polling logs show Diary A ID | diaryId matches Diary A | | ☐ Pass ☐ Fail |
| Status updates for Diary A | Progress increases | | ☐ Pass ☐ Fail |
| Return to Diary A | Status reflects updates | | ☐ Pass ☐ Fail |

**Notes:** ___________________________________

---

#### Scenario 3: New Diary Creation

| Checkpoint | Expected | Actual | Pass/Fail |
|------------|----------|--------|-----------|
| Analysis started on Diary A | Polling begins | | ☐ Pass ☐ Fail |
| Navigate to New Diary page | Polling continues | | ☐ Pass ☐ Fail |
| Create and save new diary | Polling still for Diary A | | ☐ Pass ☐ Fail |
| No conflict between diaries | Both function independently | | ☐ Pass ☐ Fail |

**Notes:** ___________________________________

---

#### Scenario 4: Multiple Navigations

| Checkpoint | Expected | Actual | Pass/Fail |
|------------|----------|--------|-----------|
| Rapid navigation sequence | No errors | | ☐ Pass ☐ Fail |
| Polling remains at 3s intervals | Consistent timing | | ☐ Pass ☐ Fail |
| No duplicate intervals | Single polling log per 3s | | ☐ Pass ☐ Fail |
| Status updates correctly | Progress increases | | ☐ Pass ☐ Fail |

**Notes:** ___________________________________

---

#### Scenario 5: Completion While Away

| Checkpoint | Expected | Actual | Pass/Fail |
|------------|----------|--------|-----------|
| Navigate to Timeline | Polling continues | | ☐ Pass ☐ Fail |
| Wait for completion (5-10 min) | COMPLETED log appears | | ☐ Pass ☐ Fail |
| Polling stops | "Stopping polling" log | | ☐ Pass ☐ Fail |
| localStorage cleared | 0 jobs remaining | | ☐ Pass ☐ Fail |
| Return to Diary A | Results visible immediately | | ☐ Pass ☐ Fail |
| Emotion icon displayed | 78px colorful icon | | ☐ Pass ☐ Fail |
| Emotion breakdown displayed | 8 emotions with % | | ☐ Pass ☐ Fail |

**Notes:** ___________________________________

---

### Timing Measurements

**Polling Interval Consistency:**

| Poll # | Timestamp | Interval (s) | Expected (3s) | Pass/Fail |
|--------|-----------|--------------|---------------|-----------|
| 1 | ____:____:____ | - | - | ☐ Pass ☐ Fail |
| 2 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 3 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 4 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 5 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 6 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 7 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 8 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 9 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |
| 10 | ____:____:____ | _____ | 3 | ☐ Pass ☐ Fail |

**Average Interval:** _____ seconds (Target: 3.0s ± 0.5s)

---

### Requirement Validation

#### AC-4.1: Analysis continues in background

- [ ] **Pass**: Polling logs visible on Timeline page
- [ ] **Pass**: Polling logs visible on different Diary page
- [ ] **Pass**: Polling logs visible on New Diary page
- [ ] **Fail**: ________________________________

#### AC-4.2: Polling at 3-second intervals

- [ ] **Pass**: 10 consecutive polls at 3s intervals (±0.5s)
- [ ] **Pass**: No missed polls during navigation
- [ ] **Pass**: No duplicate polls
- [ ] **Fail**: ________________________________

#### AC-4.3: Status visible on return

- [ ] **Pass**: Status banner displays when returning
- [ ] **Pass**: Progress bar shows updated percentage
- [ ] **Pass**: Job ID and timestamp still displayed
- [ ] **Fail**: ________________________________

#### AC-4.4: Results shown if completed

- [ ] **Pass**: Analysis completes while away (Timeline)
- [ ] **Pass**: Console shows completion on different page
- [ ] **Pass**: Polling stops after completion
- [ ] **Pass**: localStorage cleared (0 jobs)
- [ ] **Pass**: Results display immediately on return
- [ ] **Pass**: Emotion icon visible
- [ ] **Pass**: Emotion breakdown visible
- [ ] **Fail**: ________________________________

---

### Issues Encountered

| Issue # | Description | Scenario | Severity | Resolution |
|---------|-------------|----------|----------|------------|
| 1 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | |
| 2 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | |
| 3 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | |

---

### Overall Test Result

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED

**Summary:**
_Provide a brief summary of cross-page analysis tracking test results._

---

**Key Findings:**
- ___________________________________
- ___________________________________
- ___________________________________

**Recommendations:**
- ___________________________________
- ___________________________________
- ___________________________________

---

**Tester Signature:** ___________________
**Date Completed:** ___________________

---

## Conclusion

This comprehensive cross-page analysis tracking test plan validates that the `useAnalysisPolling` hook and localStorage persistence work correctly across all navigation scenarios. By following these test scenarios, timing measurements, and verification steps, you can confirm that:

1. ✅ **AC-4.1**: Analysis continues processing when user navigates away
2. ✅ **AC-4.2**: Polling maintains 3-second intervals regardless of page
3. ✅ **AC-4.3**: Status is correctly displayed when returning to diary
4. ✅ **AC-4.4**: Results are shown immediately if analysis completed during absence

### Key Takeaways

- **Background polling is page-independent** - continues on Timeline, different Diary, or New Diary pages
- **localStorage ensures persistence** - jobs survive navigation, refresh, and browser close
- **Cache invalidation works across pages** - results available immediately on return
- **Timing is consistent** - 3-second intervals maintained through navigation

### Next Steps

After completing this test:
1. Mark Task 21 as complete using `claude-code-spec-workflow get-tasks diary-ui-emotion-fixes 21 --mode complete`
2. Document any issues found in task-21-issues.md (if needed)
3. Proceed to Task 22 (Performance validation)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Author:** Claude (AI Assistant)
**Status:** Ready for Execution
