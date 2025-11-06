# Implementation Plan: Diary UI Persistence and Emotion Analysis Fixes

**Feature Name:** diary-ui-emotion-fixes
**Created:** 2025-11-06
**Status:** Draft

## Task Overview

This implementation plan addresses critical defects in the diary application's content persistence, emotion analysis workflow, and icon display. After thorough codebase analysis, **all core functionality is already implemented**. Therefore, this plan focuses on **verification, testing, and incremental improvements** to ensure reliability.

### Implementation Strategy
1. **Verification Phase**: Confirm existing implementations work as expected
2. **Enhancement Phase**: Add comprehensive logging, error handling, and user feedback
3. **Testing Phase**: Ensure all components work reliably together

## Steering Document Compliance

### Technical Standards (tech.md)
- Use existing SWR patterns for cache management
- Follow localStorage patterns for client-side persistence (SSR-safe)
- Leverage AWS SDK v3 clients (Translate, Comprehend, S3, DynamoDB)
- Continue BlockNote integration with SSR-disabled dynamic import

### Project Structure (structure.md)
- Frontend components: `front/src/components/page/` and `front/src/components/model/`
- Frontend hooks: `front/src/usecases/diary/`
- Backend routes: `backend/src/routes/`
- Backend services: `backend/src/services/`
- Backend utilities: `backend/src/utils/`

## Atomic Task Requirements

**Each task must meet these criteria for optimal agent execution:**
- **File Scope**: Touches 1-3 related files maximum
- **Time Boxing**: Completable in 15-30 minutes
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Must specify exact files to create/modify
- **Agent-Friendly**: Clear input/output with minimal context switching

## Tasks

### Phase 1: BlockNote Editor Verification and Enhancement

- [x] 1. Verify BlockNote editor content serialization
  - Files: `front/src/components/ui/BlockNoteEditor.tsx`, `front/src/components/page/DiaryEditPage.tsx`
  - Verify that `onChange` handler correctly serializes BlockNote content to JSON
  - Add console logs to track content changes: `console.log('[BlockNote] Content changed:', serialized);`
  - Test with empty content, plain text, and rich formatting
  - Purpose: Ensure content is correctly captured before saving
  - _Leverage: Existing `useCreateBlockNote`, `BlockNoteView` from `@blocknote/react`_
  - _Requirements: 1.1, 1.3_

- [x] 2. Add debug logging to diary save flow
  - Files: `front/src/usecases/diary/useDiary.ts`
  - Add logging in `createDiary` and `updateDiary` functions
  - Log content length, diary ID, and API response
  - Verify `mutate(DIARY_LIST_KEY)` and `mutate(getDiaryKey(id))` are called
  - Purpose: Track diary save operations and cache invalidation
  - _Leverage: Existing `mutate` from SWR, `diaryRepository` API calls_
  - _Requirements: 1.1, 1.2_

- [x] 3. Test diary list cache invalidation after save
  - Files: `front/src/usecases/diary/useDiary.ts`, `front/src/components/ui/Sidebar.tsx`
  - Create a new diary entry and verify it appears in the sidebar immediately
  - Check that `DIARY_LIST_KEY` cache is updated
  - Navigate to the new diary and verify content is displayed correctly
  - Purpose: Confirm SWR cache invalidation works as expected
  - _Leverage: Existing `mutate()` cache update pattern_
  - _Requirements: 1.1, 1.2_

### Phase 2: Emotion Analysis Status Display Enhancement

- [x] 4. Enhance emotion analysis status messages
  - Files: `front/src/components/page/DiaryEditPage.tsx`
  - Improve the `getAnalysisStatusMessage()` function with detailed messages
  - Display job ID (first 8 characters) for debugging
  - Show started timestamp in Japanese locale format
  - Purpose: Provide clearer feedback to users during analysis
  - _Leverage: Existing `useAnalysisPolling` hook, `analysisJob` state_
  - _Requirements: 2.1, 2.4_

- [x] 5. Add smooth progress bar animation
  - Files: `front/src/components/page/DiaryEditPage.tsx`
  - Enhance progress bar with gradient background (`from-blue-600 to-indigo-600`)
  - Add smooth transition animation (`transition-all duration-500 ease-out`)
  - Display percentage text below progress bar
  - Purpose: Improve visual feedback during analysis
  - _Leverage: Existing `analysisProgress` state, TailwindCSS utilities_
  - _Requirements: 2.1, 2.2_

- [x] 6. Add cross-page analysis status persistence
  - Files: `front/src/usecases/diary/useAnalysisPolling.ts`
  - Verify localStorage saves job state on navigation
  - Test navigating away from diary page during analysis
  - Return to diary page and confirm status is still displayed
  - Purpose: Ensure analysis continues in background across page changes
  - _Leverage: Existing localStorage pattern (`kibi_analysis_jobs` key)_
  - _Requirements: 2.2, 2.3_

### Phase 3: Emotion Analysis Result Storage Verification

