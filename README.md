# react-native-nitro-image-marker

High-performance image watermarking for React Native, built with [Nitro Modules](https://nitro.margelo.com). Add text or image overlays, apply filters, crop, blur regions, tile watermarks, and batch process images — all natively on iOS and Android.

[![Version](https://img.shields.io/npm/v/react-native-nitro-image-marker.svg)](https://www.npmjs.com/package/react-native-nitro-image-marker)
[![Downloads](https://img.shields.io/npm/dm/react-native-nitro-image-marker.svg)](https://www.npmjs.com/package/react-native-nitro-image-marker)
[![License](https://img.shields.io/npm/l/react-native-nitro-image-marker.svg)](https://github.com/patrickkabwe/react-native-nitro-image-marker/LICENSE)

## Features

- **Text watermarks** — color, font, size, bold, italic, underline, shadow, background, rotation, alpha, maxWidth
- **Image watermarks** — overlay logos/stamps with position, scale, rotation, alpha
- **Combined watermarks** — text + image overlays in a single call
- **Tile watermarks** — repeating diagonal text or image patterns across the entire image
- **Crop** — extract a rectangular region before watermarking
- **Image filters** — brightness, contrast, grayscale
- **Blur regions** — blur specific rectangular areas (faces, sensitive info)
- **Batch processing** — process multiple images in one native call
- **URL image loading** — load images from remote URLs (http/https)
- **Output formats** — PNG, JPG, or base64
- **Works with** React Native CLI and Expo (dev client)

## Requirements

- React Native v0.76.0 or higher
- react-native-nitro-modules v0.35.2 or higher
- Node 18.0.0 or higher

## Installation

```bash
npm install react-native-nitro-image-marker react-native-nitro-modules
```

For iOS:
```bash
cd ios && pod install
```

## Quick Start

```ts
import { markText, ImageFormat, Position } from 'react-native-nitro-image-marker'

const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [
    {
      text: 'Sample',
      position: { position: Position.bottomRight, X: 16, Y: 16 },
    },
  ],
  saveFormat: ImageFormat.png,
})
```

> **Note:** All methods return `Promise<string>` — use `await` or `.then()`.

## Methods

### `markText(options): Promise<string>`

Add text watermark(s) to an image.

```ts
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [
    {
      text: 'CONFIDENTIAL',
      position: { position: Position.center },
      style: {
        color: '#FF0000',
        fontSize: 32,
        bold: true,
        rotate: -25,
        alpha: 0.5,
      },
    },
  ],
  saveFormat: ImageFormat.png,
})
```

### `markImage(options): Promise<string>`

Add image watermark(s) and optional text to an image.

```ts
const filePath = await markImage({
  backgroundImage: { image: photoUri },
  watermarkImages: [
    {
      src: logoUri,
      position: { position: Position.bottomRight, X: 16, Y: 16 },
      scale: 0.25,
      alpha: 0.8,
    },
  ],
  watermarkTexts: [
    {
      text: 'Brand',
      position: { position: Position.topCenter, Y: 20 },
      style: { color: '#FFFFFF', fontSize: 20, bold: true },
    },
  ],
  saveFormat: ImageFormat.png,
})
```

### `markTextBatch(optionsArray): Promise<string[]>`

Process multiple text watermark operations in a single native call.

```ts
const filePaths = await markTextBatch([
  {
    backgroundImage: { image: photo1Uri },
    watermarkTexts: [{ text: 'Photo 1', position: { position: Position.bottomLeft, X: 16, Y: 16 } }],
    saveFormat: ImageFormat.jpg,
  },
  {
    backgroundImage: { image: photo2Uri },
    watermarkTexts: [{ text: 'Photo 2', position: { position: Position.bottomLeft, X: 16, Y: 16 } }],
    saveFormat: ImageFormat.jpg,
  },
])
```

### `markImageBatch(optionsArray): Promise<string[]>`

Process multiple image watermark operations in a single native call.

```ts
const filePaths = await markImageBatch([
  {
    backgroundImage: { image: photo1Uri },
    watermarkImages: [{ src: logoUri, position: { position: Position.topLeft, X: 16, Y: 16 }, scale: 0.2 }],
    saveFormat: ImageFormat.png,
  },
  // ...more items
])
```

## Feature Examples

### Tile Watermark

Repeating diagonal watermark across the entire image — great for "DRAFT" or "CONFIDENTIAL" stamps.

```ts
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [],
  tile: {
    tileText: {
      text: 'DRAFT',
      style: { color: '#FF000033', fontSize: 24, bold: true },
    },
    spacing: 120,
    angle: -30,
  },
  saveFormat: ImageFormat.png,
})
```

You can also tile with an image:

```ts
const filePath = await markImage({
  backgroundImage: { image: photoUri },
  watermarkImages: [],
  tile: {
    tileImage: {
      src: logoUri,
      scale: 0.1,
      alpha: 0.3,
    },
    spacing: 200,
    angle: -30,
  },
  saveFormat: ImageFormat.png,
})
```

### Crop

Extract a rectangular region from the image.

```ts
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [
    { text: 'Cropped', position: { position: Position.bottomRight, X: 8, Y: 8 } },
  ],
  crop: { x: 100, y: 100, width: 400, height: 300 },
  saveFormat: ImageFormat.jpg,
})
```

### Image Filters

Apply brightness, contrast, or grayscale adjustments.

```ts
// Grayscale
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [{ text: 'B&W', position: { position: Position.center } }],
  filter: { grayscale: true },
  saveFormat: ImageFormat.jpg,
})

// Brightness + Contrast
const filePath2 = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [{ text: 'Enhanced', position: { position: Position.center } }],
  filter: { brightness: 0.2, contrast: 1.3 },
  saveFormat: ImageFormat.jpg,
})
```

### Blur Regions

Blur specific areas of an image — ideal for hiding sensitive information.

```ts
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [
    { text: 'Redacted', position: { position: Position.topLeft, X: 16, Y: 16 } },
  ],
  blurRegions: [
    { x: 50, y: 200, width: 300, height: 100, blurRadius: 25 },
  ],
  saveFormat: ImageFormat.jpg,
})
```

### Text with Alpha and MaxWidth

```ts
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [
    {
      text: 'This is a long text that will wrap within the specified maxWidth',
      position: { position: Position.center },
      style: {
        color: '#FFFFFF',
        fontSize: 18,
        alpha: 0.6,
        maxWidth: 300,
      },
    },
  ],
  saveFormat: ImageFormat.png,
})
```

### Text with Background and Shadow

```ts
const filePath = await markText({
  backgroundImage: { image: photoUri },
  watermarkTexts: [
    {
      text: 'Paid',
      position: { position: Position.topRight, X: 16, Y: 16 },
      style: {
        color: '#FFFFFF',
        fontSize: 24,
        bold: true,
        shadow: { shadowRadius: 6, shadowDx: 0, shadowDy: 3, shadowColor: '#000000AA' },
        textBackgroundStyle: {
          type: TextBackgroundType.cornerRadius,
          color: '#1E9D5A',
          paddingHorizontal: 12,
          paddingVertical: 6,
          cornerRadiusAll: 8,
        },
      },
    },
  ],
  saveFormat: ImageFormat.jpg,
  quality: 0.9,
})
```

### URL Image Loading

Load images directly from URLs:

```ts
const filePath = await markImage({
  backgroundImage: { image: 'https://example.com/photo.jpg' },
  watermarkImages: [
    {
      src: 'https://example.com/logo.png',
      position: { position: Position.topLeft, X: 16, Y: 16 },
      scale: 0.2,
    },
  ],
  saveFormat: ImageFormat.png,
})
```

## Real-World Use Case

A delivery app stamps proof-of-delivery photos with the order ID, timestamp, and brand logo:

```ts
import { markImage, ImageFormat, Position, TextAlign, TextBackgroundType } from 'react-native-nitro-image-marker'

const output = await markImage({
  backgroundImage: { image: photoUri },
  watermarkImages: [
    {
      src: logoUri,
      position: { position: Position.topLeft, X: 16, Y: 16 },
      scale: 0.2,
      alpha: 0.9,
    },
  ],
  watermarkTexts: [
    {
      text: `Order #${orderId}`,
      position: { position: Position.bottomLeft, X: 16, Y: 16 },
      style: {
        color: '#FFFFFF',
        fontSize: 22,
        textAlign: TextAlign.left,
        bold: true,
        textBackgroundStyle: {
          type: TextBackgroundType.cornerRadius,
          color: '#00000099',
          paddingHorizontal: 12,
          paddingVertical: 8,
          cornerRadiusAll: 10,
        },
      },
    },
  ],
  saveFormat: ImageFormat.jpg,
  quality: 0.9,
})
```

## Example Apps

- **Expo (dev client):** `expo-example/` — demos all features with modern UI
- **React Native CLI:** `example/`

```bash
# Expo example
cd expo-example
npm install
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

## API Reference

### Methods

| Method | Description |
| --- | --- |
| `markText(options)` | Add text watermark(s). Returns `Promise<string>` (file path or base64). |
| `markImage(options)` | Add image + optional text watermark(s). Returns `Promise<string>`. |
| `markTextBatch(options[])` | Batch text watermark processing. Returns `Promise<string[]>`. |
| `markImageBatch(options[])` | Batch image watermark processing. Returns `Promise<string[]>`. |

### Enums

| Enum | Values |
| --- | --- |
| `Position` | `topLeft`, `topCenter`, `topRight`, `center`, `bottomLeft`, `bottomCenter`, `bottomRight` |
| `TextAlign` | `left`, `center`, `right` |
| `TextBackgroundType` | `none`, `stretchX`, `stretchY`, `cornerRadius` |
| `ImageFormat` | `jpg`, `png`, `base64` |

### `TextMarkOptions`

| Property | Type | Description |
| --- | --- | --- |
| `backgroundImage` | `ImageOptions` | **Required.** Source image. |
| `watermarkTexts` | `TextOptions[]` | **Required.** Text overlays. |
| `quality` | `number` | JPG quality 0–1. |
| `filename` | `string` | Output filename (no extension). |
| `saveFormat` | `ImageFormat` | Output format. |
| `maxSize` | `number` | Max longest edge in px. |
| `crop` | `CropOptions` | Crop region before watermarking. |
| `filter` | `FilterOptions` | Image filter adjustments. |
| `blurRegions` | `BlurRegion[]` | Rectangular areas to blur. |
| `tile` | `TileOptions` | Repeating tile watermark. |

### `ImageMarkOptions`

Same as `TextMarkOptions` plus:

| Property | Type | Description |
| --- | --- | --- |
| `watermarkImages` | `WatermarkImageOptions[]` | **Required.** Image overlays. |
| `watermarkTexts` | `TextOptions[]` | Optional text overlays. |

### `ImageOptions`

| Property | Type | Description |
| --- | --- | --- |
| `image` | `string \| ImageSourcePropType` | Local path, `file://` URI, `http(s)://` URL, or bundled asset. |
| `scale` | `number` | Scale factor. |
| `rotate` | `number` | Degrees. |
| `alpha` | `number` | Opacity 0–1. |
| `quality` | `number` | JPG quality 0–1. |

### `TextOptions`

| Property | Type | Description |
| --- | --- | --- |
| `text` | `string` | **Required.** Text content. |
| `position` | `PositionOptions` | Position and offset. |
| `style` | `TextStyle` | Styling options. |

### `TextStyle`

| Property | Type | Description |
| --- | --- | --- |
| `color` | `string` | Text color (hex). |
| `fontName` | `string` | Font family name. |
| `fontSize` | `number` | Size in px. |
| `bold` | `boolean` | Bold text. |
| `italic` | `boolean` | Italic text. |
| `underline` | `boolean` | Underline. |
| `strikeThrough` | `boolean` | Strikethrough. |
| `textAlign` | `TextAlign` | Text alignment. |
| `rotate` | `number` | Degrees. |
| `skewX` | `number` | Skew in degrees. |
| `alpha` | `number` | Text opacity 0–1. |
| `maxWidth` | `number` | Max text width in px (enables wrapping). |
| `shadow` | `ShadowLayerStyle` | Shadow settings. |
| `shadowStyle` | `ShadowLayerStyle` | Shadow settings (alias). |
| `backgroundColor` | `string` | Simple background color. |
| `textBackgroundStyle` | `TextBackgroundStyle` | Advanced background style. |
| `strokeColor` | `string` | Text stroke color. |
| `strokeWidth` | `number` | Text stroke width. |

### `TextBackgroundStyle`

| Property | Type | Description |
| --- | --- | --- |
| `type` | `TextBackgroundType` | Background mode. |
| `color` | `string` | Background color (hex). |
| `cornerRadius` | `RadiusValue` | Per-corner radii `{ topLeft, topRight, bottomLeft, bottomRight }`. |
| `cornerRadiusAll` | `number` | Uniform corner radius. |
| `padding` | `Dimension` | All sides. |
| `paddingLeft` | `Dimension` | Left padding. |
| `paddingTop` | `Dimension` | Top padding. |
| `paddingRight` | `Dimension` | Right padding. |
| `paddingBottom` | `Dimension` | Bottom padding. |
| `paddingHorizontal` | `Dimension` | Left + right. |
| `paddingVertical` | `Dimension` | Top + bottom. |

### `ShadowLayerStyle`

| Property | Type | Description |
| --- | --- | --- |
| `shadowRadius` | `number` | Blur radius. |
| `shadowDx` | `number` | X offset. |
| `shadowDy` | `number` | Y offset. |
| `shadowColor` | `string` | Shadow color (hex). |

### `WatermarkImageOptions`

| Property | Type | Description |
| --- | --- | --- |
| `src` | `ImageSource` | Watermark image (local path, URL, or bundled asset). |
| `position` | `PositionOptions` | Position and offset. |
| `scale` | `number` | Scale factor. |
| `rotate` | `number` | Degrees. |
| `alpha` | `number` | Opacity 0–1. |

### `PositionOptions`

| Property | Type | Description |
| --- | --- | --- |
| `position` | `Position` | Anchor position. |
| `X` | `Dimension` | Horizontal offset (px). |
| `Y` | `Dimension` | Vertical offset (px). |

### `CropOptions`

| Property | Type | Description |
| --- | --- | --- |
| `x` | `number` | **Required.** X origin. |
| `y` | `number` | **Required.** Y origin. |
| `width` | `number` | **Required.** Crop width. |
| `height` | `number` | **Required.** Crop height. |

### `FilterOptions`

| Property | Type | Description |
| --- | --- | --- |
| `brightness` | `number` | Brightness adjustment (-1 to 1). |
| `contrast` | `number` | Contrast multiplier (0.5 to 2.0). |
| `grayscale` | `boolean` | Convert to grayscale. |

### `BlurRegion`

| Property | Type | Description |
| --- | --- | --- |
| `x` | `number` | **Required.** X origin. |
| `y` | `number` | **Required.** Y origin. |
| `width` | `number` | **Required.** Region width. |
| `height` | `number` | **Required.** Region height. |
| `blurRadius` | `number` | Blur intensity (default: 10). |

### `TileOptions`

| Property | Type | Description |
| --- | --- | --- |
| `tileText` | `TextOptions` | Text to tile across the image. |
| `tileImage` | `WatermarkImageOptions` | Image to tile across the image. |
| `spacing` | `number` | Space between tiles in px. |
| `angle` | `number` | Tile rotation angle in degrees. |

### Return Value

All methods return a `Promise<string>` (or `Promise<string[]>` for batch):

- `ImageFormat.jpg` or `ImageFormat.png` → file path
- `ImageFormat.base64` → base64 string (no file written)

## Saving to Gallery

The library only renders watermarks. Saving to device gallery is up to you:

### CameraRoll (React Native CLI)

```ts
import { CameraRoll } from '@react-native-camera-roll/camera-roll'

const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`
await CameraRoll.saveAsset(uri, { type: 'photo' })
```

### MediaLibrary (Expo)

```ts
import * as MediaLibrary from 'expo-media-library'

const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`
const { granted } = await MediaLibrary.requestPermissionsAsync()
if (granted) await MediaLibrary.saveToLibraryAsync(uri)
```

## Expo (Dev Client)

This package requires native code — **Expo Go is not supported**. Use prebuild + dev client.

```bash
npx expo install react-native-nitro-image-marker react-native-nitro-modules
npx expo prebuild --clean
npx expo run:ios  # or run:android
```

## Performance Tips

- Prefer JPG for large photos and tune `quality` (0.7–0.9) to reduce output size.
- Use `maxSize` to limit the longest edge and prevent memory pressure.
- Set `backgroundImage.scale` (e.g. 0.5) for smaller output.
- Use batch methods (`markTextBatch`/`markImageBatch`) when processing multiple images.
- Avoid too many overlays on very large images; render multiple watermarks in a single call.

## Troubleshooting

- **"Unable to load image"**: ensure the input is a local file path/URI, URL, or base64 string.
- **"Unable to resolve image source"**: when passing bundled assets, use `require()` directly (e.g. `{ image: require('./asset.png') }`).
- **Result not visible in gallery**: save the file with CameraRoll/MediaLibrary and ensure permissions are granted.
- **Incorrect positioning**: `X` and `Y` are offsets in pixels; use `position` for anchors and `X`/`Y` for fine tuning.
- **Large images are slow**: use `maxSize` or `backgroundImage.scale` to reduce processing time.
- **Blur region not visible**: ensure coordinates are within the image bounds and `blurRadius` > 0.

## Notes

- Images can be local file paths, `file://` URIs, `http(s)://` URLs, base64 strings, or bundled assets via `require()`.
- The return value is a file path for PNG/JPG; prefix with `file://` if a library expects it.
- For Android 13+, request `READ_MEDIA_IMAGES` for reading gallery images.
- For iOS saving, add `NSPhotoLibraryAddUsageDescription` to `Info.plist`.

## Credits

Bootstrapped with [create-nitro-module](https://github.com/patrickkabwe/create-nitro-module).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
