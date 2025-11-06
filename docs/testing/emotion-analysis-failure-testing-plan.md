# Emotion Analysis Failure Scenario Testing Plan

## Overview
This document provides comprehensive testing instructions for verifying the emotion analysis failure handling in the Kibi diary application. It covers both backend and frontend error scenarios to ensure failures are communicated clearly to users and system state is properly managed.

## Current Implementation Summary

### Backend Error Handling (`/backend/src/routes/diary.ts`)

#### Analysis Status Endpoint (Line 276-376)
The `GET /:id/analyze/status/:jobId` endpoint handles the following scenarios:

1. **COMPLETED Status**: Fetches results from S3, saves to DynamoDB, generates icon, returns full diary data
2. **IN_PROGRESS/SUBMITTED Status**: Returns status and progress percentage
3. **FAILED Status**: Returns status with progress = 0
4. **Errors**: Catches and logs errors, returns 500 status

**Key Observation**: The backend properly returns FAILED status from AWS Comprehend but does NOT provide error details or specific error messages to the frontend.

### Frontend Error Handling

#### Polling Hook (`/front/src/usecases/diary/useAnalysisPolling.ts`)

**FAILED Status Handling (Lines 101-106)**:
```typescript
if (statusResponse.status === 'FAILED') {
  // 分析失敗 - ジョブを削除
  console.error('[useAnalysisPolling] Analysis failed for diary:', job.diaryId);
  removeJob(job.diaryId);
  return;
}
```

**Behavior**:
- Detects FAILED status from backend
- Logs error to console
- Removes job from localStorage (via `removeJob`)
- Does NOT notify user via UI

#### UI Component (`/front/src/components/page/DiaryEditPage.tsx`)

**Status Display (Lines 50-79)**:
```typescript
const getAnalysisStatusMessage = () => {
  if (!analysisJob) return null;

  let statusText = "";
  switch (analysisJob.status) {
    case "FAILED":
      statusText = "分析に失敗しました";
      break;
    // ... other cases
  }
  // ...
}
```

**Behavior**:
- Has logic to display "分析に失敗しました" (Analysis failed) message
- Status message would be shown in the blue status box (lines 224-256)
- **CRITICAL GAP**: The FAILED status is removed from localStorage before the UI can display it, so users never see the error message

### Comprehend Service (`/backend/src/services/comprehend.ts`)

**Job Status Check (Lines 73-109)**:
```typescript
async checkJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
  const status = result.DocumentClassificationJobProperties?.JobStatus || 'UNKNOWN';

  switch (status) {
    case 'FAILED':
    case 'STOP_REQUESTED':
    case 'STOPPED':
      progress = 0;
      break;
    // ...
  }

  return { status, progress };
}
```

**Behavior**:
- Fetches job status from AWS Comprehend
- Returns FAILED status with progress = 0
- Does NOT extract or return error message from AWS

## Testing Scenarios

### Scenario 1: Backend FAILED Status Detection

**Purpose**: Verify backend properly detects and returns FAILED status from AWS Comprehend

**Steps**:
1. Start the backend server: `cd backend && npm run dev`
2. Create a diary entry via the UI
3. Trigger emotion analysis
4. Note the `jobId` from browser console logs
5. Use AWS CLI to check job status:
   ```bash
   aws comprehend describe-document-classification-job \
     --job-id <jobId> \
     --region ap-northeast-1
   ```
6. If job status is not FAILED, manually stop it:
   ```bash
   aws comprehend stop-document-classification-job \
     --job-id <jobId> \
     --region ap-northeast-1
   ```
7. Wait for polling to detect the failure
8. Check backend logs for error message

**Expected Behavior**:
- Backend should log: `[Analyze Status] Job status checked` with `status: FAILED`
- Backend should return JSON: `{ "status": "FAILED", "progress": 0 }`
- No 500 error should occur

**Verification**:
```bash
# Check backend logs
tail -f backend/logs/*.log | grep FAILED

# Or check console output for:
[Analyze Status] Job not completed, returning status { status: 'FAILED' }
```

### Scenario 2: Frontend Polling Detects FAILED Status

**Purpose**: Verify frontend polling hook properly handles FAILED status

