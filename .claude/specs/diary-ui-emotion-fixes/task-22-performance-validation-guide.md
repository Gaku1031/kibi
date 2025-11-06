# Task 22: Performance Validation Guide

**Feature:** diary-ui-emotion-fixes
**Task:** Task 22 - Performance validation
**Created:** 2025-11-06
**Status:** Ready for Execution

---

## Table of Contents

1. [Overview](#overview)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Performance Metrics Summary](#performance-metrics-summary)
4. [Browser DevTools Setup](#browser-devtools-setup)
5. [Test Procedures](#test-procedures)
6. [Performance Test Execution Template](#performance-test-execution-template)
7. [Success Criteria Checklist](#success-criteria-checklist)
8. [Edge Case Testing](#edge-case-testing)
9. [Performance Optimization Recommendations](#performance-optimization-recommendations)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

### Purpose
Validate that the diary application meets all performance requirements specified in NFR-1 (Non-Functional Requirement 1), ensuring:
- Fast diary save operations
- Efficient polling intervals
- Rapid page load with cached data
- Responsive UI during background operations

### Scope
This performance validation covers:
1. **Diary Save Performance**: POST /diary and PUT /diary/:id endpoints
2. **Polling Efficiency**: Analysis status check requests
3. **Page Load Performance**: Initial render with cached data
4. **UI Responsiveness**: Non-blocking background operations

### Test Duration
Approximately **20-30 minutes** for complete validation

---

## Non-Functional Requirements

### NFR-1: Performance

#### NFR-1.1: Diary Save Operation
- **Requirement**: The system SHALL complete diary save operations within 2 seconds under normal network conditions
- **Measurement Point**: Time from user clicking "Save" button to diary appearing in sidebar
- **Success Threshold**: <= 2000ms (2 seconds)

#### NFR-1.2: Polling Interval
- **Requirement**: Polling intervals SHALL be set to 3 seconds to balance responsiveness and API request costs
- **Measurement Point**: Time between consecutive polling requests
- **Success Threshold**: Exactly 3000ms ± 50ms tolerance

#### NFR-1.3: Page Load Performance
- **Requirement**: Initial page load SHALL display cached diary data within 500ms
- **Measurement Point**: Time from page navigation to diary content visible in editor
- **Success Threshold**: <= 500ms for cached data

#### NFR-1.4: UI Responsiveness
- **Requirement**: Emotion analysis status checks SHALL NOT block UI interactions or cause perceived lag
- **Measurement Point**: UI remains interactive during background polling
- **Success Threshold**: No frame drops, animations remain smooth (60fps)

---

## Performance Metrics Summary

| Metric | Requirement | Target | Measurement Method |
|--------|-------------|--------|-------------------|
| Diary Save (Create) | <= 2 seconds | < 1500ms | Network tab timing |
| Diary Save (Update) | <= 2 seconds | < 1500ms | Network tab timing |
| Polling Interval | Exactly 3 seconds | 3000ms ± 50ms | Console timestamps |
| Page Load (Cached) | <= 500ms | < 300ms | Performance tab |
| Page Load (Fresh) | N/A (informational) | < 2000ms | Performance tab |
| UI Frame Rate | No blocking | >= 58fps | Performance monitoring |
| Concurrent Requests | No burst | Max 1 poll/3s | Network waterfall |

---

## Browser DevTools Setup

### 1. Open Developer Tools

**Chrome/Edge:**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

**Firefox:**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

**Safari:**
- Enable Developer Menu: `Safari > Preferences > Advanced > Show Develop menu`
- Press `Cmd+Option+I`

### 2. Configure Network Tab

1. Navigate to **Network** tab
2. Enable settings:
   - ✅ Preserve log (persist across page navigations)
   - ✅ Disable cache (for accurate testing)
   - ✅ Show timestamps (absolute or relative)
3. Set throttling:
   - For normal conditions: **"No throttling"** or **"Fast 3G"** (optional)
   - For edge cases: **"Slow 3G"** or custom profile

### 3. Configure Console Tab

1. Navigate to **Console** tab
2. Enable settings:
   - ✅ Preserve log
   - ✅ Show timestamps (select from Console settings)
3. Clear console before each test: `Clear console` button or `Cmd+K`

### 4. Configure Performance Tab

1. Navigate to **Performance** tab
2. Enable settings:
   - ✅ Screenshots (optional, useful for visual debugging)
   - ✅ Memory (optional, for memory leak detection)
3. Have recording controls ready: `Record` button

### 5. Configure Application Tab (Chrome/Edge)

1. Navigate to **Application** tab
2. Expand **Local Storage** > `http://localhost:3000`
3. Keep this view open to monitor `kibi_analysis_jobs` updates

---

## Test Procedures

### Test 1: Diary Save Performance (Create)

#### Objective
Verify that creating a new diary completes within 2 seconds.

#### Prerequisites
- Frontend and backend servers running
- Network tab open and cleared
- Console tab open with timestamps enabled

#### Steps

1. **Navigate to New Diary Page**
   ```
   http://localhost:3000/diary/new
   ```

2. **Prepare Test Content**
   ```
   Title: パフォーマンステスト

   Content:
   今日はパフォーマンステストを実施しています。
   システムが2秒以内に日記を保存できることを確認します。
   このテキストは十分な長さがあり、実際の使用状況を模擬しています。
   ```

3. **Start Network Monitoring**
   - Clear Network tab: Click "Clear" button
   - Note current time or start stopwatch

4. **Save Diary**
   - Click "Save" button (保存 button)
   - Watch Network tab for POST request

5. **Measure Timing**
   - In Network tab, find: `POST http://localhost:8080/diary`
   - Record the **Time** column value (or **Duration**)
   - Record the **Waiting (TTFB)** value
   - Record the **Content Download** value

6. **Verify Cache Invalidation**
   - Check console logs:
   ```
   [useDiary] createDiary API response { diaryId: "...", ... }
   [useDiary] Invalidating cache: diary-list
   [useDiary] Invalidating cache: diary-...
   ```

7. **Verify UI Update**
   - Measure time from button click to sidebar update
   - Check that new diary appears in sidebar immediately

#### Recording Data

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| API Request Time (TTFB) | ______ ms | ☐ |
| Content Download Time | ______ ms | ☐ |
| Total Request Duration | ______ ms | ☐ |
| Button Click to Sidebar Update | ______ ms | ☐ |
| Overall Save Operation | ______ ms | **☐ Pass (< 2000ms)** |

#### Console Log Verification

Expected logs (in order):
```
[BlockNote] Content changed: ...
[DiaryEditPage] Editor content received, length: ...
[DiaryEditPage] handleSave called with content: ...
[DiaryEditPage] Creating new diary with title: パフォーマンステスト
[useDiary] createDiary called { contentLength: ..., hasDate: true }
[useDiary] createDiary API response { diaryId: "...", contentLength: ..., createdAt: "..." }
[useDiary] Invalidating cache: diary-list
[useDiary] Invalidating cache: diary-...
```

#### Success Criteria
- ✅ Total save operation completes in <= 2000ms
- ✅ API request completes in < 1500ms
- ✅ Sidebar updates immediately after API response
- ✅ No errors in console

---

### Test 2: Diary Save Performance (Update)

#### Objective
Verify that updating an existing diary completes within 2 seconds.

#### Prerequisites
- Existing diary entry loaded in editor
- Network tab open and cleared
- Console tab open with timestamps enabled

#### Steps

1. **Navigate to Existing Diary**
   - Click any diary from sidebar
   - Wait for content to load
   ```
   http://localhost:3000/diary/[existing-id]
   ```

2. **Modify Content**
   - Add new paragraph:
   ```
   追加のテキスト: パフォーマンス更新テスト
   ```

3. **Start Network Monitoring**
   - Clear Network tab
   - Note current time or start stopwatch

4. **Save Changes**
   - Click "Save" button
   - Watch Network tab for PUT request

5. **Measure Timing**
   - In Network tab, find: `PUT http://localhost:8080/diary/[id]`
   - Record the **Time** column value
   - Record the **Waiting (TTFB)** value
   - Record the **Content Download** value

6. **Verify Cache Update**
   - Check console logs:
   ```
   [useDiary] updateDiary API response { diaryId: "...", success: true, ... }
   [useDiary] Invalidating cache: diary-list
   [useDiary] Invalidating cache: diary-...
   ```

#### Recording Data

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| API Request Time (TTFB) | ______ ms | ☐ |
| Content Download Time | ______ ms | ☐ |
| Total Request Duration | ______ ms | ☐ |
| Button Click to UI Confirmation | ______ ms | ☐ |
| Overall Update Operation | ______ ms | **☐ Pass (< 2000ms)** |

#### Success Criteria
- ✅ Update operation completes in <= 2000ms
- ✅ API request completes in < 1500ms
- ✅ Updated content is immediately visible
- ✅ No errors in console

---

### Test 3: Polling Interval Verification

#### Objective
Verify that polling happens exactly every 3 seconds (not more frequently).

#### Prerequisites
- Frontend and backend servers running
- Console tab open with timestamps enabled
- Network tab open and cleared

#### Steps

1. **Start Emotion Analysis**
   - Open any diary with content
   - Click "Analyze Emotion" button (感情分析 button)
   - Wait for analysis to start

2. **Monitor Console Logs**
   - Watch for polling logs:
   ```
   [useAnalysisPolling] Polling interval triggered, checking 1 jobs
   [useAnalysisPolling] Polling job: { diaryId: "...", jobId: "...", currentStatus: "..." }
   ```

3. **Record Polling Timestamps**
   - Use console timestamps to measure interval between polls
   - Alternative: Use Network tab to measure time between status check requests

4. **Calculate Intervals**
   - Record at least 5 consecutive polling intervals
   - Calculate average interval
   - Note any deviations from 3000ms

#### Recording Data

| Poll # | Timestamp (ms) | Interval from Previous (ms) | Pass/Fail |
|--------|----------------|----------------------------|-----------|
| Poll 1 | __________ | N/A | N/A |
| Poll 2 | __________ | __________ | ☐ (2950-3050ms) |
| Poll 3 | __________ | __________ | ☐ (2950-3050ms) |
| Poll 4 | __________ | __________ | ☐ (2950-3050ms) |
| Poll 5 | __________ | __________ | ☐ (2950-3050ms) |
| Poll 6 | __________ | __________ | ☐ (2950-3050ms) |

**Average Interval:** __________ ms

#### Network Tab Verification

1. Filter Network tab: Enter `analyze/status` in filter box
2. Observe GET requests:
   ```
   GET http://localhost:8080/diary/[id]/analyze/status/[jobId]
   ```
3. Check **Waterfall** column - requests should be evenly spaced (3s apart)

#### Success Criteria
- ✅ Average polling interval is 3000ms ± 50ms
- ✅ No burst requests (multiple polls in same second)
- ✅ Polling continues until job completes or fails
- ✅ Polling stops when no active jobs exist

---

### Test 4: Page Load Performance (Cached Data)

#### Objective
Verify that page load displays cached diary data within 500ms.

#### Prerequisites
- Diary entry previously loaded (cached by SWR)
- Performance tab ready for recording
- Network throttling: "No throttling"

#### Steps

1. **Prepare Recording**
   - Open diary detail page: `http://localhost:3000/diary/[id]`
   - Wait for content to load (to populate cache)
   - Navigate away to another page (e.g., timeline)

2. **Clear Performance Recording**
   - Open Performance tab
   - Click "Clear" button

3. **Start Performance Recording**
   - Click "Record" button (red circle)
   - Or: Click "Reload page and record" (↻ icon)

4. **Navigate Back to Diary**
   - Click diary from sidebar
   - Or: Navigate directly to `http://localhost:3000/diary/[id]`

5. **Stop Recording**
   - Wait 2-3 seconds after page fully loads
   - Click "Stop" button

6. **Analyze Performance Timeline**
   - Find **First Contentful Paint (FCP)** marker
   - Find **Largest Contentful Paint (LCP)** marker
   - Find custom marker: "Diary Content Rendered" (if implemented)

7. **Measure Time to Content Visible**
   - Use Performance timeline to measure:
     - Time from navigation start to first paint
     - Time from navigation start to diary content visible in editor
   - Record values

#### Recording Data (Cached Load)

| Measurement | Value | Target | Pass/Fail |
|-------------|-------|--------|-----------|
| Navigation Start | 0 ms | N/A | N/A |
| First Contentful Paint (FCP) | ______ ms | < 500ms | ☐ |
| Largest Contentful Paint (LCP) | ______ ms | < 500ms | ☐ |
| Diary Content Visible | ______ ms | < 500ms | **☐ Pass** |
| DOM Content Loaded | ______ ms | < 1000ms | ☐ |
| Page Fully Loaded | ______ ms | < 2000ms | ☐ |

#### Alternative: Console Timing Method

Add timing logs (if not already present):
```typescript
// In DiaryEditPage.tsx or page.tsx
useEffect(() => {
  if (diary) {
    console.time('Diary Content Render');
    // Content rendered
    console.timeEnd('Diary Content Render');
  }
}, [diary]);
```

Check console for timing:
```
Diary Content Render: 156ms
```

#### Success Criteria
- ✅ Cached diary content visible in <= 500ms
- ✅ No network request for diary data (served from cache)
- ✅ Editor renders immediately with cached content
- ✅ No loading spinner visible (instant render)

---

### Test 5: Page Load Performance (Fresh Load)

#### Objective
Measure page load performance without cache (informational, no strict requirement).

#### Prerequisites
- Cache cleared (localStorage and SWR cache)
- Performance tab ready for recording
- Network throttling: "No throttling"

#### Steps

1. **Clear All Caches**
   - Console: `localStorage.clear()`
   - Network tab: Enable "Disable cache" checkbox
   - Hard refresh: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)

2. **Start Performance Recording**
   - Click "Reload page and record" button

3. **Navigate to Diary**
   - Go to: `http://localhost:3000/diary/[id]`
   - Wait for complete load

4. **Stop Recording**
   - Wait 2-3 seconds after page fully loads
   - Click "Stop" button

5. **Analyze Performance Timeline**
   - Measure time to diary content visible
   - Note network requests in timeline
   - Check for render-blocking resources

#### Recording Data (Fresh Load)

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| First Contentful Paint (FCP) | ______ ms | ☐ (< 1000ms) |
| Largest Contentful Paint (LCP) | ______ ms | ☐ (< 2000ms) |
| Diary Content Visible | ______ ms | ☐ (< 2000ms) |
| DOM Content Loaded | ______ ms | ☐ (< 2000ms) |
| Page Fully Loaded | ______ ms | ☐ (< 3000ms) |
| Network Requests (Count) | ______ | ☐ (< 20) |

#### Success Criteria (Informational)
- ✅ Fresh load completes in < 3 seconds
- ✅ Diary data fetched successfully
- ✅ No excessive network requests
- ✅ No render-blocking resources

---

### Test 6: UI Responsiveness During Analysis

#### Objective
Verify that UI remains responsive during background emotion analysis polling.

#### Prerequisites
- Emotion analysis in progress (polling active)
- Performance tab ready for recording
- Console tab open

#### Steps

1. **Start Emotion Analysis**
   - Open any diary with content
   - Click "Analyze Emotion" button
   - Wait for polling to begin (check console logs)

2. **Start Performance Recording**
   - Open Performance tab
   - Click "Record" button
   - Record for 10-15 seconds (capture multiple polls)

3. **Interact with UI**
   - While recording, perform these interactions:
     - Scroll the page
     - Click on different diary entries in sidebar
     - Type in the editor
     - Hover over tooltips
     - Open/close modals (if available)

4. **Stop Recording**
   - Click "Stop" button
   - Analyze timeline

5. **Analyze Frame Rate**
   - Look for **FPS graph** in Performance timeline
   - Identify any frame drops (red bars)
   - Check if polling causes frame drops

6. **Check Main Thread Activity**
   - Examine **Main** thread in timeline
   - Polling should be minimal (async operations)
   - No long tasks (> 50ms) caused by polling

#### Recording Data

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| Average FPS | ______ fps | ☐ (>= 58fps) |
| Frame Drops During Polling | ______ drops | ☐ (< 5 drops) |
| Long Tasks (> 50ms) | ______ tasks | ☐ (< 3 tasks) |
| Polling Request Duration | ______ ms avg | ☐ (< 100ms) |
| UI Responsiveness | Smooth / Laggy | **☐ Pass (Smooth)** |

#### Visual Inspection Checklist

- ☐ Scrolling is smooth (no jank)
- ☐ Sidebar navigation is instant
- ☐ Typing in editor has no delay
- ☐ Progress bar animation is smooth
- ☐ Tooltip appears instantly on hover
- ☐ No loading spinners block interactions
- ☐ Page remains interactive at all times

#### Success Criteria
- ✅ Average FPS >= 58fps during polling
- ✅ No long tasks (> 50ms) caused by polling
- ✅ UI interactions remain smooth and instant
- ✅ No perceived lag or jank
- ✅ Polling runs in background without blocking

---

## Performance Test Execution Template

### Test Session Information

**Date:** __________
**Tester:** __________
**Environment:**
- Browser: __________ (version: ______)
- OS: __________
- Network: __________ (throttling: ______)
- Backend: Running ☐ / Not Running ☐
- Frontend: Running ☐ / Not Running ☐

---

### Test Results Summary

| Test | Requirement | Result | Status |
|------|-------------|--------|--------|
| 1. Diary Save (Create) | <= 2000ms | ______ ms | ☐ Pass / ☐ Fail |
| 2. Diary Save (Update) | <= 2000ms | ______ ms | ☐ Pass / ☐ Fail |
| 3. Polling Interval | 3000ms ± 50ms | ______ ms avg | ☐ Pass / ☐ Fail |
| 4. Page Load (Cached) | <= 500ms | ______ ms | ☐ Pass / ☐ Fail |
| 5. Page Load (Fresh) | Informational | ______ ms | ☐ Pass / ☐ Fail |
| 6. UI Responsiveness | No blocking | ______ fps | ☐ Pass / ☐ Fail |

**Overall Status:** ☐ All Pass / ☐ Some Failures

---

### Detailed Test Results

#### Test 1: Diary Save Performance (Create)

**Timestamp:** __________

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| API Request Time (TTFB) | ______ ms | ☐ |
| Content Download Time | ______ ms | ☐ |
| Total Request Duration | ______ ms | ☐ |
| Button Click to Sidebar Update | ______ ms | ☐ |
| Overall Save Operation | ______ ms | **☐ Pass (< 2000ms)** |

**Console Logs:**
```
[Paste relevant console logs here]
```

**Network Request Details:**
- URL: `POST http://localhost:8080/diary`
- Status: ______
- Size: ______ KB
- Time: ______ ms

**Notes:**
```
[Any observations, issues, or comments]
```

---

#### Test 2: Diary Save Performance (Update)

**Timestamp:** __________

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| API Request Time (TTFB) | ______ ms | ☐ |
| Content Download Time | ______ ms | ☐ |
| Total Request Duration | ______ ms | ☐ |
| Button Click to UI Confirmation | ______ ms | ☐ |
| Overall Update Operation | ______ ms | **☐ Pass (< 2000ms)** |

**Console Logs:**
```
[Paste relevant console logs here]
```

**Network Request Details:**
- URL: `PUT http://localhost:8080/diary/[id]`
- Status: ______
- Size: ______ KB
- Time: ______ ms

**Notes:**
```
[Any observations, issues, or comments]
```

---

#### Test 3: Polling Interval Verification

**Timestamp:** __________

| Poll # | Timestamp | Interval (ms) | Pass/Fail |
|--------|-----------|---------------|-----------|
| Poll 1 | __________ | N/A | N/A |
| Poll 2 | __________ | __________ | ☐ |
| Poll 3 | __________ | __________ | ☐ |
| Poll 4 | __________ | __________ | ☐ |
| Poll 5 | __________ | __________ | ☐ |
| Poll 6 | __________ | __________ | ☐ |

**Average Interval:** __________ ms
**Standard Deviation:** __________ ms
**Min Interval:** __________ ms
**Max Interval:** __________ ms

**Console Logs:**
```
[Paste polling logs with timestamps]
```

**Network Waterfall:**
```
[Describe spacing of requests in Network tab]
```

**Notes:**
```
[Any observations, issues, or comments]
```

---

#### Test 4: Page Load Performance (Cached)

**Timestamp:** __________

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| First Contentful Paint (FCP) | ______ ms | ☐ |
| Largest Contentful Paint (LCP) | ______ ms | ☐ |
| Diary Content Visible | ______ ms | **☐ Pass (< 500ms)** |
| DOM Content Loaded | ______ ms | ☐ |
| Page Fully Loaded | ______ ms | ☐ |

**Console Logs:**
```
[Paste timing logs]
```

**Performance Timeline Screenshot:**
```
[Attach or describe Performance tab timeline]
```

**Notes:**
```
[Any observations, issues, or comments]
```

---

#### Test 5: Page Load Performance (Fresh)

**Timestamp:** __________

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| First Contentful Paint (FCP) | ______ ms | ☐ |
| Largest Contentful Paint (LCP) | ______ ms | ☐ |
| Diary Content Visible | ______ ms | ☐ |
| DOM Content Loaded | ______ ms | ☐ |
| Page Fully Loaded | ______ ms | ☐ |
| Network Requests (Count) | ______ | ☐ |

**Network Requests:**
- Diary API: ______ ms
- Assets (JS/CSS): ______ ms
- Images: ______ ms
- Total: ______ ms

**Notes:**
```
[Any observations, issues, or comments]
```

---

#### Test 6: UI Responsiveness During Analysis

**Timestamp:** __________

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| Average FPS | ______ fps | ☐ |
| Frame Drops During Polling | ______ drops | ☐ |
| Long Tasks (> 50ms) | ______ tasks | ☐ |
| Polling Request Duration | ______ ms avg | ☐ |
| UI Responsiveness | Smooth / Laggy | **☐ Pass** |

**Visual Inspection:**
- ☐ Scrolling is smooth
- ☐ Sidebar navigation is instant
- ☐ Typing has no delay
- ☐ Progress bar is smooth
- ☐ Tooltips appear instantly
- ☐ No blocking spinners
- ☐ Page remains interactive

**Performance Timeline Screenshot:**
```
[Attach or describe FPS graph and Main thread activity]
```

**Notes:**
```
[Any observations, issues, or comments]
```

---

### Issues and Observations

**Issues Found:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Performance Bottlenecks:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Optimization Opportunities:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

### Recommendations

**Immediate Actions:**
- [ ] _______________________________________________
- [ ] _______________________________________________

**Future Improvements:**
- [ ] _______________________________________________
- [ ] _______________________________________________

---

## Success Criteria Checklist

### NFR-1.1: Diary Save Operation
- ☐ **Create diary completes in <= 2000ms**
- ☐ **Update diary completes in <= 2000ms**
- ☐ API requests complete in < 1500ms
- ☐ Sidebar updates immediately
- ☐ No errors during save

### NFR-1.2: Polling Interval
- ☐ **Polling interval is 3000ms ± 50ms**
- ☐ Average interval within tolerance
- ☐ No burst requests
- ☐ Polling stops when no jobs

### NFR-1.3: Page Load Performance
- ☐ **Cached data displays in <= 500ms**
- ☐ No network request for cached data
- ☐ Editor renders immediately
- ☐ No loading spinner for cached load

### NFR-1.4: UI Responsiveness
- ☐ **UI remains responsive during polling**
- ☐ Average FPS >= 58fps
- ☐ No long tasks from polling
- ☐ Smooth scrolling and interactions
- ☐ No perceived lag

### Overall Requirements
- ☐ All critical thresholds met
- ☐ No performance regressions
- ☐ Acceptable performance on typical hardware
- ☐ No console errors or warnings

---

## Edge Case Testing

### Edge Case 1: Slow Network Conditions

#### Setup
- Network tab: Set throttling to **"Slow 3G"**
- Clear cache and localStorage

#### Test Procedure
1. Perform Test 1 (Diary Save - Create)
2. Perform Test 3 (Polling Interval)
3. Record results

#### Expected Behavior
- Save operation MAY exceed 2 seconds (acceptable on slow network)
- Polling interval remains 3 seconds (client-side, unaffected by network)
- UI remains responsive (non-blocking operations)

#### Recording Data

| Measurement | Fast Network | Slow 3G | Notes |
|-------------|--------------|---------|-------|
| Diary Save | ______ ms | ______ ms | Should increase |
| Polling Interval | ______ ms | ______ ms | Should remain ~3000ms |
| UI Responsiveness | ______ fps | ______ fps | Should remain >58fps |

#### Success Criteria
- ✅ Polling interval unaffected by network speed
- ✅ UI remains responsive despite slow save
- ✅ User gets appropriate feedback (loading indicators)

---

### Edge Case 2: Concurrent Operations

#### Setup
- Multiple diaries open in different tabs
- Multiple analyses running simultaneously

#### Test Procedure
1. Open 3 diary tabs
2. Start emotion analysis on all 3 diaries
3. Observe polling behavior in console
4. Record number of polling requests

#### Expected Behavior
- Each diary polls independently
- Polling requests are staggered (not synchronized)
- Total polling frequency <= 1 request per second (across all tabs)

#### Recording Data

| Time Window | Tab 1 Polls | Tab 2 Polls | Tab 3 Polls | Total Polls |
|-------------|-------------|-------------|-------------|-------------|
| 0-3s | ______ | ______ | ______ | ______ |
| 3-6s | ______ | ______ | ______ | ______ |
| 6-9s | ______ | ______ | ______ | ______ |
| 9-12s | ______ | ______ | ______ | ______ |

#### Success Criteria
- ✅ Each tab polls at 3-second intervals
- ✅ No excessive polling (> 5 requests in 3 seconds)
- ✅ All analyses complete successfully
- ✅ UI remains responsive across all tabs

---

### Edge Case 3: Page Navigation During Save

#### Setup
- Diary edit page open
- Network tab monitoring

#### Test Procedure
1. Start typing in diary editor
2. Click "Save" button
3. Immediately navigate away (click another diary in sidebar)
4. Check if save completed

#### Expected Behavior
- Save request is sent before navigation
- Navigation does not cancel in-flight request
- New diary appears in sidebar after navigation

#### Recording Data

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| Save request sent | Yes / No | ☐ |
| Request completed | Yes / No | ☐ |
| New diary in sidebar | Yes / No | ☐ |
| Console errors | Yes / No | ☐ |

#### Success Criteria
- ✅ Save request completes despite navigation
- ✅ Diary appears in sidebar after navigation
- ✅ No console errors or warnings

---

### Edge Case 4: Cache Invalidation Timing

#### Setup
- Diary detail page open
- SWR cache populated

#### Test Procedure
1. Load diary: `http://localhost:3000/diary/[id]`
2. In another tab, update the same diary via API (or database)
3. Navigate away and back to diary
4. Measure cache revalidation time

#### Expected Behavior
- Cached data displayed immediately (< 500ms)
- Fresh data fetched in background
- UI updates when fresh data arrives

#### Recording Data

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| Initial cached render | ______ ms | ☐ (< 500ms) |
| Background revalidation | ______ ms | ☐ |
| UI update with fresh data | ______ ms | ☐ |

#### Success Criteria
- ✅ Cached data displays in < 500ms
- ✅ Fresh data fetched automatically
- ✅ UI updates smoothly with fresh data

---

### Edge Case 5: Polling with Page in Background

#### Setup
- Emotion analysis in progress
- Browser tab sent to background (inactive tab)

#### Test Procedure
1. Start emotion analysis
2. Switch to another browser tab (make diary tab inactive)
3. Wait 1-2 minutes
4. Switch back to diary tab
5. Check if polling continued

#### Expected Behavior
- Polling MAY be throttled by browser (expected browser behavior)
- Polling resumes immediately when tab becomes active
- Analysis status updates correctly

#### Recording Data

| Measurement | Value | Notes |
|-------------|-------|-------|
| Polls while in background | ______ | Browser may throttle |
| Polls after tab active | ______ | Should resume normal rate |
| Analysis status updated | Yes / No | Should reflect current status |

#### Success Criteria
- ✅ Polling resumes when tab becomes active
- ✅ Analysis status is up-to-date
- ✅ No errors from missed polls

---

## Performance Optimization Recommendations

### Optimization 1: API Response Compression

**Current State:**
- API responses are JSON (uncompressed)
- Large diary content may cause slow transfers

**Recommendation:**
- Enable gzip/brotli compression on backend
- Add `Content-Encoding: gzip` header
- Expected improvement: 50-70% reduction in transfer size

**Implementation:**
```typescript
// backend/src/index.ts or server.ts
import compression from 'compression';
app.use(compression());
```

**Expected Impact:**
- Diary save time: -200ms to -500ms
- Page load time: -100ms to -300ms

---

### Optimization 2: SWR Cache Configuration

**Current State:**
- SWR uses default cache settings
- Revalidation may cause unnecessary requests

**Recommendation:**
- Optimize SWR revalidation strategy
- Increase `dedupingInterval` for diary data
- Disable `revalidateOnFocus` for diary content (already done)

**Implementation:**
```typescript
// front/src/repositories/diary/repository.ts
const { data, error } = useSWR(key, fetcher, {
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  revalidateOnFocus: false, // Already implemented
  revalidateOnReconnect: false, // Already implemented
  revalidateIfStale: false, // Don't revalidate if cached data exists
});
```

**Expected Impact:**
- Reduce unnecessary API requests by 30-50%
- Faster perceived load time (always serve from cache first)

---

### Optimization 3: Polling Optimization

**Current State:**
- Polling runs every 3 seconds for all active jobs
- Each job polls independently

**Recommendation:**
- Batch polling requests for multiple jobs
- Use single API endpoint: `GET /diary/analyze/status?jobIds=id1,id2,id3`
- Reduce network overhead

**Implementation:**
```typescript
// backend/src/routes/diary.ts
router.get('/analyze/status', async (req, res) => {
  const jobIds = req.query.jobIds?.split(',') || [];
  const results = await Promise.all(
    jobIds.map(id => checkJobStatus(id))
  );
  res.json(results);
});
```

**Expected Impact:**
- Reduce number of polling requests by 50-80% (when multiple jobs active)
- Lower API costs and backend load

---

### Optimization 4: Code Splitting and Lazy Loading

**Current State:**
- BlockNote editor is dynamically imported (SSR-safe)
- Other components may be eagerly loaded

**Recommendation:**
- Lazy load EmotionAnalysisDisplay component
- Lazy load EmotionBreakdown component
- Use React.lazy() and Suspense

**Implementation:**
```typescript
// front/src/components/page/DiaryEditPage.tsx
const EmotionAnalysisDisplay = lazy(() =>
  import('../model/emotion/EmotionAnalysisDisplay')
);

// In render:
<Suspense fallback={<div>Loading...</div>}>
  {diary?.emotionAnalysis && (
    <EmotionAnalysisDisplay analysis={diary.emotionAnalysis} />
  )}
</Suspense>
```

**Expected Impact:**
- Initial page load: -200ms to -500ms
- Smaller initial bundle size: -50KB to -100KB

---

### Optimization 5: Emotion Icon Caching

**Current State:**
- Emotion icons are generated on-the-fly
- SVG rendering happens every time component mounts

**Recommendation:**
- Cache generated SVG strings in component state
- Memoize icon generation with useMemo

**Implementation:**
```typescript
// front/src/components/model/emotion/EmotionIcon.tsx
const svgString = useMemo(() => {
  if (!iconData) return null;
  return renderEmotionIconToSVG(iconData, size);
}, [iconData, size]);
```

**Expected Impact:**
- Reduce icon render time by 80-90%
- Smoother scrolling in diary list

---

### Optimization 6: LocalStorage Optimization

**Current State:**
- Analysis jobs saved to localStorage on every update
- JSON.stringify/parse on every state change

**Recommendation:**
- Debounce localStorage writes
- Only save when jobs actually change (not on every render)

**Implementation:**
```typescript
// front/src/usecases/diary/useAnalysisPolling.ts
import { debounce } from 'lodash'; // or custom debounce

const debouncedSave = useMemo(
  () => debounce(saveJobsToStorage, 500),
  []
);

useEffect(() => {
  debouncedSave(jobs);
}, [jobs]);
```

**Expected Impact:**
- Reduce localStorage writes by 90%
- Smoother UI during polling

---

## Troubleshooting Guide

### Issue 1: Diary Save Exceeds 2 Seconds

**Symptoms:**
- Save button takes > 2 seconds to complete
- Long wait time before sidebar updates

**Diagnosis:**
1. Check Network tab: Find bottleneck (TTFB vs download)
2. Check backend logs: Look for slow database operations
3. Check content size: Large content may cause slow serialization

**Solutions:**

**If TTFB is high (> 1 second):**
- Backend is slow processing request
- Check database query performance
- Check AWS API calls (S3, DynamoDB)
- Add backend logging to identify bottleneck

**If download time is high:**
- Response is too large
- Enable compression (see Optimization 1)
- Reduce response payload size

**If content serialization is slow:**
- BlockNote JSON is too large
- Consider storing content in S3 instead of inline JSON
- Compress content before sending to backend

---

### Issue 2: Polling Interval Incorrect

**Symptoms:**
- Polls happen more frequently than 3 seconds
- Polls happen less frequently than 3 seconds

**Diagnosis:**
1. Check console timestamps for actual intervals
2. Check if multiple polling hooks are mounted
3. Check for interval cleanup issues

**Solutions:**

**If polls are too frequent (< 3 seconds):**
```typescript
// Verify POLLING_INTERVAL constant
const POLLING_INTERVAL = 3000; // Should be 3000, not 300 or 30000
```

**If multiple intervals are running:**
```typescript
// Ensure cleanup in useEffect
useEffect(() => {
  const interval = setInterval(() => { ... }, POLLING_INTERVAL);
  return () => clearInterval(interval); // ← Must cleanup
}, [jobs, pollJob]);
```

**If polls are too infrequent:**
- Check browser throttling (inactive tabs)
- Check for errors preventing polling
- Verify jobs array is not empty

---

### Issue 3: Cached Data Not Displaying Quickly

**Symptoms:**
- Page load with cached data takes > 500ms
- Loading spinner always visible

**Diagnosis:**
1. Check if SWR cache is working (Network tab should show no request)
2. Check if data is actually cached (Application tab > Cache Storage)
3. Check for render blocking (Performance tab)

**Solutions:**

**If SWR cache is not working:**
```typescript
// Verify SWR configuration
useSWR(key, fetcher, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  fallbackData: cachedData, // Provide fallback
});
```

**If cache is cleared unexpectedly:**
- Check for manual cache invalidation calls
- Check for localStorage.clear() calls
- Verify cache key is consistent

**If render is slow despite cached data:**
- Profile with Performance tab
- Look for expensive computations in render
- Memoize heavy components with React.memo

---

### Issue 4: UI Lag During Polling

**Symptoms:**
- UI feels sluggish when analysis is running
- Typing has delay
- Scrolling is janky

**Diagnosis:**
1. Record Performance profile during polling
2. Look for long tasks (> 50ms) in Main thread
3. Check for synchronous operations in polling logic

**Solutions:**

**If polling logic is synchronous:**
```typescript
// Ensure all operations are async
const pollJob = useCallback(async (job: AnalysisJob) => {
  await diaryRepository.checkAnalysisStatus(...); // ← async/await
}, []);
```

**If state updates are causing re-renders:**
```typescript
// Batch state updates
setJobs(prev => {
  // Calculate new state
  const newJobs = prev.map(...);
  return newJobs;
}); // React will batch this update
```

**If component is re-rendering unnecessarily:**
```typescript
// Memoize expensive components
const MemoizedComponent = React.memo(Component, (prev, next) => {
  // Custom comparison
  return prev.data === next.data;
});
```

---

### Issue 5: Network Requests Not Visible in DevTools

**Symptoms:**
- Network tab shows no requests
- Or requests are not captured

**Diagnosis:**
1. Check if "Preserve log" is enabled
2. Check if correct filter is applied
3. Check if backend is actually running

**Solutions:**

**Enable Preserve Log:**
- Network tab > Check "Preserve log" checkbox

**Clear Filters:**
- Network tab > Clear filter input
- Or filter by domain: `localhost:8080`

**Verify Backend is Running:**
```bash
curl http://localhost:8080/diary
# Should return JSON response
```

---

## Appendix: Performance Monitoring Tools

### Chrome DevTools

**Network Tab:**
- Timing breakdown: TTFB, content download, total
- Waterfall view: Visual request timeline
- Request headers and payload inspection

**Performance Tab:**
- FPS graph: Frame rate monitoring
- Main thread activity: Long tasks, scripting, rendering
- Network timeline: Integrated with CPU activity
- Screenshots: Visual progression of page load

**Console Tab:**
- Timestamps: Precise timing for log messages
- console.time()/timeEnd(): Custom performance measurements
- Performance marks: Mark specific points in code

**Application Tab:**
- Local Storage: View cached data
- Cache Storage: Service worker caches
- Cookies: Session data

### Firefox Developer Tools

**Network Monitor:**
- Similar to Chrome Network tab
- Request blocking: Test offline scenarios

**Performance Tool:**
- Similar to Chrome Performance tab
- Memory tracking: Identify memory leaks
- Waterfall view: Request timing

### Safari Web Inspector

**Timelines Tab:**
- Combines Network and Performance views
- JavaScript & Events timeline
- Layout & Rendering timeline

**Storage Tab:**
- Local Storage and Session Storage inspection

### Lighthouse (Built into Chrome DevTools)

**Audit Tool:**
- Overall performance score
- Metrics: FCP, LCP, TTI, TBT, CLS
- Suggestions for improvement

**Running Lighthouse:**
1. Open DevTools > Lighthouse tab
2. Select "Performance" category
3. Click "Analyze page load"
4. Review report and recommendations

### Third-Party Tools

**WebPageTest.org:**
- Comprehensive performance testing
- Multiple locations and devices
- Filmstrip view and video recording

**Google Analytics (Real User Monitoring):**
- Track real-world performance metrics
- Core Web Vitals reporting
- User demographics and devices

---

## Conclusion

This performance validation guide provides comprehensive procedures to verify that the diary application meets all performance requirements specified in NFR-1. By following these test procedures and using the provided templates, you can systematically validate:

1. Diary save operations complete within 2 seconds
2. Polling happens exactly every 3 seconds
3. Cached data displays within 500ms
4. UI remains responsive during background operations

Use the Success Criteria Checklist to ensure all requirements are met, and refer to the Troubleshooting Guide if any issues are encountered.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Related Tasks:** Task 20, Task 21
**Requirements:** NFR-1 (Performance)
