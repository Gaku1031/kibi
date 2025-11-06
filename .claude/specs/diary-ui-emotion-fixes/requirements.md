# Requirements: Diary UI Persistence and Emotion Analysis Fixes

**Feature Name:** diary-ui-emotion-fixes
**Created:** 2025-11-06
**Status:** Draft

## Introduction

This specification addresses critical defects in the diary application that prevent users from reliably saving and viewing their diary entries and emotion analysis results. Currently, saved diary entries disappear from the UI after saving, and emotion analysis functionality lacks proper feedback mechanisms and reliable result persistence.

### Problem Statement

**Current Issues:**

1. **Diary Content Not Persisting in UI**: After clicking the save button, diary entries are created in the backend but do not appear in the diary list on the UI. The BlockNote editor content may not be properly synced with the diary state.

2. **Emotion Analysis Not Working Properly**:
   - Emotion analysis jobs are initiated but results are not reliably reflected in the UI
   - No visual feedback to users about the current status of emotion analysis
   - Background polling may not be working correctly
   - Results from AWS Comprehend may not be properly saved to DynamoDB

3. **Emotion Icon Not Displaying**: Even when analysis completes, the emotion icon does not appear correctly in the diary list or detail view, making it difficult for users to visually identify emotional content.

4. **Lack of User Feedback**: Users have no indication that their diary entry was successfully saved, emotion analysis is in progress, or analysis has completed successfully or failed.

## Alignment with Product Vision

This feature aligns with the product vision of Kibi as an emotion-aware diary application that helps users reflect on their feelings through AI-powered sentiment analysis. By fixing these critical issues, we ensure:

- **Core Value Delivery**: Users can reliably save and access their diary entries, which is the fundamental use case
- **Trust in AI Features**: Emotion analysis results must be consistently visible and accurate to build user trust
- **Seamless User Experience**: Background processing and clear status feedback create a professional, polished experience
- **Technical Foundation**: Proper state management and caching patterns establish reliable infrastructure for future features

Without these fixes, the application cannot deliver on its core promise of combining journaling with emotion insights.

## Requirements

### Requirement 1: Diary Content Persistence

**User Story:**
As a user, I want my diary entries to appear in the diary list immediately after saving, so that I can see and access my saved entries without confusion.

#### Acceptance Criteria
1. **AC-1.1**: WHEN the user writes a diary entry and clicks save, THEN the system SHALL display the entry in the sidebar diary list
2. **AC-1.2**: WHEN the user clicks on a saved entry from the list, THEN the system SHALL navigate to and display that entry
3. **AC-1.3**: WHEN the user saves diary content, THEN the system SHALL serialize BlockNote editor content to JSON format and include it in the API request
4. **AC-1.4**: WHEN the user navigates back to a saved diary, THEN the system SHALL render the exact content that was written

#### Technical Details
- The BlockNote editor SHALL properly serialize content to JSON format using `JSON.stringify(editor.document)`
- The `onChange` handler SHALL update the parent component state correctly with the serialized content
- The content field SHALL NOT be empty or undefined when creating/updating entries
- SWR cache for diary list (`diary-list`) SHALL be invalidated immediately after successful save

### Requirement 2: Emotion Analysis Status Visibility

**User Story:**
As a user, I want to see the current status of emotion analysis, so that I know whether my diary is being analyzed, has completed, or has failed.

#### Acceptance Criteria
1. **AC-2.1**: WHEN emotion analysis is initiated, THEN the system SHALL display a visual indicator (spinner, progress bar, or status message) showing analysis is in progress
2. **AC-2.2**: WHEN the user navigates to a different page during analysis, THEN the system SHALL persist the analysis status indicator
3. **AC-2.3**: WHEN analysis completes successfully, THEN the system SHALL display the emotion icon and breakdown
4. **AC-2.4**: WHEN analysis completes successfully, THEN the system SHALL update the status indicator to show completion
5. **AC-2.5**: IF analysis fails, THEN the system SHALL display an error message explaining what went wrong

