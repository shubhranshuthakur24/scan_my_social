# Third-Party Software Attribution: Gemini Watermark Remover

This project incorporates portions of the open-source project `gemini-watermark-remover`.

- **Upstream Repository**: https://github.com/GargantuaX/gemini-watermark-remover
- **Upstream Git Commit**: `e9ba84d8e5465928d4b9343a1fe121d0cae0e3da` (Release `v1.0.43`)
- **License**: MIT License
- **Copyright**: (c) 2026 GargantuaX

## Vendored Core Modules (`src/lib/watermark/core/`)

The following files were adapted and vendored from the upstream repository to power local browser reverse-alpha video and image cleanup:

1. `videoExport.js`: Video demuxing, frame extraction, unblending orchestration, and MP4 muxing via `mediabunny`.
2. `videoWatermarkDetector.js`: Multi-frame keyframe sampler and candidate watermark correlation detector.
3. `veoTextWatermarkDetector.js`: Veo text watermark correlation engine.
4. `veoTextWatermarkTemplates.js`: Pre-calibrated base64 text template masks for Veo video models.
5. `videoCleanupBackends.js`: Canvas temporal delta stabilization and edge bilateral smoothing.
6. `videoWatermarkCatalog.js`: Aspect ratio and resolution anchor margin catalog.
7. `videoMetadata.js`: Decoded stream resolution, duration, and framerate resolver.
8. `videoDenoiseRuntimePolicy.js`: Watermark size profile resolver.
9. `blendModes.js`: Mathematical reverse-alpha restoration formula: $(P - \alpha \cdot 255) / (1 - \alpha)$.
10. `embeddedAlphaMaps.js`: Calibrated base64 floating-point alpha transparency masks for Gemini logos.
11. `embeddedOutlineAlphaMap.js`: Signed alpha profile for light outline watermark variants.
12. `embeddedDarkOutlineAlphaMap.js`: Signed alpha profile for dark outline watermark variants.
13. `adaptiveDetector.js`: Normalized spatial and gradient Pearson correlation engine.
14. `geminiSizeCatalog.js`: Standard watermark dimensions by resolution tier for images and videos.
15. `allenkFdncnnDenoise.js`: ROI coordinate padding and Gaussian kernel math.
16. `imageData.js`: Pure browser ImageData extraction and unblending orchestration for images.
17. `watermarkProcessor.js`: Multi-candidate gradient/spatial evaluation, subpixel refinement, and alpha repair for still images.
18. `imageWatermarkPipeline.js`: Hypothesis exploration, candidate scoring, and quality ranking pipeline.
19. `watermarkEngine.js`: Coordinated multi-resolution alpha map cache and runtime canvas context manager.

## Local Modifications & Rationale

- **Node.js Removal**: Removed all Node built-in imports (`node:fs`, `node:http`) and Playwright automation wrappers so the engine runs exclusively inside standard browser Web Workers.
- **Zero ONNX / Model Downloads**: External 25+ MB ONNX neural model network requests were disabled by defaulting to pure JavaScript and 2D canvas pixel manipulation.
- **Strict Detection Gate**: Enforced strict detection confidence gating ($\tau \ge 0.18$) with no bypass to prevent accidental degradation of unwatermarked video and image content.
- **Format-Preserving Image Export**: Decoded images are exported matching their source format (PNG, JPEG at 0.98 quality, WebP) directly through browser Canvas/Blob APIs.

---

## MIT License Text

MIT License

Copyright (c) 2026 GargantuaX

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
