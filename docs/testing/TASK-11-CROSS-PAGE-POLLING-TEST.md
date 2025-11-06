# Task 11: Cross-Page Polling Continuation - Manual Test Plan

## Overview
This test plan verifies that emotion analysis polling continues seamlessly across page navigations, ensuring users receive analysis results even when they navigate away from the original diary page.

## System Architecture Review

### Polling Implementation
- **Hook**: `useAnalysisPolling` - runs on both `/list` (DiaryListPage) and `/diary/[id]` (DiaryEditPage)
- **Storage**: localStorage key `kibi_analysis_jobs` persists job state across pages
- **Polling Interval**: 3 seconds (3000ms)
- **Cache Updates**: Uses SWR's `mutate()` to update both diary list and individual diary caches
- **Automatic Cleanup**: Completed and failed jobs are automatically removed from queue

### Key Features
1. **Global Polling**: Hook runs on multiple pages simultaneously
2. **Job Persistence**: Jobs persist in localStorage across navigation and browser sessions
3. **Progress Tracking**: Real-time status updates (SUBMITTED → IN_PROGRESS → COMPLETED/FAILED)
4. **Cache Synchronization**: Automatic SWR cache updates when analysis completes

## Requirements Validation

### AC-4.1: Continue processing during navigation
- System SHALL continue polling when user navigates to another page
- Verified by: Console logs showing polling continues after navigation

### AC-4.3: Display updated status on return
- System SHALL show current analysis status when returning to diary page
- Verified by: Progress bar/status matches last polled state

### AC-4.4: Display results immediately if completed while away
- System SHALL show completed results without additional wait
- Verified by: Analysis results appear instantly upon return

## Test Prerequisites

### Environment Setup
1. Development environment running (`npm run dev`)
2. Browser DevTools open to Console tab
3. Multiple diaries created (at least 2-3 for comprehensive testing)
4. Understanding of console log format (see "Console Log Reference" below)

### Console Log Reference
Key log messages to monitor:

```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: N jobs
[useAnalysisPolling] Adding job: {diaryId, jobId}
[useAnalysisPolling] Starting polling for N jobs
[useAnalysisPolling] Polling interval triggered, checking N jobs
[useAnalysisPolling] Polling job: {diaryId, jobId, currentStatus}
[useAnalysisPolling] Poll response: {diaryId, status, progress}
[useAnalysisPolling] Updating job status: {diaryId, newStatus, newProgress}
[useAnalysisPolling] Analysis completed for diary: {diaryId}
[useAnalysisPolling] Analysis failed for diary: {diaryId}
[useAnalysisPolling] Removing job for diary: {diaryId}
[useAnalysisPolling] Saved jobs to localStorage: N jobs [...]
```

## Test Scenarios

### Test 1: Basic Cross-Page Polling Continuation

#### Objective
Verify polling continues when navigating between diary edit and list pages.

#### Steps
1. **Start Analysis**
   - Navigate to `/diary/[id]` for a diary
   - Click "感情を分析する" button
   - Verify UI shows analysis in progress (progress bar visible)
   - Note the console logs:
     ```
     [useAnalysisPolling] Adding job: {diaryId: "xxx", jobId: "yyy"}
     [useAnalysisPolling] Starting polling for 1 jobs
     ```

2. **Navigate to List Page**
   - Click "一覧" in sidebar OR navigate to `/list`
   - **CRITICAL**: Do not close console or refresh browser
   - Observe console continues showing polling logs every 3 seconds:
     ```
     [useAnalysisPolling] Polling interval triggered, checking 1 jobs
     [useAnalysisPolling] Polling job: {diaryId, status: "IN_PROGRESS"}
     [useAnalysisPolling] Poll response: {status: "IN_PROGRESS", progress: 50}
     ```

3. **Wait for Completion**
   - Continue observing console logs
   - After 5-15 seconds, you should see:
     ```
     [useAnalysisPolling] Poll response: {status: "COMPLETED", ...}
     [useAnalysisPolling] Analysis completed for diary: xxx
     [useAnalysisPolling] Removing job for diary: xxx
     ```

