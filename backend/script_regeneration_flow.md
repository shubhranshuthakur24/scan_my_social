# Script Regeneration Workflow

This document outlines the required steps to regenerate and refine an AI script from a video's detail page.

## Workflow Overview

```mermaid
graph TD
    Start["Video Details Page (/videos/{id})"] --> CheckTranscript{"Is Transcribed?"}
    
    CheckTranscript -- "No" --> Transcribe["Click 'Initiate Transcription'"]
    Transcribe --> TranscriptionProcess["Wait for AI Transcription"]
    TranscriptionProcess --> CheckTranscript
    
    CheckTranscript -- "Yes" --> CheckAnalysis{"Is Analyzed?"}
    
    CheckAnalysis -- "No" --> Analyze["Click 'Run Deep Analysis'"]
    Analyze --> AnalysisProcess["Wait for Strategic Analysis"]
    AnalysisProcess --> CheckAnalysis
    
    CheckAnalysis -- "Yes" --> RefineNav["Click 'Refine Script'"]
    RefineNav --> RefinePage["Refine Page (/videos/{id}/refine)"]
    RefinePage --> CheckScriptExist{"Script Exists?"}
    
    CheckScriptExist -- "No" --> Generate["Auto-trigger 'Process'"]
    Generate --> AIProcess["PostController@process"]
    AIProcess --> CheckScriptExist
    
    CheckScriptExist -- "Yes" --> Workspace["Refine Workspace (Editable)"]
    
    style Start fill:#f9f9f9,stroke:#333
    style Transcribe fill:#e1f5fe,stroke:#01579b
    style Analyze fill:#fff3e0,stroke:#e65100
    style RefineNav fill:#e8f5e9,stroke:#1b5e20
    style RefinePage fill:#f3e5f5,stroke:#4a148c
```

## Detailed Steps

### 1. Transcription (Required First)
- **Frontend Action:** `handleTranscribe` (Show.jsx)
- **API Endpoint:** `POST /api/posts/{id}/transcribe`
- **Controller Method:** `PostController@transcribe`
- **Core Services:** `ElevenLabsService` & `OpenAIWhisperService`
- **Result:** Extracts the verbatim dialogue from the video.
- **Dependency:** MUST be completed before Deep Analysis can be started.

### 2. Deep Strategic Analysis
- **Frontend Action:** `handleAnalyze` (Show.jsx)
- **API Endpoint:** `POST /api/posts/{id}/analyze`
- **Controller Method:** `PostController@analyze`
- **Core Service:** `ContentProcessingService@analyze`
- **Result:** Uses the transcript to perform a multi-dimensional strategic breakdown (Hook, Content Angle, Psychological Drivers, etc.).
- **Dependency:** Requires the transcript to be present.

### 3. Initial Script Generation
- **Frontend Action:** Triggered on mount in `Refine.jsx` (if no script exists).
- **API Endpoint:** `POST /api/posts/{id}/process`
- **Controller Method:** `PostController@process`
- **Core Service:** `ContentProcessingService@process`
- **Result:** Uses the Strategic Analysis to craft the first version of the script.
- **Deduction:** Credits are typically deducted here for the "Generation" action.

### 4. Refinement & Editing
- **Frontend Page:** `resources/js/Pages/Videos/Refine.jsx`
- **Manual AI Refine:** `POST /api/scripts/{id}/refine` (via `ScriptController@refine`)
- **Result:** Allows the user to iterate on the script with additional constraints (Tone, Language, Duration).
