# Emotion Result Retrieval and Display - Test Plan

## Overview
This test plan verifies Requirements 3.4 and 3.5 for emotion analysis result persistence and display.

**Requirements:**
- **AC-3.4**: WHEN the user reloads the page, THEN the system SHALL retrieve and display the saved emotion analysis results
- **AC-3.5**: WHEN the user navigates away and back, THEN the system SHALL display the emotion breakdown with accurate percentages

---

## Implementation Summary

### Data Flow Architecture

1. **Data Fetching** (`repository.ts`)
   - API responses automatically convert date strings to Date objects via `convertDatesToObjects()` helper
   - Emotion analysis data structure includes 8 emotions (joy, trust, fear, surprise, sadness, disgust, anger, anticipation)
   - Each emotion has a value between 0.0 and 1.0

2. **Data Retrieval** (`useDiary.ts`)
   - `useDiary(id)` hook fetches diary data via SWR
   - Cache key: `diary-${id}`
   - Configuration: `revalidateOnFocus: false`, `revalidateOnReconnect: false`
   - Returns: `{ diary, isLoading, error }`

3. **Display Component** (`DiaryEditPage.tsx`)
   - Lines 217-222: Displays emotion icon and breakdown when both `diary.iconData` and `diary.emotionAnalysis` exist
   - Lines 313-319: Shows "感情分析済み" status when analysis is complete

4. **Emotion Breakdown Component** (`EmotionBreakdown.tsx`)
   - Lines 11-17: Filters out `analyzedAt` field, sorts emotions by value (descending)
   - Line 22: Converts emotion values to percentages: `Math.round(value * 100)`
   - Lines 21-39: Displays each emotion with color dot, label, and percentage
   - Uses `EMOTION_COLORS` and `EMOTION_LABELS` from `types/emotion.ts`

5. **Cache Invalidation** (`useAnalysisPolling.ts`)
   - Lines 95-96: When analysis completes, invalidates both list and detail caches
   - Triggers re-fetch of diary data with updated emotion analysis

---

## Test Scenarios

### Test 1: Trigger Analysis and Verify Display

**Purpose**: Verify that emotion breakdown displays correctly after analysis completes

**Steps:**
1. Navigate to http://localhost:3000
2. Click "新規作成" to create a new diary
3. Enter title: "Test Emotion Analysis"
4. Enter content: "Today was a wonderful day. I felt so happy and excited about the future. Everything went perfectly and I'm grateful for all the good things happening."
5. Click "保存" button
6. Wait for page to redirect to diary detail view
7. Observe the analysis progress indicator appears (blue box with progress bar)
8. Wait approximately 5 seconds for analysis to complete

**Expected Console Logs:**
```
[DiaryEditPage] handleSave called with content: ...
[DiaryEditPage] Creating new diary with title: Test Emotion Analysis content length: ...
[useDiary] createDiary API response { diaryId: ..., contentLength: ..., createdAt: ... }
[useDiary] Invalidating cache: diary-list
[useDiary] Invalidating cache: diary-{id}
[useAnalysisPolling] Adding job: { diaryId: ..., jobId: ... }
[useAnalysisPolling] Polling job: { diaryId: ..., jobId: ..., currentStatus: SUBMITTED }
[useAnalysisPolling] Poll response: { diaryId: ..., status: IN_PROGRESS, progress: 10-90 }
... (multiple polling logs)
[useAnalysisPolling] Analysis completed for diary: {id}
```

**Expected UI:**
1. Progress indicator shows:
   - Blue spinning icon
   - Status text: "感情を分析中..."
   - Progress bar animating from 10% to 90%
   - Progress percentage display
   - Job ID and start time (e.g., "ジョブID: 12ab34cd | 開始: 14:30:45")

2. After completion, progress indicator disappears and emotion display shows:
   - Emotion icon (78x78 pixels) with colored triangles
   - Emotion breakdown list with 8 emotions
   - Each emotion shows: color dot + Japanese label + percentage
   - Emotions sorted by highest to lowest percentage
   - Date metadata shows "• 感情分析済み"

**Expected Percentages:**
- All 8 emotions displayed
- Percentages should be whole numbers (0-100)
- Sum may exceed 100% (emotions are independent, not mutually exclusive)
- Format: `{percentage}%` (e.g., "67%", "45%", "23%")

---

### Test 2: Page Reload Persistence (AC-3.4)

**Purpose**: Verify emotion results persist and display correctly after page reload

**Prerequisites**: Complete Test 1 first

**Steps:**
1. After analysis completes in Test 1, note the exact percentages for all 8 emotions
2. Press F5 or Cmd+R to reload the page
3. Wait for page to load completely

**Expected Console Logs:**
```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 0 jobs  // Job already completed, removed from storage
```