**Steps**:
1. Open browser DevTools Console
2. Enable verbose logging (check all log levels)
3. Follow Scenario 1 to create a failed job
4. Watch console for polling logs
5. Check localStorage after failure detected

**Expected Console Output**:
```
[useAnalysisPolling] Polling job: { diaryId: "xxx", jobId: "yyy", currentStatus: "IN_PROGRESS" }
[useAnalysisPolling] Poll response: { diaryId: "xxx", status: "FAILED", progress: 0 }
[useAnalysisPolling] Analysis failed for diary: xxx
[useAnalysisPolling] Removing job for diary: xxx
[useAnalysisPolling] Saved jobs to localStorage: 0 jobs []
```

**Expected Behavior**:
- Console should show error log
- Job should be removed from polling queue
- No further polling for that diary

**Verification**:
1. Open DevTools → Application → Local Storage
2. Check `kibi_analysis_jobs` key
3. Should be empty array `[]` or not contain the failed job

### Scenario 3: Manual localStorage Testing

**Purpose**: Test UI display of FAILED status before automatic cleanup

**Steps**:
1. Create a diary and start analysis
2. Open DevTools → Application → Local Storage
3. Find the `kibi_analysis_jobs` key
4. Manually edit the JSON to set status to FAILED:
   ```json
   [
     {
       "diaryId": "your-diary-id",
       "jobId": "your-job-id",
       "startedAt": "2025-11-06T10:00:00.000Z",
       "status": "FAILED",
       "progress": 0
     }
   ]
   ```
5. Refresh the page
6. Navigate to the diary edit page
7. Observe the UI for ~3 seconds (before next poll removes it)

**Expected Behavior**:
- UI should briefly show status message: "分析に失敗しました" (Analysis failed)
- Message should appear in blue status box (though may need styling update for errors)
- After 3 seconds (next poll), status box should disappear as job is removed

**Current Issue**:
- The FAILED status is removed too quickly for users to see
- No persistent error notification

### Scenario 4: Simulate AWS Service Errors

**Purpose**: Test backend error handling for AWS service failures

**Test Cases**:

#### 4a. Invalid Job ID
```bash
curl -X GET "http://localhost:8080/diary/test-diary-id/analyze/status/invalid-job-id"
```

**Expected**: 500 error with message "Failed to check analysis status"

#### 4b. Network Error Simulation
1. Stop AWS credentials access temporarily:
   ```bash
   export AWS_ACCESS_KEY_ID="invalid"
   export AWS_SECRET_ACCESS_KEY="invalid"
   ```
2. Restart backend
3. Try to check job status
4. Restore credentials

**Expected**: Backend should catch AWS SDK errors and return 500

#### 4c. S3 Access Error (Result Retrieval)
- Mark a job as COMPLETED in Comprehend but delete its output from S3
- Poll the status endpoint
- Backend should fail to fetch results

**Expected**: Error logged, 500 status returned

### Scenario 5: Complete Failure Flow End-to-End

**Purpose**: Verify complete failure flow from job submission to UI cleanup

**Steps**:
1. Start backend and frontend
2. Open browser DevTools (Console + Network tabs)
3. Create a new diary entry
4. Save with some content
5. Note the diary ID from the URL
6. Immediately use AWS CLI to monitor the job:
   ```bash
   # Get the job ID from console logs, then:
   aws comprehend stop-document-classification-job \
     --job-id <jobId> \
     --region ap-northeast-1
   ```
7. Wait for polling to detect the stopped job (becomes FAILED)
8. Monitor console logs and UI

**Expected Flow**:
1. Frontend: Job added to localStorage
2. Frontend: Polling starts every 3 seconds
3. Backend: Status changes SUBMITTED → IN_PROGRESS → STOPPED/FAILED
4. Frontend: Detects FAILED status
5. Frontend: Logs error to console
6. Frontend: Removes job from localStorage
7. UI: Status box disappears

**Verification Checklist**:
- [ ] Console shows all expected log messages
- [ ] localStorage is cleaned up (no failed job remains)
- [ ] Network tab shows status polling requests
- [ ] Backend logs show FAILED status returned
- [ ] No application crashes or unhandled errors
- [ ] User can continue using the app normally

## Identified Gaps and Issues