#### Technical Details
- Analysis jobs SHALL be stored in localStorage using the key `kibi_analysis_jobs`
- Job status SHALL include: `SUBMITTED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`
- Progress indicators SHALL show percentage based on job status: 10% (SUBMITTED), 50% (IN_PROGRESS), 100% (COMPLETED)
- Status checks SHALL poll every 3 seconds while jobs are active

### Requirement 3: Emotion Analysis Result Persistence

**User Story:**
As a user, I want emotion analysis results to be reliably saved and retrieved, so that I can view my emotional insights consistently.

#### Acceptance Criteria
1. **AC-3.1**: WHEN emotion analysis completes, THEN the system SHALL save the results to DynamoDB
2. **AC-3.2**: WHEN results are saved, THEN the system SHALL update the diary entry with emotionAnalysis and iconData fields
3. **AC-3.3**: WHEN results are saved, THEN the system SHALL generate and store an emotion icon based on the analysis
4. **AC-3.4**: WHEN the user reloads the page, THEN the system SHALL retrieve and display the saved emotion analysis results
5. **AC-3.5**: WHEN the user navigates away and back, THEN the system SHALL display the emotion breakdown with accurate percentages

#### Technical Details
- Analysis results from AWS Comprehend SHALL be parsed from S3 output in JSONL format
- Results SHALL be saved to DynamoDB with proper emotion score structure (joy, trust, fear, surprise, sadness, disgust, anger, anticipation)
- Emotion icons SHALL be generated using the `generateEmotionIcon` utility function
- SWR cache for both diary detail and list SHALL be invalidated after result storage

### Requirement 4: Background Analysis Polling

**User Story:**
As a user, I want emotion analysis to continue in the background even if I navigate away, so that I don't have to stay on the page while analysis completes.

#### Acceptance Criteria
1. **AC-4.1**: WHEN the user starts emotion analysis and navigates to another page, THEN the system SHALL continue processing the analysis job
2. **AC-4.2**: WHEN the user is away from the page, THEN the system SHALL continue polling job status at 3-second intervals
3. **AC-4.3**: WHEN the user returns to the diary page, THEN the system SHALL display the updated analysis status or results
4. **AC-4.4**: IF analysis completed while the user was away, THEN the system SHALL display the results immediately upon return

#### Technical Details
- Polling SHALL use the `useAnalysisPolling` hook which runs across page navigations
- Job state SHALL persist in localStorage to survive page reloads and browser closes
- Completed jobs SHALL be removed from the polling queue automatically
- Failed jobs SHALL be removed from the queue and logged to console

### Requirement 5: Emotion Icon Generation

**User Story:**
As a user, I want to see a unique visual icon representing my diary's emotional content, so that I can quickly recognize the emotional tone of each entry at a glance.

#### Acceptance Criteria
1. **AC-5.1**: WHEN emotion analysis completes successfully, THEN the system SHALL generate a unique emotion icon based on the analysis results
2. **AC-5.2**: WHEN the icon is generated, THEN it SHALL visually represent the dominant emotions (joy, trust, fear, surprise, sadness, disgust, anger, anticipation)
3. **AC-5.3**: WHEN displaying the diary entry, THEN the system SHALL show the emotion icon prominently near the title or emotion breakdown
4. **AC-5.4**: WHEN the same diary is viewed multiple times, THEN the system SHALL display the same consistent icon (deterministic generation)
5. **AC-5.5**: WHEN viewing the diary list, THEN each diary entry SHALL display its corresponding emotion icon

#### Technical Details
- Icon generation SHALL use the `generateEmotionIcon` utility function in backend
- Icon data SHALL be stored in the `iconData` field of the diary entry
- Icon generation SHALL be deterministic based on emotion scores and diary ID
- Icons SHALL be generated on the backend and sent to frontend for display
- Icon component SHALL support different sizes (small for list view, large for detail view)
- The `EmotionIcon` React component SHALL handle rendering of icon data

