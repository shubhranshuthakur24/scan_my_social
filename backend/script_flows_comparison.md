# Script Flows Comparison

This document compares the two primary ways to generate and refine AI scripts in Scan My Social: **Regeneration (from Video)** and **Fresh Generation (from Scratch)**.

## Comparison Overview

| Feature | Script Regeneration | Fresh Script Generation |
| :--- | :--- | :--- |
| **Entry Point** | Video Details Page (`/videos/{id}`) | Scripts Listing Page (`/scripts`) |
| **Input Source** | Existing Video (Viral Blueprint) | User Topic & Constraints |
| **Data Requirements** | Transcription & Deep Analysis MUST exist | None (starts with user parameters) |
| **Processing Type** | Synchronous Multi-step | Fully Asynchronous (One-shot) |
| **Key Controller** | `PostController@process` | `ScriptController@generate` |
| **Background Job** | Partially (Analysis is fast) | `GenerateScriptJob` |
| **Credit Logic** | Pay-per-Analysis / Pay-per-Transcription | Pay-per-Generation (Credits) |
| **Final Result** | Refined Script at `/videos/{id}/refine` | New Script Record in User Library |

## Strategic Differences

### Script Regeneration (The "Viral Blueprint" Path)
- **Goal:** To reverse-engineer why a specific video went viral and use its DNA (Hook strategies, Emotional Arcs, etc.) for a new version.
- **Workflow:** Strictly linear. You cannot "Refine" until you've "Analyzed," and you cannot "Analyze" until you've "Transcribed."
- **Use Case:** "I saw this viral video, I want to make exactly this but for my brand."

### Fresh Script Generation (The "Creative Hub" Path)
- **Goal:** To generate high-quality, high-engagement scripts from an idea or topic without needing a reference video.
- **Workflow:** One-shot generation. The user provides parameters (Tone, Audience, Length), and the system handles the rest in the background.
- **Use Case:** "I need a fresh idea for a TikTok about [Topic] with a [Savage] tone."

## Unified Component: The Polling System
Both flows leverage the `useScriptPolling` hook to ensure the UI stays updated without manual refreshes:
- **Regeneration:** Polls for the completion of Transcription or Analysis steps.
- **Fresh Generation:** Polls for the `status` of the `GeneratedScript` record to change from `processing` to `completed`.