### 1. No User-Visible Error Messages
**Issue**: Failed jobs are removed from localStorage before users can see the error.

**Impact**: Users don't know analysis failed - they may wait indefinitely or assume it succeeded.

**Severity**: HIGH - Violates AC-2.5

**Recommendation**:
- Add a toast/notification system
- Show persistent error message in UI
- Don't remove FAILED jobs immediately - keep for X minutes or until user dismisses

### 2. Generic Error Messages
**Issue**: Backend doesn't extract or return specific error details from AWS Comprehend.

**Impact**: Users and developers can't diagnose why analysis failed.

**Severity**: MEDIUM

**Recommendation**:
- Extract error message from AWS Comprehend's `DocumentClassificationJobProperties.Message`
- Return error details in status response
- Display specific error message to users

### 3. No Error Logging to Persistent Storage
**Issue**: Errors are only logged to console, not persisted.

**Impact**: Can't debug issues after the fact. Violates NFR-2 logging requirement.

**Severity**: MEDIUM

**Recommendation**:
- Add CloudWatch Logs integration
- Log failed jobs to DynamoDB with error details
- Create admin dashboard to view failed jobs

### 4. No Retry Mechanism
**Issue**: Transient failures (network errors, throttling) are not retried.

**Impact**: Failures that could succeed on retry are permanently lost.

**Severity**: LOW - Nice to have

**Recommendation**:
- Implement exponential backoff retry for transient errors
- Distinguish between permanent failures (bad input) and transient failures (network)

### 5. Race Condition in Status Display
**Issue**: FAILED status is removed before UI can render it.

**Impact**: Users never see the "分析に失敗しました" message.

**Severity**: HIGH

**Recommendation**:
- Delay removal of FAILED jobs by 5-10 seconds
- Or keep failed jobs in localStorage with a `dismissed` flag
- Or use a separate state for error notifications

## Quick Test Script

Save this as `/backend/test-failure-scenarios.sh`:

```bash
#!/bin/bash

# Test Failure Scenarios for Emotion Analysis
# Usage: ./test-failure-scenarios.sh <diary-id> <job-id>

DIARY_ID=$1
JOB_ID=$2
BASE_URL="http://localhost:8080"

if [ -z "$DIARY_ID" ] || [ -z "$JOB_ID" ]; then
  echo "Usage: $0 <diary-id> <job-id>"
  exit 1
fi

echo "Testing failure scenarios for diary: $DIARY_ID, job: $JOB_ID"
echo ""

# Test 1: Check current job status
echo "=== Test 1: Current Job Status ==="
curl -s "$BASE_URL/diary/$DIARY_ID/analyze/status/$JOB_ID" | jq .
echo ""

# Test 2: Stop the job (force failure)
echo "=== Test 2: Stopping Job (Simulating Failure) ==="
aws comprehend stop-document-classification-job \
  --job-id "$JOB_ID" \
  --region ap-northeast-1 2>&1
echo ""

# Wait for job to stop
echo "=== Waiting 5 seconds for job to stop ==="
sleep 5

# Test 3: Check status after stopping
echo "=== Test 3: Status After Stop ==="
curl -s "$BASE_URL/diary/$DIARY_ID/analyze/status/$JOB_ID" | jq .
echo ""

# Test 4: Check AWS status directly
echo "=== Test 4: AWS Comprehend Status ==="
aws comprehend describe-document-classification-job \
  --job-id "$JOB_ID" \
  --region ap-northeast-1 \
  --query 'DocumentClassificationJobProperties.{Status:JobStatus,Message:Message}' \
  --output json | jq .
echo ""

echo "=== Testing Complete ==="
echo "Check browser console and localStorage for frontend behavior"
```

## Manual localStorage Test Script

Open browser console and run:

```javascript
// Add a fake FAILED job to test UI
const failedJob = {
  diaryId: "test-diary-id", // Replace with actual diary ID
  jobId: "test-job-" + Date.now(),
  startedAt: new Date().toISOString(),
  status: "FAILED",
  progress: 0
};

localStorage.setItem('kibi_analysis_jobs', JSON.stringify([failedJob]));
console.log('Failed job added to localStorage. Refresh page to see UI.');

// Check after refresh:
// The UI should show "分析に失敗しました" briefly before the polling hook removes it
```