4. **Return to Original Diary**
   - Navigate back to `/diary/[id]`
   - **Expected Results**:
     - Analysis results displayed immediately (emotion icon, analysis text)
     - NO progress bar visible
     - NO additional polling for this diary

#### Success Criteria
- [ ] Polling logs continue appearing while on list page
- [ ] Completion detected while on different page
- [ ] Results visible immediately upon return
- [ ] No duplicate polling after completion

---

### Test 2: Navigate to Different Diary During Analysis

#### Objective
Verify polling continues when navigating to a different diary page.

#### Steps
1. **Start Analysis on Diary A**
   - Navigate to `/diary/{diary-a-id}`
   - Click "感情を分析する"
   - Verify polling starts

2. **Navigate to Diary B**
   - Click different diary in sidebar
   - Navigate to `/diary/{diary-b-id}`
   - Observe console logs continue for Diary A

3. **Wait for Completion**
   - Watch console logs while viewing Diary B
   - Verify Diary A analysis completes in background

4. **Return to Diary A**
   - Navigate back to `/diary/{diary-a-id}`
   - Verify results displayed immediately

#### Success Criteria
- [ ] Polling continues for Diary A while viewing Diary B
- [ ] No interference between different diary pages
- [ ] Results appear on return to Diary A

---

### Test 3: Navigate to Timeline During Analysis

