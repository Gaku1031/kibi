# Task 6: Cross-Page Analysis Status Persistence - Testing Guide

## Overview
This document provides comprehensive testing instructions to verify that emotion analysis status persists correctly across page navigations using localStorage with the key `kibi_analysis_jobs`.

## Implementation Verification

### Key Implementation Points Verified

1. **localStorage Storage Key**: `kibi_analysis_jobs` (line 11 in useAnalysisPolling.ts)
2. **Job Loading on Mount**: Lines 50-54 - loads jobs from localStorage when hook mounts
3. **Job Saving on Update**: Lines 57-59 - saves jobs to localStorage whenever the jobs array changes
4. **Job Status Types**: SUBMITTED, IN_PROGRESS, COMPLETED, FAILED (as per AnalysisJob type)
5. **Date Serialization**: startedAt dates are properly serialized/deserialized (lines 21-28)

### Comprehensive Logging Added

The implementation now includes detailed console logging for all major operations:
- Job loading from localStorage
- Job saving to localStorage
- Job addition
- Job removal
- Polling activity
- Status updates

All logs are prefixed with `[useAnalysisPolling]` for easy filtering.

## Testing Instructions

### Prerequisites
1. Open the browser's Developer Console (F12 or Cmd+Option+I)
2. Keep the Console tab open during all tests
3. Optionally, filter console logs by typing `useAnalysisPolling` in the filter box

### Test 1: Basic Analysis Start and Persistence

**Steps:**
1. Create a new diary entry with some content
2. Click "Save" button
3. **Observe Console Logs:**
   - `[useAnalysisPolling] Adding job:` with diaryId and jobId
   - `[useAnalysisPolling] Job added:` with job details
   - `[useAnalysisPolling] Saved jobs to localStorage:` with 1 job
   - `[useAnalysisPolling] Starting polling for 1 jobs`

4. **Verify UI:**
   - Blue progress indicator appears with "Analyzing emotions..." message
   - Progress bar shows animation
   - Job ID and start time displayed

5. **Verify localStorage:**
   - Open Application/Storage tab in DevTools
   - Navigate to localStorage
   - Find key `kibi_analysis_jobs`
   - Verify it contains an array with your job

**Expected Console Pattern:**
```
[useAnalysisPolling] Adding job: {diaryId: "...", jobId: "..."}
[useAnalysisPolling] Job added: {diaryId: "...", jobId: "...", status: "SUBMITTED", progress: 10}
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [{diaryId: "...", status: "SUBMITTED", progress: 10}]
[useAnalysisPolling] Starting polling for 1 jobs
[useAnalysisPolling] Polling interval triggered, checking 1 jobs
[useAnalysisPolling] Polling job: {diaryId: "...", jobId: "...", currentStatus: "SUBMITTED"}
```

### Test 2: Cross-Page Navigation Persistence

**Steps:**
1. With analysis in progress (from Test 1), note the diary ID
2. Click on another page in the sidebar OR navigate to home page
3. **Observe Console Logs:**
   - `[useAnalysisPolling] Hook mounted, loading jobs from localStorage`
   - `[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs`
   - `[useAnalysisPolling] Starting polling for 1 jobs`

4. Navigate back to the diary page with the active analysis
5. **Verify UI:**
   - Analysis status indicator is still displayed
   - Progress bar continues from where it was
   - Job details (ID, start time) are preserved

6. **Observe Console Logs:**
   - Same mounting and loading pattern as step 3
   - Polling continues: `[useAnalysisPolling] Polling job:` messages every 3 seconds

**Expected Console Pattern (on page load):**
```
[useAnalysisPolling] Hook mounted, loading jobs from localStorage
[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [...]
[useAnalysisPolling] Starting polling for 1 jobs
```

### Test 3: Status Updates During Navigation

**Steps:**
1. Start a new analysis
2. Wait for status to update to "IN_PROGRESS" (watch console logs)
3. **Observe Console Logs:**
   - `[useAnalysisPolling] Poll response:` with status: "IN_PROGRESS"
   - `[useAnalysisPolling] Updating job status:` with newStatus and newProgress
   - `[useAnalysisPolling] Saved jobs to localStorage:` with updated status

4. Navigate to a different page WHILE status is IN_PROGRESS
5. Wait 5-10 seconds
6. Navigate back to the diary page
7. **Verify:**
   - Status still shows as IN_PROGRESS
   - Progress value has been preserved or increased
   - Polling continues automatically

**Expected Console Pattern (status update):**
```
[useAnalysisPolling] Polling job: {diaryId: "...", currentStatus: "SUBMITTED", ...}
[useAnalysisPolling] Poll response: {diaryId: "...", status: "IN_PROGRESS", progress: 45}
[useAnalysisPolling] Updating job status: {diaryId: "...", newStatus: "IN_PROGRESS", newProgress: 45}
[useAnalysisPolling] Saved jobs to localStorage: 1 jobs [{diaryId: "...", status: "IN_PROGRESS", progress: 45}]
```

### Test 4: Analysis Completion Across Pages

**Steps:**
1. Start a new analysis
2. Navigate away from the diary page before completion
3. Keep the console open and wait for analysis to complete
4. **Observe Console Logs:**
   - `[useAnalysisPolling] Poll response:` with status: "COMPLETED"
   - `[useAnalysisPolling] Analysis completed for diary:` [diaryId]
   - `[useAnalysisPolling] Removing job for diary:` [diaryId]
   - `[useAnalysisPolling] Saved jobs to localStorage: 0 jobs`

5. Navigate back to the diary page
6. **Verify UI:**
   - Analysis indicator is gone
   - Emotion icon is displayed
   - Emotion breakdown is visible

