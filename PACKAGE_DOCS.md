# react-native-nitro-image-marker – Package Notes

This document describes the **package internals only** (not the example apps).

## Layout

- `src/specs/nitro-image-marker.nitro.ts` – Nitro spec (types + method signatures). Source of truth for codegen.
- `src/index.ts` – JS/TS public API. Normalizes inputs (image sources, dimensions) and calls Nitro.
- `ios/HybridNitroImageMarker.swift` – iOS implementation (UIKit drawing, text/image overlays, save/base64).
- `android/src/main/java/com/nitroimagemarker/HybridNitroImageMarker.kt` – Android implementation (Canvas/Bitmap drawing, text/image overlays, save/base64).
- `nitro.json` – Nitro module configuration + autolinking config.
- `nitrogen/generated/*` – Generated bindings for C++/Swift/Kotlin. **Do not edit**; regenerated via codegen.
- `android/` – Android module wiring (Gradle, CMake, package).
- `ios/` – iOS module wiring (podspec, bridge headers).

## Codegen & Build

- Update the spec in `src/specs/*` → run codegen:
  ```bash
  npm run codegen
  ```
- This regenerates `nitrogen/generated` and rebuilds `lib/*` outputs.

## Public API (JS)

- `markText(options)`
- `markImage(options)`
- Enums exported: `Position`, `TextAlign`, `TextBackgroundType`, `ImageFormat`.

## Notes

- `nitrogen/generated` is derived from the spec; fix the spec if you see errors.
- Native implementations are platform-specific but aim to match the same options.