## Test Results Template

Use this template to document your test results:

```markdown
## Test Execution Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Development/Production
**Backend Version**: [commit hash]
**Frontend Version**: [commit hash]

### Scenario 1: Backend FAILED Status Detection
- [ ] Test Passed
- [ ] Test Failed
- Notes:

### Scenario 2: Frontend Polling Detects FAILED Status
- [ ] Test Passed
- [ ] Test Failed
- Notes:

### Scenario 3: Manual localStorage Testing
- [ ] Test Passed
- [ ] Test Failed
- Notes:

### Scenario 4: AWS Service Errors
- [ ] 4a. Invalid Job ID - Passed/Failed
- [ ] 4b. Network Error - Passed/Failed
- [ ] 4c. S3 Access Error - Passed/Failed
- Notes:

### Scenario 5: Complete End-to-End Flow
- [ ] Test Passed
- [ ] Test Failed
- Notes:

### Issues Found
1.
2.
3.

### Recommendations
1.
2.
3.
```

## Recommendations for Improvement

### Priority 1: Make Errors Visible to Users

**Implementation**:

1. **Add Toast Notification System**:
   - Create `/front/src/components/ui/Toast.tsx`
   - Add error toast when FAILED status is detected
   - Keep error visible until user dismisses

2. **Persist Failed Jobs Longer**:
   ```typescript
   // In useAnalysisPolling.ts
   if (statusResponse.status === 'FAILED') {
     // Don't remove immediately - mark as failed
     setJobs(prev => prev.map(j =>
       j.diaryId === job.diaryId
         ? { ...j, status: 'FAILED', failedAt: new Date() }
         : j
     ));

     // Remove after 30 seconds
     setTimeout(() => removeJob(job.diaryId), 30000);
   }
   ```

3. **Update UI Styling**:
   - Change status box color to red for FAILED status
   - Add error icon
   - Show actionable message (e.g., "Try analyzing again")

### Priority 2: Return Detailed Error Messages

**Implementation**:

1. **Backend - Extract AWS Error Details**:
   ```typescript
   // In comprehend.ts
   async checkJobStatus(jobId: string) {
     const result = await comprehendClient.send(command);
     const props = result.DocumentClassificationJobProperties;

     return {
       status: props?.JobStatus || 'UNKNOWN',
       progress: calculateProgress(props?.JobStatus),
       errorMessage: props?.Message, // Add this
       errorCode: props?.Status Code // Add this if available
     };
   }
   ```

2. **Update Frontend Types**:
   ```typescript
   export interface AnalysisStatusResponse {
     status: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
     progress?: number;
     diary?: DiaryEntry;
     errorMessage?: string; // Add this
     errorCode?: string; // Add this
   }
   ```

3. **Display Specific Errors**:
   ```typescript
   // In DiaryEditPage.tsx
   if (analysisJob.status === 'FAILED' && analysisJob.errorMessage) {
     return (
       <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
         <p className="text-red-900">分析に失敗しました</p>
         <p className="text-sm text-red-700">{analysisJob.errorMessage}</p>
       </div>
     );
   }
   ```

### Priority 3: Add Persistent Error Logging

**Implementation**:

1. **Create Failed Jobs Table in DynamoDB**
2. **Log to CloudWatch Logs**
3. **Add Admin Dashboard Page**

### Priority 4: Add Retry Capability

**Implementation**:

1. **Add Retry Button in Error UI**
2. **Implement Exponential Backoff**
3. **Track Retry Count**

## Conclusion

The current implementation has basic error handling infrastructure but lacks user-visible error messaging. The main issue is that FAILED jobs are removed from localStorage before the UI can display the error message. This violates AC-2.5 which requires clear error communication to users.

**Required Actions**:
1. Implement persistent error notifications (toast/banner)
2. Delay removal of failed jobs from localStorage
3. Extract and display specific error messages from AWS
4. Add error logging to persistent storage

**Test Coverage Status**:
- ✅ Backend detects FAILED status
- ✅ Frontend polling detects FAILED status
- ✅ Failed jobs are cleaned up from localStorage
- ❌ Error messages are NOT displayed to users (Gap)
- ❌ Error details are NOT logged persistently (Gap)