#### Objective
Verify polling works with Timeline page (which doesn't use the polling hook).

#### Steps
1. **Start Analysis**
   - Navigate to a diary and start analysis
   - Verify polling begins

2. **Navigate to Timeline**
   - Click "時系列表示" in sidebar OR navigate to `/timeline`
   - **NOTE**: Timeline page does NOT call `useAnalysisPolling()`
   - Observe console logs **STOP** appearing

3. **Navigate Back to List**
   - Navigate to `/list`
   - **CRITICAL**: Observe polling RESUMES:
     ```
     [useAnalysisPolling] Hook mounted, loading jobs from localStorage
     [useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
     [useAnalysisPolling] Starting polling for 1 jobs
     ```

4. **Verify Completion**
   - Wait for analysis to complete
   - Verify job removed from queue

#### Success Criteria
- [ ] Polling stops on Timeline page (expected behavior)
- [ ] Polling resumes when returning to List page
- [ ] Jobs persist in localStorage across Timeline visit
- [ ] Analysis completes successfully

#### Important Notes
- Timeline page polling pause is expected - job persists in localStorage
- Polling resumes automatically when visiting List or Edit pages
- This is acceptable as analysis continues on backend

---

### Test 4: Multiple Simultaneous Analyses

#### Objective
Verify system handles multiple concurrent analysis jobs across page navigations.

#### Steps
1. **Start Multiple Analyses**
   - Navigate to Diary A, start analysis (Job 1)
   - Navigate to Diary B, start analysis (Job 2)
   - Optionally start Job 3 on Diary C
   - Verify console shows:
     ```
     [useAnalysisPolling] Starting polling for 3 jobs
     ```

2. **Navigate to List Page**
   - Go to `/list`
   - Observe polling for ALL jobs:
     ```
     [useAnalysisPolling] Polling interval triggered, checking 3 jobs
     [useAnalysisPolling] Polling job: {diaryId: "A", ...}
     [useAnalysisPolling] Polling job: {diaryId: "B", ...}
     [useAnalysisPolling] Polling job: {diaryId: "C", ...}
     ```

3. **Watch Completions**
   - Jobs will complete at different times
   - Verify each completion removes only that job:
     ```
     [useAnalysisPolling] Analysis completed for diary: A
     [useAnalysisPolling] Saved jobs to localStorage: 2 jobs
     ```

4. **Verify Results**
   - Navigate to each diary
   - Verify all results displayed correctly

#### Success Criteria
- [ ] All jobs poll simultaneously
- [ ] Each completion handled independently
- [ ] localStorage updated correctly after each completion
- [ ] All results visible in their respective diaries

---

### Test 5: Browser Tab/Window Management

#### Objective
Verify polling behavior with multiple tabs/windows (edge case).

#### Steps
1. **Open Two Browser Tabs**
   - Tab 1: Navigate to `/list`
   - Tab 2: Navigate to a diary, start analysis

2. **Observe Both Tabs**
   - Both tabs will poll the same job
   - This is expected behavior (localStorage shared)
   - Console logs will appear in both tabs

3. **Complete Analysis**
   - Watch for completion in both tabs
   - Verify both tabs remove the job

#### Success Criteria
- [ ] Both tabs poll the same job (no conflicts)
- [ ] Both tabs detect completion
- [ ] No race conditions or errors

#### Important Notes
- Multiple tabs polling same job is safe (backend handles idempotency)
- Both tabs will call `mutate()` but SWR handles deduplication
- This is acceptable behavior, not a bug

---

### Test 6: Page Navigation Stress Test

#### Objective
Verify polling robustness with rapid page navigation.

#### Steps
1. **Start Analysis**
   - Navigate to a diary and start analysis

2. **Rapid Navigation Sequence**
   - Navigate rapidly through:
     - List → Timeline → List → Diary → List → Timeline → Diary
   - Complete sequence within 5-10 seconds

3. **Return to Stable Page**
   - Stay on `/list` page
   - Observe polling continues normally

4. **Wait for Completion**
   - Verify analysis completes successfully
   - Check no errors in console

#### Success Criteria
- [ ] No errors during rapid navigation
- [ ] Polling resumes correctly
- [ ] Job state preserved in localStorage
- [ ] Analysis completes successfully

---

## Edge Cases & Troubleshooting

### Edge Case 1: localStorage Full or Disabled

**Scenario**: localStorage quota exceeded or disabled

**Expected Behavior**:
- Console errors: `[useAnalysisPolling] Failed to save jobs to storage`
- Polling continues in current session (in-memory state)
- Jobs lost on page refresh

**Verification**:
1. Open DevTools → Application → Storage
2. Disable localStorage
3. Start analysis
4. Observe warnings but functionality continues

### Edge Case 2: Network Errors During Polling

**Scenario**: API becomes unavailable mid-polling

**Expected Behavior**:
- Console errors: `[useAnalysisPolling] Failed to poll analysis status`
- Job remains in queue (not removed)
- Polling continues retrying

**Verification**:
1. Start analysis
2. Stop backend server
3. Observe error logs but polling continues
4. Restart server
5. Verify polling recovers automatically

### Edge Case 3: Job Completed But Not Detected

**Scenario**: Backend completes job but polling missed it

**Expected Behavior**:
- Polling continues until detected
- Status endpoint returns COMPLETED
- Job removed and cache updated

**Troubleshooting**:
1. Check console for completion log
2. Check localStorage: `localStorage.getItem('kibi_analysis_jobs')`
3. Manually refresh page to force re-polling
4. Verify backend status endpoint returns COMPLETED

### Edge Case 4: Orphaned Jobs in localStorage

**Scenario**: Jobs in localStorage but no longer on backend

**Expected Behavior**:
- Polling gets 404 or job not found
- Job should be removed (implementation may vary)

**Manual Cleanup**:
```javascript
// In browser console
localStorage.removeItem('kibi_analysis_jobs');
```

### Edge Case 5: Analysis Started on Mobile, Continued on Desktop

**Scenario**: User starts analysis on one device, continues on another

**Expected Behavior**:
- Each device maintains independent job queue
- Backend ensures analysis runs only once
- Both devices poll same job (safe)

**Note**: This is current behavior - cross-device sync would require backend implementation

---

## Verification Checklist

### Before Testing
- [ ] Development server running
- [ ] Browser DevTools Console open and visible
- [ ] Multiple test diaries available
- [ ] Understanding of expected console log patterns

### During Testing
- [ ] Monitor console logs continuously
- [ ] Note timestamps of navigation events
- [ ] Observe polling interval (every 3 seconds)
- [ ] Watch for status changes (SUBMITTED → IN_PROGRESS → COMPLETED)
- [ ] Verify localStorage updates (optional: check Application tab)

### After Each Test
- [ ] Verify analysis results displayed correctly
- [ ] Check no errors in console
- [ ] Confirm jobs removed from localStorage
- [ ] Verify SWR cache updated (results appear immediately)

### Overall System Verification
- [ ] AC-4.1: Polling continues during navigation
- [ ] AC-4.3: Status displayed on return
- [ ] AC-4.4: Results displayed immediately if completed while away
- [ ] No memory leaks (polling stops when no jobs)
- [ ] No duplicate requests (efficient polling)
- [ ] No stale data (cache updates properly)

---

## Test Data & Timing Expectations

### Analysis Duration
- Mock API: 10-20 seconds (simulated)
- Real API: Variable based on diary length and backend processing

### Polling Frequency
- Interval: 3 seconds
- Expected polls for 15-second analysis: ~5 polls

### Status Progression
1. **SUBMITTED** (0-3 seconds): Initial state, progress ~10%
2. **IN_PROGRESS** (3-12 seconds): Processing, progress 10-90%
3. **COMPLETED** (12-15 seconds): Done, results available

---

## Success Indicators

### Visual Indicators
- ✅ Progress bar animates smoothly
- ✅ Emotion icon appears after completion
- ✅ Analysis text displays
- ✅ "感情を分析する" button disabled during analysis
- ✅ No flickering or UI jumps

### Console Log Indicators
- ✅ Polling logs appear every 3 seconds
- ✅ Status updates log correctly
- ✅ Completion logged before job removal
- ✅ localStorage save logs after each state change
- ✅ No error messages

### Functional Indicators
- ✅ Analysis completes successfully
- ✅ Results persist after page refresh
- ✅ No duplicate analyses triggered
- ✅ Other diaries unaffected
- ✅ Navigation remains smooth

---

## Reporting Issues

If tests fail, collect the following information:

1. **Console Logs**
   - Full console output from start to failure
   - Timestamp of issue
   - Any error messages or warnings

2. **Network Activity**
   - DevTools → Network tab
   - Filter by `/analyze/status/`
   - Check response status codes and payloads

3. **localStorage State**
   - DevTools → Application → Local Storage
   - Value of `kibi_analysis_jobs`
   - Screenshot or copy value

4. **Steps to Reproduce**
   - Exact navigation sequence
   - Timing of actions
   - Browser and version
   - Any unusual conditions

5. **Expected vs Actual Behavior**
   - What should have happened
   - What actually happened
   - Screenshots if applicable

---

## Test Execution Log Template

Use this template to record test execution:

```
Date: _______________
Tester: _______________
Environment: Development / Staging / Production
Browser: _______________

Test 1: Basic Cross-Page Polling Continuation
Status: PASS / FAIL
Notes: _______________________________________________

Test 2: Navigate to Different Diary During Analysis
Status: PASS / FAIL
Notes: _______________________________________________

Test 3: Navigate to Timeline During Analysis
Status: PASS / FAIL
Notes: _______________________________________________

Test 4: Multiple Simultaneous Analyses
Status: PASS / FAIL
Notes: _______________________________________________

Test 5: Browser Tab/Window Management
Status: PASS / FAIL
Notes: _______________________________________________

Test 6: Page Navigation Stress Test
Status: PASS / FAIL
Notes: _______________________________________________

Overall Result: PASS / FAIL
Issues Found: _______________________________________________
Recommendations: _______________________________________________
```

---

## Additional Notes

### Performance Considerations
- Polling is lightweight (single API call per job every 3 seconds)
- No performance impact on navigation
- localStorage writes are fast (<1ms)

### User Experience Implications
- Users can freely navigate while analysis runs
- No blocking or waiting required
- Results appear "magically" when returning

### Future Enhancements (Out of Scope)
- WebSocket for real-time updates (eliminate polling)
- Service Worker for background polling when tab inactive
- Cross-device synchronization via backend
- Push notifications for analysis completion

---

## Conclusion

This test plan comprehensively validates cross-page polling continuation functionality. Successful execution of all test scenarios confirms that:

1. Analysis jobs persist across page navigations
2. Polling continues seamlessly in the background
3. Results are immediately available upon return
4. System handles edge cases gracefully
5. User experience is smooth and intuitive

The implementation leverages existing infrastructure (localStorage, SWR, useAnalysisPolling hook) to provide a robust, user-friendly experience without requiring users to wait on a single page for analysis completion.