- [x] 7. Add comprehensive logging to analysis status endpoint
  - Files: `backend/src/routes/diary.ts` (analyze status endpoint)
  - Add logging at key points: job check, result fetch, icon generation, DB save
  - Log analysis results and icon data before saving
  - Log errors with full stack traces
  - Purpose: Enable debugging of analysis result storage
  - _Leverage: Existing `/analyze/status/:jobId` endpoint_
  - _Requirements: 3.1, 3.2_

- [x] 8. Verify emotion analysis DB save operation
  - Files: `backend/src/routes/diary.ts`, `backend/src/services/dynamodb.ts`
  - Confirm `emotionAnalysisDBService.saveAnalysis()` is called after job completion
  - Verify analysis results are correctly formatted before saving
  - Check that diary entry is updated with `emotionAnalysis` and `iconData` fields
  - Purpose: Ensure results are persisted to DynamoDB
  - _Leverage: Existing `EmotionAnalysisService.saveAnalysis()` method_
  - _Requirements: 3.1, 3.2_

- [x] 9. Test emotion result retrieval and display
  - Files: `front/src/components/page/DiaryEditPage.tsx`, `front/src/repositories/diary/repository.ts`
  - After analysis completes, verify emotion breakdown is displayed
  - Check that percentages match analysis scores
  - Test page reload and confirm results persist
  - Purpose: Verify end-to-end result persistence and display
  - _Leverage: Existing `useDiary(id)` hook, SWR cache_
  - _Requirements: 3.4, 3.5_

### Phase 4: Background Analysis Polling Enhancement

- [x] 10. Add detailed logging to polling hook
  - Files: `front/src/usecases/diary/useAnalysisPolling.ts`
  - Log when jobs are loaded from localStorage on mount
  - Log polling interval starts and stops
  - Log each poll attempt with job status updates
  - Log when jobs are removed (completed or failed)
  - Purpose: Enable debugging of background polling behavior
  - _Leverage: Existing `useAnalysisPolling` hook with 3-second intervals_
  - _Requirements: 4.1, 4.2_

- [x] 11. Test cross-page polling continuation
  - Files: `front/src/usecases/diary/useAnalysisPolling.ts`, test manually
  - Start emotion analysis on a diary
  - Navigate to timeline or another diary page
  - Wait for analysis to complete (check console logs)
  - Return to original diary and verify results are displayed
  - Purpose: Confirm polling continues across page navigations
  - _Leverage: Existing localStorage persistence, SWR cache updates_
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 12. Verify job cleanup after completion
  - Files: `front/src/usecases/diary/useAnalysisPolling.ts`
  - Check that completed jobs are removed from localStorage
  - Verify failed jobs are also cleaned up and logged
  - Ensure polling interval stops when no jobs are active
  - Purpose: Prevent memory leaks and unnecessary polling
  - _Leverage: Existing `removeJob()` function_
  - _Requirements: 4.3_

### Phase 5: Emotion Icon Generation and Display

- [x] 13. Add logging to icon generation utility
  - Files: `backend/src/utils/emotionIcon.ts`
  - Log emotion scores before icon generation
  - Log generated icon data (triangle count, seed, colors)
  - Add validation to ensure icon has valid triangle data
  - Purpose: Enable debugging of icon generation logic
  - _Leverage: Existing `generateEmotionIcon()` function_
  - _Requirements: 5.1, 5.2_

- [x] 14. Verify icon data is saved with diary entry
  - Files: `backend/src/routes/diary.ts` (analyze status endpoint)
  - Confirm `iconData` is generated after analysis completes
  - Verify `iconData` is included in API response
  - Check that frontend receives and caches icon data
  - Purpose: Ensure icons are generated and persisted correctly
  - _Leverage: Existing icon generation in `/analyze/status` endpoint_
  - _Requirements: 5.3, 5.4_

- [x] 15. Test icon display in diary list and detail views
  - Files: `front/src/components/model/emotion/EmotionIcon.tsx`, `front/src/components/page/DiaryEditPage.tsx`, `front/src/components/ui/Sidebar.tsx`
  - Verify icon renders correctly in sidebar (small size)
  - Verify icon renders correctly in diary detail view (large size)
  - Check that same icon is displayed consistently on multiple views
  - Test with missing `iconData` (should gracefully handle null)
  - Purpose: Confirm icon display works across all views
  - _Leverage: Existing `EmotionIcon` component, `renderEmotionIconToSVG` utility_
  - _Requirements: 5.3, 5.5_

### Phase 6: Error Handling and Edge Cases

- [x] 16. Add error handling to analysis start flow
  - Files: `backend/src/routes/diary.ts` (POST /:id/analyze endpoint)
  - Wrap analysis start in try-catch
  - Return user-friendly error messages for common failures (AWS errors, invalid diary ID)
  - Log full error details to console
  - Purpose: Gracefully handle analysis start failures
  - _Leverage: Existing `emotionAnalysisService.startAnalysisJob()` method_
  - _Requirements: NFR-2, NFR-3_