**Expected UI:**
1. Loading spinner appears briefly
2. Page loads with emotion icon and breakdown immediately visible
3. NO progress indicator appears (analysis already complete)
4. Emotion breakdown displays with EXACT same percentages as before reload
5. Date metadata shows "• 感情分析済み"

**Verification:**
- [ ] Emotion icon matches previous display
- [ ] All 8 emotions displayed
- [ ] Percentages match exactly (no re-analysis occurred)
- [ ] No polling logs appear (no active analysis jobs)
- [ ] Data loaded from SWR cache or API call

---

### Test 3: Navigation Persistence (AC-3.5)

**Purpose**: Verify emotion results persist when navigating away and returning

**Prerequisites**: Complete Test 1 first

**Steps:**
1. After analysis completes in Test 1, note the exact percentages for all 8 emotions
2. Click "新規作成" in sidebar to navigate to new diary page
3. Do NOT save the new diary
4. Click on the test diary entry in the sidebar to navigate back
5. Wait for page to load

**Expected Console Logs:**
```
// When navigating back:
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 0 jobs
```

**Expected UI:**
1. Navigation is immediate (no unsaved changes modal appears)
2. Page loads with emotion icon and breakdown immediately visible
3. NO progress indicator appears
4. Emotion breakdown displays with EXACT same percentages as before navigation
5. Date metadata shows "• 感情分析済み"

**Verification:**
- [ ] Emotion icon matches original display
- [ ] All 8 emotions displayed
- [ ] Percentages match exactly
- [ ] No polling logs appear
- [ ] Data loaded from SWR cache (faster than API call)

---

### Test 4: Multiple Page Reloads During Analysis

**Purpose**: Verify analysis continues across page reloads

**Steps:**
1. Start a new diary analysis following Test 1 steps 1-7
2. When progress indicator shows ~30-50%, press F5 to reload page
3. Wait for page to reload
4. Observe that analysis progress continues
5. Wait for analysis to complete

**Expected Console Logs:**
```
// After reload:
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Starting polling for 1 jobs
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Poll response: { diaryId: ..., status: IN_PROGRESS, progress: 50-90 }
... (continues polling)
[useAnalysisPolling] Analysis completed for diary: {id}
```

**Expected UI:**
1. After reload, progress indicator reappears
2. Progress percentage continues from where it left off (or slightly ahead)
3. Status message shows same job ID and start time as before reload
4. Progress bar continues animating to completion
5. Upon completion, emotion breakdown displays

**Verification:**
- [ ] Job persists in localStorage across reload
- [ ] Polling resumes automatically
- [ ] Same job ID maintained
- [ ] Analysis completes successfully
- [ ] Emotion results display correctly

---

### Test 5: Emotion Breakdown Component Accuracy

**Purpose**: Verify emotion breakdown calculations and display are correct

**Steps:**
1. Use Test 1 to generate emotion results
2. Open browser DevTools Console
3. Execute: `JSON.parse(localStorage.getItem('kibi_diary_entries'))[0].emotionAnalysis`
4. Note the raw emotion values (0.0-1.0 range)
5. Compare with displayed percentages in UI

**Expected Data Structure:**
```javascript
{
  joy: 0.654,          // Should display as 65%
  trust: 0.423,        // Should display as 42%
  fear: 0.187,         // Should display as 19%
  surprise: 0.289,     // Should display as 29%
  sadness: 0.156,      // Should display as 16%
  disgust: 0.098,      // Should display as 10%
  anger: 0.234,        // Should display as 23%
  anticipation: 0.567, // Should display as 57%
  analyzedAt: "2025-11-06T..." // ISO date string
}
```

**Verification:**
- [ ] Each emotion value * 100 = displayed percentage (rounded)
- [ ] All 8 emotions present in both data and UI
- [ ] Emotions sorted by highest to lowest in UI
- [ ] Color dots match emotion type (check `EMOTION_COLORS` in types/emotion.ts)
- [ ] Japanese labels correct (check `EMOTION_LABELS` in types/emotion.ts)
- [ ] `analyzedAt` field NOT displayed in UI (filtered out in component)

---

### Test 6: SWR Cache Behavior

**Purpose**: Verify SWR cache invalidation and refresh

**Steps:**
1. Complete Test 1 to create a diary with emotion analysis
2. Open browser DevTools Application tab > Local Storage
3. Clear SWR cache by removing all entries starting with `$swr$`
4. Stay on the diary detail page
5. Navigate away and back using sidebar
6. Monitor Network tab for API calls

**Expected Console Logs:**
```
// After cache cleared and navigating back:
[useDiary] Hook fetching diary from API (not cache)
```

**Expected Network Requests:**
```
GET /diary/{id} - 200 OK
Response includes emotionAnalysis and iconData
```

**Expected UI:**
1. Brief loading spinner on navigation
2. Emotion results display correctly after API response
3. Subsequent navigations use cache (no API call)

