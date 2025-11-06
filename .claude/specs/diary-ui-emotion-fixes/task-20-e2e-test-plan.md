# Task 20: End-to-End Test Plan - Diary with Emotion Analysis

**Feature:** diary-ui-emotion-fixes
**Task:** Task 20 - End-to-end test: Create diary with analysis
**Created:** 2025-11-06
**Status:** Ready for Execution

---

## Table of Contents

1. [Test Overview](#test-overview)
2. [Prerequisites](#prerequisites)
3. [Expected Console Logs](#expected-console-logs)
4. [Test Execution Steps](#test-execution-steps)
5. [Visual Checkpoints](#visual-checkpoints)
6. [Success Criteria](#success-criteria)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Test Execution Template](#test-execution-template)

---

## Test Overview

### Purpose
Validate the complete end-to-end workflow of creating a diary entry with emotion analysis, covering all five requirements:

- **Requirement 1**: Diary Content Persistence
- **Requirement 2**: Emotion Analysis Status Visibility
- **Requirement 3**: Emotion Analysis Result Persistence
- **Requirement 4**: Background Analysis Polling
- **Requirement 5**: Emotion Icon Generation

### Scope
This test validates the entire user journey from diary creation through emotion analysis completion, including:
- BlockNote editor content serialization
- Diary save and cache invalidation
- Sidebar display update
- Emotion analysis initiation
- Status indicator display (spinner, progress bar, messages)
- Background polling continuation
- Analysis completion detection
- Emotion breakdown display
- Icon generation and display
- Page reload persistence
- Cross-page navigation persistence

### Test Duration
Approximately **15-20 minutes** (including ~5 minutes for AWS Comprehend analysis)

---

## Prerequisites

### Environment Setup

1. **Backend Server Running**
   ```bash
   cd /Users/gakuinoue/workspace/JOB_Project/kibi/backend
   npm run dev
   # Should be running on http://localhost:8080
   ```

2. **Frontend Server Running**
   ```bash
   cd /Users/gakuinoue/workspace/JOB_Project/kibi/front
   npm run dev
   # Should be running on http://localhost:3000
   ```

3. **AWS Credentials Configured**
   - Backend `.env` file contains valid AWS credentials
   - AWS Comprehend classifier is available: `kibi-emotion-classifier`
   - S3 bucket is accessible: `kibi-content-223708988018`
   - DynamoDB tables exist: `Diaries`, `EmotionAnalysis`

4. **Browser Setup**
   - Use Chrome, Firefox, or Safari (latest version)
   - Open Developer Tools (F12 or Cmd+Option+I)
   - Navigate to Console tab
   - Clear console logs before starting test
   - Clear localStorage (optional, for clean test):
     ```javascript
     localStorage.clear()
     ```

5. **Test Content Prepared**
   Use this sample diary content for consistent testing:
   ```
   Title: 素晴らしい一日

   Content:
   今日は本当に素晴らしい一日でした。朝から気分が良く、プロジェクトも順調に進みました。
   チームメンバーとのミーティングでは良いアイデアがたくさん生まれ、とても充実していました。
   夕方には友人とカフェで楽しい時間を過ごし、心が温かくなりました。
   明日も良い日になりそうです。
   ```

---

## Expected Console Logs

### Phase 1: Diary Creation and Save

#### Frontend Logs (Browser Console)

```
[BlockNote] Content changed: [{"id":"...","type":"paragraph","props":...}]
[DiaryEditPage] Editor content received, length: 456
[DiaryEditPage] handleSave called with content: [{"id":"...","type":"paragraph",...}]
[DiaryEditPage] Creating new diary with title: 素晴らしい一日 content length: 456
[useDiary] createDiary called { contentLength: 456, hasDate: false }
```

**API Request:**
```
POST http://localhost:8080/diary
Request Body: { title: "素晴らしい一日", content: "[{...}]", date: null }
```

```
[useDiary] createDiary API response { diaryId: "uuid-1234", contentLength: 456, createdAt: "2025-11-06T..." }
[useDiary] Invalidating cache: diary-list
[useDiary] Invalidating cache: diary-uuid-1234
```

#### Backend Logs (Terminal)

```
POST /diary - Creating new diary
Diary created successfully: uuid-1234
```

### Phase 2: Emotion Analysis Initiation

#### Frontend Logs

```
[DiaryEditPage] Starting async analysis for diary: uuid-1234
[useDiary] startAsyncAnalysis called for diary: uuid-1234
```

**API Request:**
```
POST http://localhost:8080/diary/uuid-1234/analyze
Response: { jobId: "comprehend-job-id-5678", status: "SUBMITTED" }
```

```
[useAnalysisPolling] Adding job: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678" }
[useAnalysisPolling] Job added: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678", status: "SUBMITTED", progress: 10 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [{ diaryId: "uuid-1234", status: "SUBMITTED", progress: 10 }]
```

#### Backend Logs

```
POST /diary/uuid-1234/analyze - Starting emotion analysis
[EmotionAnalysis] Translating content to English...
[EmotionAnalysis] Translation completed: 186 characters
[EmotionAnalysis] Uploading to S3: s3://kibi-content-223708988018/input/uuid-1234/content.txt
[EmotionAnalysis] Starting Comprehend classification job
[EmotionAnalysis] Job started successfully: comprehend-job-id-5678
```

### Phase 3: Background Polling

#### Frontend Logs (Every 3 seconds)

```
[useAnalysisPolling] Starting polling for 1 jobs
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678", currentStatus: "SUBMITTED" }
```

**API Request:**
```
GET http://localhost:8080/diary/uuid-1234/analyze/status/comprehend-job-id-5678
Response: { status: "IN_PROGRESS", progress: 50 }
```

```
[useAnalysisPolling] Poll response: { diaryId: "uuid-1234", status: "IN_PROGRESS", progress: 50 }
[useAnalysisPolling] Updating job status: { diaryId: "uuid-1234", newStatus: "IN_PROGRESS", newProgress: 50 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [{ diaryId: "uuid-1234", status: "IN_PROGRESS", progress: 50 }]
```

#### Backend Logs (Per Poll)

```
GET /diary/uuid-1234/analyze/status/comprehend-job-id-5678
[Analyze Status] Checking job comprehend-job-id-5678 for diary uuid-1234
[Comprehend] Job status: IN_PROGRESS (50%)
```

### Phase 4: Analysis Completion

#### Frontend Logs

```
[useAnalysisPolling] Polling job: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678", currentStatus: "IN_PROGRESS" }
```

**API Request:**
```
GET http://localhost:8080/diary/uuid-1234/analyze/status/comprehend-job-id-5678
Response: {
  status: "COMPLETED",
  diary: {
    id: "uuid-1234",
    title: "素晴らしい一日",
    emotionAnalysis: { joy: 0.85, trust: 0.72, ... },
    iconData: { triangles: [...], colors: [...] }
  }
}
```

```
[useAnalysisPolling] Poll response: { diaryId: "uuid-1234", status: "COMPLETED" }
[useAnalysisPolling] Analysis completed for diary: uuid-1234
[useAnalysisPolling] Removing job for diary: uuid-1234
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
[useAnalysisPolling] Stopping polling interval
```

#### Backend Logs

```
GET /diary/uuid-1234/analyze/status/comprehend-job-id-5678
[Analyze Status] Checking job comprehend-job-id-5678 for diary uuid-1234
[Comprehend] Job status: COMPLETED
[Analyze Status] Job completed, fetching results...
[Comprehend] Downloading results from S3: s3://kibi-content-223708988018/output/comprehend-job-id-5678/output.tar.gz
[Comprehend] Parsing JSONL results...
[Comprehend] Parsed emotion scores: { joy: 0.85, trust: 0.72, fear: 0.02, surprise: 0.18, sadness: 0.01, disgust: 0.01, anger: 0.01, anticipation: 0.65 }
[Analyze Status] Saving analysis to DynamoDB: { diaryId: "uuid-1234", joy: 0.85, ... }
[DynamoDB] Saved emotion analysis for diary: uuid-1234
[Analyze Status] Generating emotion icon...
[IconGen] Generating icon for emotions: { joy: 0.85, trust: 0.72, ... }
[IconGen] Generated icon: { triangles: 24, seed: 1234, colors: [...] }
[DynamoDB] Updated diary with emotion analysis and icon data
[Analyze Status] Analysis complete with icon
```

### Phase 5: Icon Display

#### Frontend Logs

```
[EmotionIcon] Rendering icon with size: 78
[EmotionBreakdown] Rendering breakdown with 8 emotions
```

---

## Test Execution Steps

### Step 1: Initial Setup (2 minutes)

**Action:**
1. Open browser to `http://localhost:3000`
2. Open Developer Tools and navigate to Console tab
3. Clear console logs
4. Clear localStorage (optional):
   ```javascript
   localStorage.clear()
   ```

**Expected Result:**
- Application loads successfully
- Sidebar shows "日記がありません" (no diaries yet)
- "新しい日記" button is visible

**Visual Checkpoint:**
- ✅ Sidebar is visible on the left
- ✅ Main area shows empty editor
- ✅ No console errors

---

### Step 2: Create New Diary Entry (3 minutes)

**Action:**
1. Click "新しい日記" button or navigate to `http://localhost:3000/`
2. Enter title: **素晴らしい一日**
3. Enter content in BlockNote editor (use sample content from Prerequisites)
4. Observe console logs for `[BlockNote] Content changed`

**Expected Console Logs:**
```
[BlockNote] Content changed: [{"id":"...","type":"paragraph",...}]
[DiaryEditPage] Editor content received, length: 456
```

**Visual Checkpoint:**
- ✅ Title field shows "素晴らしい一日"
- ✅ Editor displays formatted content
- ✅ "未保存" (unsaved) indicator appears near save button
- ✅ Save button is enabled

---

### Step 3: Save Diary Entry (1 minute)

**Action:**
1. Click "保存" (Save) button
2. Observe console logs for save operation
3. Check Network tab for POST request to `/diary`

**Expected Console Logs:**
```
[DiaryEditPage] handleSave called with content: [...]
[DiaryEditPage] Creating new diary with title: 素晴らしい一日 content length: 456
[useDiary] createDiary called { contentLength: 456, hasDate: false }
[useDiary] createDiary API response { diaryId: "uuid-1234", contentLength: 456, ... }
[useDiary] Invalidating cache: diary-list
[useDiary] Invalidating cache: diary-uuid-1234
```

**Expected Network Request:**
```
POST http://localhost:8080/diary
Status: 200 OK
Response: { id: "uuid-1234", title: "素晴らしい一日", content: "[...]", ... }
```

**Visual Checkpoint:**
- ✅ Page navigates to `/diary/uuid-1234`
- ✅ Diary appears in sidebar with title "素晴らしい一日"
- ✅ Diary icon shows 📄 (no analysis yet)
- ✅ "未保存" indicator disappears

---

### Step 4: Verify Diary in Sidebar (1 minute)

**Action:**
1. Look at the sidebar on the left
2. Verify diary entry is listed
3. Click on the diary entry in sidebar

**Expected Console Logs:**
```
(None - passive observation)
```

**Visual Checkpoint:**
- ✅ Sidebar shows "素晴らしい一日" entry
- ✅ Entry displays 📄 icon (not yet analyzed)
- ✅ Clicking entry navigates to diary detail page
- ✅ Content is displayed correctly

---

### Step 5: Emotion Analysis Initiation (1 minute)

**Action:**
1. Ensure you're on the diary detail page (`/diary/uuid-1234`)
2. Analysis should start automatically after save
3. Observe status indicator appears

**Expected Console Logs:**
```
[useAnalysisPolling] Adding job: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678" }
[useAnalysisPolling] Job added: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678", status: "SUBMITTED", progress: 10 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [...]
[useAnalysisPolling] Starting polling for 1 jobs
```

**Visual Checkpoint:**
- ✅ Blue status banner appears at top of editor
- ✅ Spinner animation is visible
- ✅ Status message: "分析タスクを送信しました" or "感情を分析中..."
- ✅ Progress bar shows (10% or 50%)
- ✅ Job ID is displayed (e.g., "ジョブID: 12345678")
- ✅ Start time is displayed (e.g., "開始: 15:30:45")
- ✅ Date metadata shows "• 分析中" badge

---

### Step 6: Verify Background Polling (2 minutes)

**Action:**
1. Stay on the diary detail page
2. Observe console logs every 3 seconds
3. Watch progress bar update

**Expected Console Logs (every 3 seconds):**
```
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678", currentStatus: "SUBMITTED" }
[useAnalysisPolling] Poll response: { diaryId: "uuid-1234", status: "IN_PROGRESS", progress: 50 }
[useAnalysisPolling] Updating job status: { diaryId: "uuid-1234", newStatus: "IN_PROGRESS", newProgress: 50 }
```

**Visual Checkpoint:**
- ✅ Status banner remains visible
- ✅ Progress bar updates smoothly (10% → 50%)
- ✅ Status message changes to "感情を分析中..."
- ✅ Percentage text updates (e.g., "50%")
- ✅ No UI freezing or lag

---

### Step 7: Cross-Page Navigation Test (2 minutes)

**Action:**
1. While analysis is running, click "時系列表示" (Timeline) in sidebar
2. Navigate to `/timeline`
3. Observe console logs continue polling
4. Wait 10 seconds
5. Navigate back to diary detail page

**Expected Console Logs (continues on timeline page):**
```
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "uuid-1234", ... }
[useAnalysisPolling] Poll response: { diaryId: "uuid-1234", status: "IN_PROGRESS", progress: 50 }
```

**Visual Checkpoint:**
- ✅ Console logs continue while on timeline page
- ✅ No errors in console
- ✅ When returning to diary page, status banner reappears
- ✅ Progress bar reflects current analysis state

---

### Step 8: Wait for Analysis Completion (3-5 minutes)

**Action:**
1. Return to diary detail page (`/diary/uuid-1234`)
2. Wait for AWS Comprehend to complete analysis
3. Watch for completion logs

**Expected Console Logs (on completion):**
```
[useAnalysisPolling] Polling job: { diaryId: "uuid-1234", jobId: "comprehend-job-id-5678", currentStatus: "IN_PROGRESS" }
[useAnalysisPolling] Poll response: { diaryId: "uuid-1234", status: "COMPLETED" }
[useAnalysisPolling] Analysis completed for diary: uuid-1234
[useAnalysisPolling] Removing job for diary: uuid-1234
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
[useAnalysisPolling] Stopping polling interval
```

**Visual Checkpoint:**
- ✅ Status banner disappears after completion
- ✅ Emotion icon appears (colorful geometric icon)
- ✅ Emotion breakdown appears with percentages
- ✅ Date metadata shows "• 感情分析済み" badge
- ✅ Sidebar icon changes from 📄 to 🎨

---

### Step 9: Verify Emotion Results Display (2 minutes)

**Action:**
1. Inspect the emotion icon (78px size)
2. Review emotion breakdown percentages
3. Verify all 8 emotions are listed

**Expected Console Logs:**
```
[EmotionIcon] Rendering icon with size: 78
[EmotionBreakdown] Rendering breakdown with 8 emotions
```

**Visual Checkpoint:**
- ✅ **Emotion Icon** (78px):
  - Displayed near top of page
  - Colorful triangular/geometric pattern
  - Deterministic (same icon on refresh)
- ✅ **Emotion Breakdown** (next to icon):
  - Shows 8 emotions sorted by percentage
  - Each emotion has:
    - Colored dot (matches emotion color)
    - Japanese label (喜び, 信頼, 恐れ, etc.)
    - Percentage value (e.g., 85%)
  - Emotions sorted highest to lowest
  - Example expected breakdown:
    ```
    🟡 喜び: 85%
    🟢 信頼: 72%
    🟣 期待: 65%
    🟠 驚き: 18%
    🔵 恐れ: 2%
    🟤 悲しみ: 1%
    🔴 怒り: 1%
    ⚫ 嫌悪: 1%
    ```

---

### Step 10: Page Reload Persistence Test (1 minute)

**Action:**
1. Press F5 (or Cmd+R) to reload the page
2. Observe that emotion results persist

**Expected Console Logs:**
```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] No jobs found in localStorage
[EmotionIcon] Rendering icon with size: 78
[EmotionBreakdown] Rendering breakdown with 8 emotions
```

**Visual Checkpoint:**
- ✅ Page reloads successfully
- ✅ Emotion icon still displayed (same icon as before)
- ✅ Emotion breakdown still displayed (same percentages)
- ✅ No analysis status banner (analysis already complete)
- ✅ Date metadata still shows "• 感情分析済み"

---

### Step 11: Sidebar Icon Verification (1 minute)

**Action:**
1. Look at the sidebar diary list
2. Verify diary icon changed to 🎨

**Expected Console Logs:**
```
(None - passive observation)
```

**Visual Checkpoint:**
- ✅ Sidebar shows "素晴らしい一日" with 🎨 icon
- ✅ Icon indicates emotion analysis is complete

---

### Step 12: Navigate Away and Return Test (1 minute)

**Action:**
1. Click "時系列表示" to navigate to timeline
2. Wait 5 seconds
3. Click diary entry in sidebar to return

**Expected Console Logs:**
```
[EmotionIcon] Rendering icon with size: 78
[EmotionBreakdown] Rendering breakdown with 8 emotions
```

**Visual Checkpoint:**
- ✅ Emotion icon and breakdown still displayed
- ✅ No re-analysis triggered
- ✅ Results match previous display

---

### Step 13: LocalStorage Verification (1 minute)

**Action:**
1. Open DevTools → Application tab (Chrome) or Storage tab (Firefox)
2. Navigate to Local Storage → `http://localhost:3000`
3. Check `kibi_analysis_jobs` key

**Expected Result:**
```javascript
// After analysis completion, should be empty or null
localStorage.getItem('kibi_analysis_jobs')
// null or "[]"
```

**Visual Checkpoint:**
- ✅ `kibi_analysis_jobs` is empty (completed jobs removed)
- ✅ No orphaned job data

---

## Visual Checkpoints

### Summary of All Visual States

#### 1. **Initial State** (No Diary)
- Sidebar: "日記がありません"
- Main area: Empty editor
- No emotion data

#### 2. **Editing State** (Before Save)
- Title field: Populated
- Editor: Content visible
- "未保存" indicator: Visible
- Save button: Enabled

#### 3. **After Save** (Before Analysis)
- Sidebar: Diary listed with 📄 icon
- Title: "素晴らしい一日"
- No emotion data yet

#### 4. **Analysis Running**
- Blue status banner:
  - Spinner animation
  - Status text: "感情を分析中..."
  - Progress bar: 10-50%
  - Job ID: "12345678"
  - Start time: "15:30:45"
  - Percentage: "50%"
- Date metadata: "• 分析中" badge

#### 5. **Analysis Complete**
- Status banner: Gone
- Emotion icon: 78px colorful geometric shape
- Emotion breakdown:
  - 8 emotions with colored dots
  - Japanese labels
  - Percentages sorted high to low
- Date metadata: "• 感情分析済み"
- Sidebar icon: 🎨

---

## Success Criteria

### All Tests Must Pass

#### ✅ Requirement 1: Diary Content Persistence
- [ ] Diary appears in sidebar immediately after save
- [ ] Clicking sidebar entry navigates to diary
- [ ] Content is preserved exactly as written
- [ ] Page reload shows saved content

#### ✅ Requirement 2: Emotion Analysis Status Visibility
- [ ] Status indicator appears when analysis starts
- [ ] Status shows: SUBMITTED → IN_PROGRESS → COMPLETED
- [ ] Progress bar updates (10% → 50% → 100%)
- [ ] Job ID and timestamp displayed
- [ ] Status persists across page navigation

#### ✅ Requirement 3: Emotion Analysis Result Persistence
- [ ] Results saved to DynamoDB (backend logs confirm)
- [ ] Results displayed after completion
- [ ] Emotion breakdown shows accurate percentages
- [ ] Results persist after page reload

#### ✅ Requirement 4: Background Analysis Polling
- [ ] Polling continues every 3 seconds
- [ ] Polling continues on other pages
- [ ] Polling stops after completion
- [ ] Completed jobs removed from localStorage

#### ✅ Requirement 5: Emotion Icon Generation
- [ ] Icon generated after analysis
- [ ] Icon displayed at 78px size
- [ ] Icon is deterministic (same on reload)
- [ ] Icon displayed in sidebar (🎨)
- [ ] Icon matches emotion scores

### Performance Criteria

- [ ] Diary save completes within 2 seconds
- [ ] Page loads display cached data within 500ms
- [ ] UI remains responsive during analysis
- [ ] No blocking operations or freezing

### Console Log Criteria

- [ ] No errors in browser console
- [ ] No errors in backend terminal
- [ ] All expected log messages appear
- [ ] Log prefixes are consistent ([BlockNote], [useDiary], etc.)

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Diary Not Appearing in Sidebar

**Symptoms:**
- Save button clicked
- No diary shows in sidebar
- Console shows API success

**Possible Causes:**
1. SWR cache not invalidated
2. Sidebar component not re-rendering

**Debug Steps:**
```javascript
// In browser console
import { mutate } from 'swr';
mutate('diary-list');
// Should trigger sidebar refresh
```

**Solution:**
- Check `useDiary.ts` line 49-54 for `mutate()` calls
- Verify `DIARY_LIST_KEY` constant matches ('diary-list')
- Ensure `mutate()` is called after API success

---

#### Issue 2: Analysis Status Not Showing

**Symptoms:**
- Save completes
- No blue status banner appears
- No console logs about polling

**Possible Causes:**
1. Analysis not starting automatically
2. `useAnalysisPolling` hook not initialized
3. Job not added to state

**Debug Steps:**
```javascript
// Check localStorage
console.log(localStorage.getItem('kibi_analysis_jobs'));
// Should show active job

// Check hook state (add to component)
console.log('Jobs:', jobs);
```

**Solution:**
- Verify `startAsyncAnalysis()` is called in `handleSave()`
- Check `addJob()` is called after receiving `jobId`
- Ensure `useAnalysisPolling` hook is mounted in `DiaryEditPage`

---

#### Issue 3: Polling Not Happening

**Symptoms:**
- Status banner shows but doesn't update
- Console logs stop after first poll
- Progress bar stuck at 10%

**Possible Causes:**
1. Polling interval not starting
2. Network errors blocking requests
3. Jobs array empty in hook state

**Debug Steps:**
```javascript
// Check network tab
// Should see GET requests every 3 seconds to:
// /diary/{id}/analyze/status/{jobId}

// Check jobs in localStorage
console.log(localStorage.getItem('kibi_analysis_jobs'));
```

**Solution:**
- Verify `jobs.length > 0` triggers interval (line 122-140)
- Check Network tab for errors
- Ensure `pollJob()` doesn't throw unhandled errors
- Verify backend `/analyze/status` endpoint is working

---

#### Issue 4: Emotion Results Not Displaying

**Symptoms:**
- Polling completes (logs show COMPLETED)
- No emotion icon appears
- No emotion breakdown shown

**Possible Causes:**
1. Analysis results not saved to DynamoDB
2. Icon generation failed
3. Frontend components not receiving data

**Debug Steps:**
```bash
# Check backend logs for:
[Analyze Status] Saving analysis to DynamoDB
[IconGen] Generating icon for emotions

# Check browser console for:
[EmotionIcon] Rendering icon with size: 78
```

**Solution:**
- Verify backend saves analysis (check `diary.ts` line 307-308)
- Check DynamoDB for `emotionAnalysis` and `iconData` fields
- Ensure SWR cache updated with new diary data
- Verify `EmotionIcon` and `EmotionBreakdown` components render

---

#### Issue 5: AWS Comprehend Job Fails

**Symptoms:**
- Analysis starts but fails quickly
- Backend logs show AWS errors
- Status shows FAILED

**Possible Causes:**
1. Invalid AWS credentials
2. Comprehend classifier not available
3. S3 bucket access denied
4. Content too short for analysis

**Debug Steps:**
```bash
# Check backend .env file
echo $AWS_ACCESS_KEY_ID
echo $COMPREHEND_CLASSIFIER_ARN

# Check backend logs for specific error
[Comprehend] Error: ...
```

**Solution:**
- Verify AWS credentials are valid and not expired
- Check IAM role has Comprehend and S3 permissions
- Ensure classifier ARN is correct
- Verify content is at least 10 characters
- Check S3 bucket name and region

---

#### Issue 6: Page Reload Loses Results

**Symptoms:**
- Emotion results shown initially
- After reload, results disappear
- Analysis status banner reappears

**Possible Causes:**
1. Results not saved to DynamoDB
2. SWR cache not persisting
3. API not returning saved results

**Debug Steps:**
```bash
# Check DynamoDB for diary entry
# Should have emotionAnalysis and iconData fields

# Check API response
curl http://localhost:8080/diary/{id}
# Should include emotionAnalysis and iconData
```

**Solution:**
- Verify backend saves to DynamoDB (line 307-308 in `diary.ts`)
- Check API returns complete diary object
- Ensure SWR revalidation fetches saved data

---

#### Issue 7: Console Errors

**Common Errors and Fixes:**

**Error:** `Cannot read property 'id' of undefined`
- **Cause:** Diary data not loaded yet
- **Fix:** Add null checks in component render

**Error:** `Failed to fetch`
- **Cause:** Backend server not running
- **Fix:** Start backend with `npm run dev`

**Error:** `Unexpected token < in JSON`
- **Cause:** API returning HTML error page
- **Fix:** Check backend logs for actual error

**Error:** `Invalid Date`
- **Cause:** Date string not parsed correctly
- **Fix:** Verify `convertDatesToObjects()` in `repository.ts`

---

## Test Execution Template

### Test Execution Record

**Date:** ___________
**Tester:** ___________
**Environment:**
- Frontend: `http://localhost:3000` ☐
- Backend: `http://localhost:8080` ☐
- AWS Credentials: Valid ☐

---

### Test Results

| Step | Test Case | Pass/Fail | Notes |
|------|-----------|-----------|-------|
| 1 | Initial Setup | ☐ Pass ☐ Fail | |
| 2 | Create New Diary Entry | ☐ Pass ☐ Fail | |
| 3 | Save Diary Entry | ☐ Pass ☐ Fail | |
| 4 | Verify Diary in Sidebar | ☐ Pass ☐ Fail | |
| 5 | Emotion Analysis Initiation | ☐ Pass ☐ Fail | |
| 6 | Verify Background Polling | ☐ Pass ☐ Fail | |
| 7 | Cross-Page Navigation Test | ☐ Pass ☐ Fail | |
| 8 | Wait for Analysis Completion | ☐ Pass ☐ Fail | |
| 9 | Verify Emotion Results Display | ☐ Pass ☐ Fail | |
| 10 | Page Reload Persistence Test | ☐ Pass ☐ Fail | |
| 11 | Sidebar Icon Verification | ☐ Pass ☐ Fail | |
| 12 | Navigate Away and Return Test | ☐ Pass ☐ Fail | |
| 13 | LocalStorage Verification | ☐ Pass ☐ Fail | |

---

### Requirement Coverage

| Requirement | Pass/Fail | Evidence |
|-------------|-----------|----------|
| **Req 1: Diary Content Persistence** | ☐ Pass ☐ Fail | |
| AC-1.1: Entry appears in sidebar | ☐ Pass ☐ Fail | |
| AC-1.2: Navigate to saved entry | ☐ Pass ☐ Fail | |
| AC-1.3: Content serialized correctly | ☐ Pass ☐ Fail | |
| AC-1.4: Content renders correctly | ☐ Pass ☐ Fail | |
| **Req 2: Emotion Analysis Status Visibility** | ☐ Pass ☐ Fail | |
| AC-2.1: Status indicator displayed | ☐ Pass ☐ Fail | |
| AC-2.2: Status persists across navigation | ☐ Pass ☐ Fail | |
| AC-2.3: Emotion results displayed | ☐ Pass ☐ Fail | |
| AC-2.4: Status updates to completion | ☐ Pass ☐ Fail | |
| AC-2.5: Error message on failure | ☐ Pass ☐ Fail | |
| **Req 3: Emotion Analysis Result Persistence** | ☐ Pass ☐ Fail | |
| AC-3.1: Results saved to DynamoDB | ☐ Pass ☐ Fail | |
| AC-3.2: Diary updated with results | ☐ Pass ☐ Fail | |
| AC-3.3: Icon generated and stored | ☐ Pass ☐ Fail | |
| AC-3.4: Results persist after reload | ☐ Pass ☐ Fail | |
| AC-3.5: Accurate emotion percentages | ☐ Pass ☐ Fail | |
| **Req 4: Background Analysis Polling** | ☐ Pass ☐ Fail | |
| AC-4.1: Analysis continues in background | ☐ Pass ☐ Fail | |
| AC-4.2: Polling at 3-second intervals | ☐ Pass ☐ Fail | |
| AC-4.3: Status visible on return | ☐ Pass ☐ Fail | |
| AC-4.4: Results shown if completed | ☐ Pass ☐ Fail | |
| **Req 5: Emotion Icon Generation** | ☐ Pass ☐ Fail | |
| AC-5.1: Icon generated on completion | ☐ Pass ☐ Fail | |
| AC-5.2: Icon represents emotions | ☐ Pass ☐ Fail | |
| AC-5.3: Icon displayed prominently | ☐ Pass ☐ Fail | |
| AC-5.4: Icon is deterministic | ☐ Pass ☐ Fail | |
| AC-5.5: Icon in diary list | ☐ Pass ☐ Fail | |

---

### Performance Results

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Diary save time | < 2 seconds | _____ sec | ☐ Pass ☐ Fail |
| Initial page load | < 500ms | _____ ms | ☐ Pass ☐ Fail |
| Polling interval | 3 seconds | _____ sec | ☐ Pass ☐ Fail |
| UI responsiveness | No lag | _____ | ☐ Pass ☐ Fail |
| Analysis completion | 3-7 minutes | _____ min | ☐ Pass ☐ Fail |

---

### Issues Found

| Issue # | Description | Severity | Steps to Reproduce | Status |
|---------|-------------|----------|-------------------|--------|
| 1 | | ☐ Critical ☐ High ☐ Medium ☐ Low | | ☐ Open ☐ Fixed |
| 2 | | ☐ Critical ☐ High ☐ Medium ☐ Low | | ☐ Open ☐ Fixed |
| 3 | | ☐ Critical ☐ High ☐ Medium ☐ Low | | ☐ Open ☐ Fixed |

---

### Overall Test Result

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED

**Summary:**
_Provide a brief summary of test execution results, including any major findings or recommendations._

---

**Tester Signature:** ___________________
**Date Completed:** ___________________

---

## Appendix: Log Examples

### Complete Log Flow (Abridged)

```
=== FRONTEND: Diary Creation ===
[BlockNote] Content changed: [{"id":"abc123",...}]
[DiaryEditPage] Editor content received, length: 456
[DiaryEditPage] handleSave called with content: [...]
[useDiary] createDiary called { contentLength: 456, hasDate: false }
[useDiary] createDiary API response { diaryId: "uuid-1234", ... }
[useDiary] Invalidating cache: diary-list
[useDiary] Invalidating cache: diary-uuid-1234

=== FRONTEND: Analysis Start ===
[useAnalysisPolling] Adding job: { diaryId: "uuid-1234", jobId: "job-5678" }
[useAnalysisPolling] Job added: { ..., status: "SUBMITTED", progress: 10 }
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs

=== FRONTEND: Polling (every 3 sec) ===
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: { diaryId: "uuid-1234", ... }
[useAnalysisPolling] Poll response: { status: "IN_PROGRESS", progress: 50 }
[useAnalysisPolling] Updating job status: { newStatus: "IN_PROGRESS", newProgress: 50 }

=== FRONTEND: Completion ===
[useAnalysisPolling] Poll response: { status: "COMPLETED", diary: {...} }
[useAnalysisPolling] Analysis completed for diary: uuid-1234
[useAnalysisPolling] Removing job for diary: uuid-1234
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs
[useAnalysisPolling] Stopping polling interval

=== FRONTEND: Display ===
[EmotionIcon] Rendering icon with size: 78
[EmotionBreakdown] Rendering breakdown with 8 emotions

=== BACKEND: Analysis Flow ===
POST /diary/uuid-1234/analyze - Starting emotion analysis
[EmotionAnalysis] Translating content to English...
[EmotionAnalysis] Translation completed: 186 characters
[EmotionAnalysis] Uploading to S3: s3://kibi-content-223708988018/input/...
[EmotionAnalysis] Starting Comprehend classification job
[EmotionAnalysis] Job started successfully: job-5678

GET /diary/uuid-1234/analyze/status/job-5678
[Analyze Status] Checking job job-5678 for diary uuid-1234
[Comprehend] Job status: IN_PROGRESS (50%)

GET /diary/uuid-1234/analyze/status/job-5678
[Analyze Status] Job completed, fetching results...
[Comprehend] Downloading results from S3: s3://...
[Comprehend] Parsing JSONL results...
[Comprehend] Parsed emotion scores: { joy: 0.85, ... }
[Analyze Status] Saving analysis to DynamoDB
[DynamoDB] Saved emotion analysis for diary: uuid-1234
[Analyze Status] Generating emotion icon...
[IconGen] Generating icon for emotions: { joy: 0.85, ... }
[IconGen] Generated icon: { triangles: 24, seed: 1234, ... }
[DynamoDB] Updated diary with emotion analysis and icon data
[Analyze Status] Analysis complete with icon
```

---

## Conclusion

This comprehensive test plan validates the complete end-to-end workflow for diary creation with emotion analysis. By following these steps and checking all visual and console checkpoints, you can confirm that all five requirements are met:

1. ✅ **Diary Content Persistence**
2. ✅ **Emotion Analysis Status Visibility**
3. ✅ **Emotion Analysis Result Persistence**
4. ✅ **Background Analysis Polling**
5. ✅ **Emotion Icon Generation**

**Test completion indicates Task 20 is successfully implemented.**

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Author:** Claude (AI Assistant)
**Status:** Ready for Execution