**Expected Console Pattern (completion):**
```
[useAnalysisPolling] Poll response: {diaryId: "...", status: "COMPLETED", ...}
[useAnalysisPolling] Analysis completed for diary: ...
[useAnalysisPolling] Removing job for diary: ...
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
```

### Test 5: Multiple Concurrent Jobs

**Steps:**
1. Create and save diary entry #1 (starts analysis)
2. Immediately create and save diary entry #2 (starts second analysis)
3. **Observe Console Logs:**
   - Two separate "Adding job" messages
   - `[useAnalysisPolling] Saved jobs to localStorage: 2 jobs`
   - `[useAnalysisPolling] Starting polling for 2 jobs`

4. Navigate to home page or another diary
5. **Verify:**
   - Both analysis jobs are saved to localStorage
   - Both show analysis indicators in the UI (if on diary list page)

6. Navigate back and forth between pages
7. **Verify:**
   - Both jobs persist
   - Both continue polling
   - As each completes, it's removed from localStorage

**Expected Console Pattern:**
```
[useAnalysisPolling] Adding job: {diaryId: "1", ...}
[useAnalysisPolling] Adding job: {diaryId: "2", ...}
[useAnalysisPolling] Saved jobs to localStorage: 2 jobs [...]
[useAnalysisPolling] Starting polling for 2 jobs
[useAnalysisPolling] Polling interval triggered, checking 2 jobs
```

### Test 6: Browser Refresh (Hard Navigation)

**Steps:**
1. Start an analysis
2. Wait for status to show IN_PROGRESS
3. Perform a hard refresh (Cmd+R or Ctrl+R)
4. **Observe Console Logs:**
   - After page loads: `[useAnalysisPolling] Hook mounted, loading jobs from localStorage`
   - `[useAnalysisPolling] Loaded jobs from localStorage: 1 jobs`

5. **Verify:**
   - Analysis status persists through refresh
   - Polling resumes automatically
   - Progress continues from where it was

### Test 7: localStorage Inspection

**Manual Verification:**
1. While analysis is running, open DevTools > Application/Storage tab
2. Navigate to localStorage > your domain
3. Find key `kibi_analysis_jobs`
4. Click to view the value
5. **Verify Structure:**
   ```json
   [
     {
       "diaryId": "...",
       "jobId": "...",
       "startedAt": "2025-11-06T...",
       "status": "IN_PROGRESS",
       "progress": 45
     }
   ]
   ```

6. While on a different page, verify the value persists
7. When analysis completes, verify the array becomes empty: `[]`

## Expected Behaviors Summary

### AC-2.2: Navigation Persistence
- **PASS**: Analysis status indicator persists when navigating to different pages
- **PASS**: Status is restored from localStorage on page mount
- **PASS**: Polling continues automatically across pages
- **PASS**: Job state (status, progress) is preserved

### AC-2.3: Completion Display
- **PASS**: When analysis completes, emotion icon appears
- **PASS**: Emotion breakdown is displayed
- **PASS**: Completed jobs are removed from localStorage
- **PASS**: Analysis indicator disappears after completion

## Troubleshooting

### If Jobs Don't Persist:
1. Check if localStorage is enabled in browser
2. Verify no browser extensions are blocking localStorage
3. Check console for error messages: `Failed to save jobs to storage`
4. Verify the STORAGE_KEY constant is correctly set to `kibi_analysis_jobs`

### If Polling Doesn't Resume:
1. Check console logs for "Hook mounted" message
2. Verify jobs were loaded: "Loaded jobs from localStorage: X jobs"
3. Ensure polling interval starts: "Starting polling for X jobs"
4. Check for any polling errors in console

### If Status Updates Don't Save:
1. Look for "Saved jobs to localStorage" after each update
2. Verify the jobs array changes trigger the save effect (line 57-59)
3. Check if status updates are being received: "Poll response"

## Console Log Quick Reference

| Log Message | Meaning |
|-------------|---------|
| `Hook mounted, loading jobs from localStorage` | useAnalysisPolling hook initialized |
| `Loaded jobs from localStorage: X jobs` | Successfully loaded X jobs |
| `No jobs found in localStorage` | localStorage is empty or key doesn't exist |
| `Adding job:` | New analysis job being added |
| `Job added:` | Job successfully added to state |
| `Saved jobs to localStorage: X jobs` | Jobs saved to localStorage |
| `Starting polling for X jobs` | Polling interval started |
| `Polling interval triggered` | Polling cycle executing (every 3 seconds) |
| `Polling job:` | Checking status for specific job |
| `Poll response:` | Received status update from API |
| `Updating job status:` | Updating job with new status/progress |
| `Analysis completed for diary:` | Analysis finished successfully |
| `Analysis failed for diary:` | Analysis failed |
| `Removing job for diary:` | Job being removed from state |
| `No jobs to poll` | No active jobs, polling stopped |

## Success Criteria

Task 6 is complete when:

1. All 7 tests pass successfully
2. Console logs show expected patterns for:
   - Job loading on mount
   - Job saving on updates
   - Status persistence across navigation
3. localStorage key `kibi_analysis_jobs` is properly used
4. Jobs persist through page navigation and browser refresh
5. Analysis status displays correctly after navigation
6. Completed jobs are removed from localStorage
7. Multiple concurrent jobs are handled correctly

## Files Modified

- `/front/src/usecases/diary/useAnalysisPolling.ts` - Enhanced with comprehensive logging

## Related Requirements

- **AC-2.2**: Navigation persistence
- **AC-2.3**: Completion display
- **Technical Detail**: localStorage key `kibi_analysis_jobs`
- **Technical Detail**: Job statuses (SUBMITTED, IN_PROGRESS, COMPLETED, FAILED)