- [x] 17. Add error handling to polling status checks
  - Files: `front/src/usecases/diary/useAnalysisPolling.ts`
  - Wrap `diaryRepository.checkAnalysisStatus()` in try-catch
  - Log polling errors without crashing the app
  - Continue polling other jobs if one fails
  - Purpose: Prevent one failing job from stopping all polling
  - _Leverage: Existing `pollJob()` function_
  - _Requirements: NFR-2, NFR-3_

- [x] 18. Test analysis with empty or very short diary content
  - Files: Test manually with `backend/src/services/comprehend.ts`
  - Create a diary with less than 10 characters
  - Attempt to run emotion analysis
  - Verify graceful error handling or minimum length validation
  - Purpose: Handle edge case of insufficient content for analysis
  - _Leverage: Existing AWS Translate and Comprehend integration_
  - _Requirements: NFR-2_

- [x] 19. Test analysis failure scenarios
  - Files: Test manually, check error handling in `backend/src/routes/diary.ts`
  - Simulate AWS Comprehend job failure (manually mark job as FAILED)
  - Verify error message is displayed to user
  - Check that failed job is cleaned up from localStorage
  - Purpose: Ensure failures are communicated clearly to users
  - _Leverage: Existing error handling in analyze status endpoint_
  - _Requirements: 2.5, NFR-2_

### Phase 7: Final Integration and Validation

- [x] 20. End-to-end test: Create diary with analysis
  - Files: Test entire flow manually
  - Create a new diary entry with meaningful content
  - Save the diary and verify it appears in sidebar
  - Start emotion analysis and verify status indicator appears
  - Wait for analysis to complete
  - Verify emotion breakdown and icon are displayed
  - Reload page and confirm results persist
  - Purpose: Validate complete user workflow
  - _Leverage: All existing components and services_
  - _Requirements: All_

- [x] 21. End-to-end test: Cross-page analysis tracking
  - Files: Test entire flow manually
  - Start emotion analysis on a diary
  - Navigate to timeline or another diary
  - Wait 10-15 seconds
  - Navigate back to original diary
  - Verify analysis completed and results are visible
  - Purpose: Validate background polling across navigation
  - _Leverage: `useAnalysisPolling` hook, localStorage persistence_
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 22. Performance validation
  - Files: Browser DevTools, monitor API requests
  - Check that diary save completes within 2 seconds
  - Verify polling happens every 3 seconds (not more frequently)
  - Confirm page load displays cached data within 500ms
  - Check that UI remains responsive during analysis
  - Purpose: Ensure performance meets non-functional requirements
  - _Leverage: Browser performance monitoring tools_
  - _Requirements: NFR-1_

- [x] 23. Code cleanup and documentation
  - Files: Remove excessive debug logs if needed
  - Keep important logs for production debugging
  - Add inline comments for complex logic (if needed)
  - Ensure all console.log statements use consistent prefixes (e.g., `[BlockNote]`, `[AnalysisPolling]`)
  - Purpose: Maintain clean, maintainable codebase
  - _Leverage: Existing code structure and patterns_
  - _Requirements: NFR-5_

## Notes

### Implementation Status
**All core functionality is already implemented.** The tasks above focus on:
1. **Verification**: Confirming existing implementations work correctly
2. **Enhancement**: Adding logging, error handling, and visual improvements
3. **Testing**: Validating end-to-end workflows and edge cases

### Amazon Translate Implementation
✅ **Amazon Translate is already implemented** in `backend/src/services/comprehend.ts` (lines 163-172). The `translateToEnglish()` method is called automatically during `startAnalysisJob()` (line 32), so Japanese diary entries are translated to English before being sent to AWS Comprehend for emotion analysis.

### Existing Code to Leverage
- **BlockNote Editor**: `front/src/components/ui/BlockNoteEditor.tsx`, `front/src/components/ui/Editor.tsx`
- **SWR Hooks**: `front/src/usecases/diary/useDiary.ts`
- **Polling Hook**: `front/src/usecases/diary/useAnalysisPolling.ts`
- **API Repository**: `front/src/repositories/diary/repository.ts`
- **Backend Routes**: `backend/src/routes/diary.ts`
- **Emotion Analysis Service**: `backend/src/services/comprehend.ts`
- **DB Service**: `backend/src/services/dynamodb.ts`
- **Icon Utilities**: `backend/src/utils/emotionIcon.ts`, `front/src/components/model/emotion/EmotionIcon.tsx`

### Key Integration Points
- **SWR Cache Keys**: `DIARY_LIST_KEY = 'diary-list'`, `getDiaryKey(id) = diary-${id}`
- **LocalStorage Key**: `kibi_analysis_jobs` (stores active analysis jobs)
- **Polling Interval**: 3000ms (3 seconds)
- **API Endpoints**: `POST /diary/:id/analyze`, `GET /diary/:id/analyze/status/:jobId`

### Testing Strategy
- **Manual Testing**: Most tasks involve manual testing of UI flows
- **Browser DevTools**: Use console logs and network tab for debugging
- **End-to-End Validation**: Tasks 20-22 cover complete user workflows

---

**Estimated Total Time**: 6-8 hours (assuming all implementations work correctly and only minor fixes are needed)

**Risk Assessment**: Low (all core functionality is implemented; tasks focus on validation and enhancement)