## Non-Functional Requirements

### NFR-1: Performance
- The system SHALL complete diary save operations within 2 seconds under normal network conditions
- Emotion analysis status checks SHALL NOT block UI interactions or cause perceived lag
- Polling intervals SHALL be set to 3 seconds to balance responsiveness and API request costs
- Initial page load SHALL display cached diary data within 500ms

### NFR-2: Reliability
- The system SHALL NEVER lose diary content due to UI state management issues
- Analysis job state SHALL persist if the user closes the browser or refreshes the page
- The system SHALL log all failed analysis jobs with error details for debugging
- The system SHALL handle network failures gracefully with retry logic

### NFR-3: User Experience
- The system SHALL display loading states with smooth animations (spinner, progress bar)
- Error messages SHALL be user-friendly and provide actionable next steps
- The UI SHALL remain responsive during background operations
- Status updates SHALL occur without requiring manual page refresh

### NFR-4: Security
- The system SHALL only accept diary save requests from authenticated users
- AWS credentials SHALL be stored securely in environment variables, NEVER in client code
- API requests SHALL include proper authentication tokens
- User diary data SHALL be isolated per user (future: when authentication is added)

### NFR-5: Maintainability
- Code SHALL follow existing project structure and naming conventions
- State management SHALL use consistent patterns (SWR for server state, localStorage for client state)
- Functions SHALL include error handling with descriptive log messages
- Components SHALL follow single responsibility principle

## Appendix

### Technical Constraints

**AWS Integration:**
- Must use AWS Comprehend for emotion analysis (existing setup)
- Must use AWS S3 for input/output file storage
- Must use AWS Translate for Japanese to English translation
- Must work with existing IAM roles and permissions

**State Management:**
- Must use SWR for cache management
- Must use localStorage for persistent job tracking across sessions
- Must avoid Recoil due to SSR compatibility issues

**Editor Integration:**
- Must use BlockNote editor (existing implementation)
- Must maintain compatibility with BlockNote's JSON format
- Must support dynamic loading with Next.js SSR disabled

### Dependencies

- Existing AWS infrastructure (Comprehend, S3, DynamoDB)
- BlockNote editor library (@blocknote/react, @blocknote/mantine)
- SWR for data fetching and caching
- Next.js 14 routing and navigation

### Success Metrics

1. **Diary Persistence Rate**: 100% of saved diaries appear in the UI immediately
2. **Analysis Completion Rate**: >95% of emotion analysis jobs complete successfully
3. **User Feedback Visibility**: 100% of operations show appropriate status indicators
4. **Result Persistence**: 100% of completed analyses are saved and retrievable
5. **Icon Generation Rate**: 100% of completed analyses generate and display emotion icons

### Out of Scope

- Changing the emotion analysis algorithm or AWS service configuration
- Redesigning the diary editor UI or changing editor libraries
- Adding new features beyond fixing existing functionality
- Performance optimization beyond the stated requirements
- Multi-user authentication and authorization implementation
- Internationalization beyond Japanese/English support

### References

- BlockNote Documentation: https://www.blocknotejs.org/
- AWS Comprehend Documentation: https://docs.aws.amazon.com/comprehend/
- SWR Documentation: https://swr.vercel.app/
- Next.js Documentation: https://nextjs.org/docs

### Assumptions

1. AWS credentials provided by the user are valid and have necessary permissions
2. The backend server is properly configured and running on port 8080
3. DynamoDB tables (`Diaries`, `EmotionAnalysis`) exist with correct schemas
4. S3 bucket (`kibi-content-223708988018`) has proper access policies
5. The Comprehend custom classifier (`kibi-emotion-classifier`) is trained and available
6. Users are accessing the application in a modern browser with JavaScript enabled
7. LocalStorage is available and not disabled by user settings