**Verification:**
- [ ] API call made when cache empty
- [ ] Emotion data received and displayed
- [ ] Subsequent loads use cache
- [ ] No duplicate analysis triggered

---

## Edge Cases

### Edge Case 1: Analysis Never Completes

**Scenario**: What if polling never returns COMPLETED status?

**Current Behavior**:
- Job remains in localStorage indefinitely
- Polling continues forever (3-second intervals)
- UI shows perpetual "分析中..." indicator

**Mitigation**: Jobs are stored per-diary, so only affects specific diary entry

---

### Edge Case 2: Missing Emotion Data

**Scenario**: Diary exists but emotionAnalysis is undefined

**Current Behavior**:
- Conditional at line 217 of DiaryEditPage: `diary?.iconData && diary?.emotionAnalysis`
- Emotion breakdown NOT displayed if either is missing
- No error shown to user
- Page functions normally otherwise

---

### Edge Case 3: Malformed Emotion Data

**Scenario**: emotionAnalysis exists but missing emotions or has invalid values

**Current Behavior**:
- EmotionBreakdown component filters and sorts available emotions
- Missing emotions simply not displayed
- Invalid values (NaN, null) may cause React errors

**Recommendation**: Backend should validate emotion data structure

---

## Success Criteria

### Requirement AC-3.4 (Page Reload)
- [x] Implementation complete
- [ ] Emotion data fetched from API after reload
- [ ] Emotion breakdown displays with correct percentages
- [ ] No re-analysis triggered
- [ ] All 8 emotions visible
- [ ] Icon matches pre-reload state

### Requirement AC-3.5 (Navigation)
- [x] Implementation complete
- [ ] Emotion data loaded from SWR cache
- [ ] Emotion breakdown displays immediately
- [ ] No re-analysis triggered
- [ ] Percentages match original values
- [ ] Icon matches original state

### Overall System
- [x] SWR cache invalidation after analysis completion
- [x] Date conversion helper processes API responses
- [x] Percentage calculation: `Math.round(value * 100)`
- [x] Emotion sorting by value (highest first)
- [x] All 8 emotions displayed with colors and labels
- [x] Console logging for debugging

---

## Files Verified

- [x] `/front/src/components/page/DiaryEditPage.tsx` - Main page component
- [x] `/front/src/repositories/diary/repository.ts` - Data fetching with date conversion
- [x] `/front/src/usecases/diary/useDiary.ts` - SWR hook for diary data
- [x] `/front/src/usecases/diary/useAnalysisPolling.ts` - Job polling and cache invalidation
- [x] `/front/src/components/model/emotion/EmotionBreakdown.tsx` - Emotion display component
- [x] `/front/src/types/emotion.ts` - Emotion type definitions, colors, and labels
- [x] `/front/src/types/diary.ts` - Diary entry type with emotion fields
- [x] `/front/src/libraries/mockApi.ts` - Mock implementation for development

---

## Notes

1. **Mock API Timing**: Analysis completes after 5 seconds in development mode
2. **Progress Updates**: Polling interval is 3 seconds (may see jumps in progress percentage)
3. **localStorage Keys**:
   - Diary entries: `kibi_diary_entries`
   - Analysis jobs: `kibi_analysis_jobs` (useAnalysisPolling)
   - Mock analysis jobs: `kibi_analysis_jobs` (mockApi)
4. **SWR Cache**: Keys follow pattern `$swr$diary-{id}$` in browser storage
5. **Emotion Values**: Always between 0.0 and 1.0 in data, displayed as 0-100%
6. **Date Handling**: All API date strings automatically converted to Date objects

---

## Manual Testing Checklist

Run all test scenarios above and verify:

- [ ] Test 1: Analysis completes and displays correctly
- [ ] Test 2: Page reload shows same results (AC-3.4)
- [ ] Test 3: Navigation preserves results (AC-3.5)
- [ ] Test 4: Analysis persists across reload
- [ ] Test 5: Percentage calculations accurate
- [ ] Test 6: SWR cache behavior correct
- [ ] Edge cases handled gracefully
- [ ] Console logs show expected flow
- [ ] No errors in browser console
- [ ] UI updates smoothly during analysis
- [ ] All 8 emotions display with correct labels
- [ ] Emotion icon renders correctly

---

## Completion

This test plan provides comprehensive verification for Task 9. The implementation successfully:

1. Retrieves emotion analysis results via `useDiary(id)` hook
2. Displays emotion breakdown with accurate percentages (0.0-1.0 → 0-100%)
3. Persists results across page reloads (AC-3.4)
4. Maintains results across navigation (AC-3.5)
5. Invalidates SWR cache after analysis completion
6. Converts API date strings to Date objects
7. Displays all 8 emotions sorted by value

**All requirements verified through code review. Manual testing required to confirm runtime behavior.**
