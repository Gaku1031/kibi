# Logging Standards - Kibi Project

**Version:** 1.0
**Date:** 2025-11-06
**Status:** Active

---

## Overview

This document defines logging standards for the Kibi diary application. These standards are based on best practices observed during the diary-ui-emotion-fixes implementation and should be followed for all future development.

---

## Table of Contents

1. [Log Prefix Standards](#log-prefix-standards)
2. [When to Log](#when-to-log)
3. [Log Levels](#log-levels)
4. [Message Format](#message-format)
5. [Development vs Production](#development-vs-production)
6. [Security Guidelines](#security-guidelines)
7. [Examples](#examples)

---

## Log Prefix Standards

### Purpose
Log prefixes help filter and search logs effectively. All logs should include a prefix that identifies the source module.

### Format
```typescript
console.log('[ModuleName] Action description', { contextData });
```

### Prefix Conventions

| Module Type | Prefix Format | Example |
|-------------|---------------|---------|
| React Hook | `[hookName]` | `[useDiary]`, `[useAnalysisPolling]` |
| Page Component | `[PageName]` | `[DiaryEditPage]`, `[TimelinePage]` |
| UI Component | `[ComponentName]` | `[Sidebar]`, `[Modal]` |
| Service | `[ServiceName]` | `[IconGen]`, `[Comprehend]` |
| Repository | `[Repository]` | `[Repository]` |
| Route Handler | `[Route Context]` | `[Analyze Start]`, `[Analyze Status]` |
| Utility | `[UtilityName]` | `[DateUtils]`, `[Validator]` |

### Examples

```typescript
// ✅ Good - Hook
console.log('[useDiary] Creating diary', { contentLength });

// ✅ Good - Component
console.log('[DiaryEditPage] handleSave called', { diaryId });

// ✅ Good - Service
console.log('[IconGen] Starting icon generation', { emotions });

// ✅ Good - Route context
console.log('[Analyze Start] Analysis job started', { jobId });

// ❌ Bad - No prefix
console.log('Creating diary');

// ❌ Bad - Inconsistent prefix
console.log('[diary] Creating...');
```

---

## When to Log

### DO Log

#### 1. State Changes
Log significant state transitions:
```typescript
console.log('[useAnalysisPolling] Adding job:', { diaryId, jobId });
console.log('[useDiary] Invalidating cache:', DIARY_LIST_KEY);
```

#### 2. API Calls
Log request initiation and response:
```typescript
console.log('[useDiary] createDiary called', {
  contentLength: data.content.length,
  hasDate: !!data.date
});

console.log('[useDiary] createDiary API response', {
  diaryId: newDiary.id,
  createdAt: newDiary.createdAt
});
```

#### 3. Background Operations
Log polling, async jobs, and background tasks:
```typescript
console.log('[useAnalysisPolling] Polling job:', {
  diaryId: job.diaryId,
  jobId: job.jobId,
  currentStatus: job.status
});
```

#### 4. Errors with Context
Always log errors with relevant context:
```typescript
console.error('[AnalysisPolling] Failed to poll job:', {
  diaryId: job.diaryId,
  error: error.message,
  stack: error.stack
});
```

#### 5. Validation Failures
Log validation issues:
```typescript
console.warn('[Analyze Start] Empty diary content', { diaryId });
```

#### 6. Critical User Actions
Log important user operations:
```typescript
console.log('[DiaryEditPage] handleSave called', { diaryId, contentLength });
```

### DON'T Log

#### 1. Sensitive Data
Never log passwords, tokens, API keys, or PII:
```typescript
// ❌ NEVER do this
console.log('User password:', password);
console.log('API token:', token);
console.log('Email:', user.email);
```

#### 2. Large Payloads
Don't log full documents or large objects. Log metadata instead:
```typescript
// ❌ Bad - logs entire document
console.log('[BlockNote] Content:', editor.document);

// ✅ Good - logs metadata
console.log('[BlockNote] Content changed:', {
  length: JSON.stringify(editor.document).length,
  blockCount: editor.document.length
});
```

#### 3. Every Render Cycle
Don't log on every component render:
```typescript
// ❌ Bad - creates excessive logs
function MyComponent() {
  console.log('MyComponent rendered');
  return <div>...</div>;
}
```

#### 4. Trivial Operations
Don't log obvious or trivial operations:
```typescript
// ❌ Bad - too verbose
console.log('Setting state');
console.log('Function returned');
```

---

## Log Levels

### console.log() - Normal Operations
Use for debugging, tracking, and information.

**When to use:**
- Normal operation flow
- State changes
- API calls
- Background tasks
- Debugging data

**Examples:**
```typescript
console.log('[useDiary] Creating diary', { contentLength });
console.log('[useAnalysisPolling] Job added:', newJob);
console.log('[IconGen] Icon generation complete', { triangleCount });
```

### console.warn() - Edge Cases
Use for non-critical issues and edge cases.

**When to use:**
- Unexpected but handled situations
- Edge cases
- Validation warnings
- Deprecated feature usage

**Examples:**
```typescript
console.warn('[IconGen] No triangles generated (all emotion scores below 0.1)');
console.warn('[Analyze Start] Empty diary content', { diaryId });
```

### console.error() - Errors and Failures
Use for errors, exceptions, and operation failures.

**When to use:**
- Caught exceptions
- Failed operations
- API errors
- Validation errors
- Unrecoverable states

**Examples:**
```typescript
console.error('[useDiary] Failed to create diary:', error);
console.error('[AnalysisPolling] Failed to poll job:', {
  diaryId: job.diaryId,
  error: error.message
});
```

### Decision Tree

```
Is it an error/exception?
├─ Yes → console.error()
└─ No → Is it an edge case or warning?
    ├─ Yes → console.warn()
    └─ No → console.log()
```

---

## Message Format

### Structure
```typescript
console.log('[Module] Action description', { contextData });
```

### Components

1. **Prefix:** `[ModuleName]` - Identifies the source
2. **Action:** Brief description of what happened
3. **Context:** Object with relevant data (optional but recommended)

### Good Message Examples

```typescript
// ✅ Good - Clear action with context
console.log('[useDiary] createDiary called', {
  contentLength: data.content.length,
  hasDate: !!data.date
});

// ✅ Good - Error with full context
console.error('[Analyze Start] Error occurred:', {
  diaryId: id,
  error: error.message,
  stack: error.stack
});

// ✅ Good - State change with minimal context
console.log('[useAnalysisPolling] Removing job for diary:', diaryId);
```

### Bad Message Examples

```typescript
// ❌ Bad - No prefix
console.log('Creating diary');

// ❌ Bad - Unclear action
console.log('[useDiary] Doing stuff');

// ❌ Bad - No context when needed
console.error('Failed'); // Failed what? Why?

// ❌ Bad - Too verbose
console.log('[useDiary] Now we are going to create a diary entry with the following data...');
```

### Context Object Best Practices

```typescript
// ✅ Good - Structured data
console.log('[IconGen] Starting icon generation', {
  joy: analysis.joy,
  trust: analysis.trust,
  seed: iconSeed
});

// ✅ Good - Include IDs for tracing
console.log('[useAnalysisPolling] Polling job:', {
  diaryId: job.diaryId,
  jobId: job.jobId,
  currentStatus: job.status
});

// ✅ Good - Length instead of full content
console.log('[BlockNote] Content changed', {
  serializedLength: serialized.length
});
```

---

## Development vs Production

### Development-Only Logs

Wrap debug logs in environment checks:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Repository] API Configuration:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_BASE_URL,
  });
}
```

**When to use:**
- Configuration dumps
- Environment variable inspection
- Detailed request/response payloads
- Performance measurements

### Production Logs

Keep in production:
- Error logs with context
- Critical operation tracking
- Background job monitoring
- API call logging (without sensitive data)

**Guidelines:**
- All production logs must be safe (no secrets)
- Use structured logging (JSON objects)
- Include enough context for debugging
- Don't log excessively (keep volume reasonable)

---

## Security Guidelines

### ❌ NEVER Log

1. **Authentication Credentials**
   ```typescript
   // ❌ NEVER
   console.log('Password:', password);
   console.log('API Key:', apiKey);
   console.log('Token:', authToken);
   ```

2. **Personal Identifiable Information (PII)**
   ```typescript
   // ❌ NEVER
   console.log('User email:', user.email);
   console.log('Phone number:', user.phone);
   console.log('Address:', user.address);
   ```

3. **Full AWS Credentials**
   ```typescript
   // ❌ NEVER
   console.log('AWS Config:', awsConfig);
   ```

### ✅ Safe to Log

1. **IDs and References**
   ```typescript
   // ✅ OK - IDs are safe
   console.log('[useDiary] Creating diary for user:', userId);
   console.log('[Analysis] Job ID:', jobId);
   ```

2. **Metadata and Lengths**
   ```typescript
   // ✅ OK - metadata without content
   console.log('[useDiary] Content length:', content.length);
   console.log('[Analysis] Processing diary', { diaryId, contentLength });
   ```

3. **Error Messages (Sanitized)**
   ```typescript
   // ✅ OK - error message without sensitive data
   console.error('[API] Request failed:', {
     status: response.status,
     endpoint: '/diary',
     error: error.message
   });
   ```

---

## Examples

### Example 1: React Hook

```typescript
// useDiary.ts
export function useDiaryActions() {
  const createDiary = async (data: CreateDiaryRequest): Promise<DiaryEntry> => {
    console.log('[useDiary] createDiary called', {
      contentLength: data.content?.length || 0,
      hasDate: !!data.date
    });

    try {
      const newDiary = await diaryRepository.createDiary(data);

      console.log('[useDiary] createDiary API response', {
        diaryId: newDiary.id,
        contentLength: newDiary.content?.length || 0,
        createdAt: newDiary.createdAt
      });

      console.log('[useDiary] Invalidating cache:', DIARY_LIST_KEY);
      mutate(DIARY_LIST_KEY);

      return newDiary;
    } catch (error) {
      console.error('[useDiary] Failed to create diary:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  return { createDiary };
}
```

### Example 2: Backend Route Handler

```typescript
// routes/diary.ts
app.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');

  try {
    console.log('[Analyze Start] Starting analysis job', { diaryId: id });

    const diary = await diaryService.getDiary(id);

    if (!diary) {
      console.warn('[Analyze Start] Diary not found', { diaryId: id });
      return c.json({ error: 'Diary not found' }, 404);
    }

    console.log('[Analyze Start] Diary retrieved, starting analysis', {
      diaryId: id,
      contentLength: diary.content.length
    });

    const jobId = await emotionAnalysisService.startAnalysisJob(id, diary.content);

    console.log('[Analyze Start] Analysis job started successfully', {
      diaryId: id,
      jobId
    });

    return c.json({ jobId, status: 'SUBMITTED' });
  } catch (error) {
    console.error('[Analyze Start] Error occurred:', {
      diaryId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return c.json({ error: 'Failed to start analysis' }, 500);
  }
});
```

### Example 3: Background Polling

```typescript
// useAnalysisPolling.ts
export function useAnalysisPolling() {
  const pollJob = useCallback(async (job: AnalysisJob) => {
    try {
      console.log('[useAnalysisPolling] Polling job:', {
        diaryId: job.diaryId,
        jobId: job.jobId,
        currentStatus: job.status
      });

      const response = await diaryRepository.checkAnalysisStatus(job.diaryId, job.jobId);

      console.log('[useAnalysisPolling] Poll response:', {
        diaryId: job.diaryId,
        status: response.status,
        progress: response.progress
      });

      if (response.status === 'COMPLETED') {
        console.log('[useAnalysisPolling] Analysis completed for diary:', job.diaryId);
        // Update cache and remove job
        mutate(getDiaryKey(job.diaryId));
        removeJob(job.diaryId);
        return;
      }

      if (response.status === 'FAILED') {
        console.error('[useAnalysisPolling] Analysis failed for diary:', job.diaryId);
        removeJob(job.diaryId);
        return;
      }

      // Update progress
      console.log('[useAnalysisPolling] Updating job status:', {
        diaryId: job.diaryId,
        newStatus: response.status,
        newProgress: response.progress
      });

      updateJob(job.diaryId, response);
    } catch (error) {
      console.error('[useAnalysisPolling] Failed to poll job:', {
        diaryId: job.diaryId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [removeJob, updateJob]);

  return { pollJob };
}
```

### Example 4: Utility Function

```typescript
// utils/emotionIcon.ts
export function generateEmotionIcon(
  emotionAnalysis: EmotionAnalysis,
  seed: number
): EmotionIcon {
  console.log('[IconGen] Starting icon generation', {
    joy: emotionAnalysis.joy,
    trust: emotionAnalysis.trust,
    seed
  });

  const triangles = generateTriangles(emotionAnalysis, seed);

  console.log('[IconGen] Generated triangles:', triangles.length);

  if (triangles.length === 0) {
    console.warn('[IconGen] No triangles generated (all emotion scores below 0.1)');
  }

  // Validation
  for (let i = 0; i < triangles.length; i++) {
    if (!isValidTriangle(triangles[i])) {
      console.error('[IconGen] Validation error at index', i, triangles[i]);
      throw new Error(`Invalid triangle data at index ${i}`);
    }
  }

  console.log('[IconGen] Icon generation complete', {
    triangleCount: triangles.length,
    seed,
    hasValidData: triangles.length > 0
  });

  return { triangles, seed };
}
```

---

## Checklist for Code Review

When reviewing code, verify:

- [ ] All logs have consistent prefixes
- [ ] Log levels are appropriate (log/warn/error)
- [ ] No sensitive data is logged
- [ ] Large payloads are not logged (log metadata instead)
- [ ] Error logs include context (error message, stack trace)
- [ ] Context objects use structured data
- [ ] Development-only logs are wrapped in environment checks
- [ ] Log messages are clear and actionable

---

## Tools and Utilities

### Log Filtering

Search logs by prefix:
```bash
# Frontend logs
grep "\[useDiary\]" console.log

# Backend logs
grep "\[Analyze Status\]" server.log

# All error logs
grep "console.error" app.log
```

### Production Log Monitoring

Consider implementing:
- Structured logging (e.g., Winston, Pino)
- Log aggregation (e.g., CloudWatch, DataDog)
- Error tracking (e.g., Sentry)
- Performance monitoring (e.g., New Relic)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-06 | Initial standards based on diary-ui-emotion-fixes audit |

---

**End of Logging Standards Document**
