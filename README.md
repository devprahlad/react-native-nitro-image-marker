# react-native-nitro-image-marker

High-performance image watermarking for React Native, built with Nitro. Add text or image overlays (stamps, logos, timestamps, receipts) to photos and export as files or base64.

[![Version](https://img.shields.io/npm/v/react-native-nitro-image-marker.svg)](https://www.npmjs.com/package/react-native-nitro-image-marker)
[![Downloads](https://img.shields.io/npm/dm/react-native-nitro-image-marker.svg)](https://www.npmjs.com/package/react-native-nitro-image-marker)
[![License](https://img.shields.io/npm/l/react-native-nitro-image-marker.svg)](https://github.com/patrickkabwe/react-native-nitro-image-marker/LICENSE)

## Features

- Text and image watermarks
- Multiple overlays per image
- PNG/JPG output or base64
- Works with React Native CLI and Expo (dev client)

## Requirements

- React Native v0.76.0 or higher
- Node 18.0.0 or higher

> [!IMPORTANT]
> To support Nitro Views you need React Native v0.78.0 or higher.

## Installation

```bash
npm install react-native-nitro-image-marker react-native-nitro-modules
```

## Quick start

```ts
import {ImageFormat, Position, markText} from 'react-native-nitro-image-marker'

const output = markText({
  backgroundImage: {image: photoUri},
  watermarkTexts: [
    {text: 'Sample', position: {position: Position.bottomRight, X: 16, Y: 16}},
  ],
  saveFormat: ImageFormat.png,
})
```

## Real use case

Example: a delivery app stamps proof-of-delivery photos with the order ID and timestamp, plus a brand logo.

```ts
import {ImageFormat, Position, TextAlign, TextBackgroundType, markImage} from 'react-native-nitro-image-marker'

const output = markImage({
  backgroundImage: {image: photoUri},
  watermarkImages: [
    {
      src: logoUri,
      position: {position: Position.topLeft, X: 16, Y: 16},
      scale: 0.2,
      alpha: 0.9,
    },
  ],
  watermarkTexts: [
    {
      text: `Order #${orderId}`,
      position: {position: Position.bottomLeft, X: 16, Y: 16},
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

## Usage

```ts
import {
  ImageFormat,
  Position,
  TextAlign,
  TextBackgroundType,
  markText,
  markImage,
} from 'react-native-nitro-image-marker'
```

### Method: `markText`

**Use when you only need text overlays.** Returns a string that is either a file path or base64 (depending on `saveFormat`).

```ts
const filePath = markText({
  backgroundImage: {image: photoUri},
  watermarkTexts: [
    {
      text: 'CONFIDENTIAL',
      position: {position: Position.center},
      style: {
        color: '#FFFFFF',
        fontSize: 32,
        textAlign: TextAlign.center,
        bold: true,
        rotate: -25,
        textBackgroundStyle: {
          type: TextBackgroundType.stretchX,
          color: '#00000088',
          paddingHorizontal: 20,
          paddingVertical: 10,
        },
      },
    },
  ],
  saveFormat: ImageFormat.png,
})
```

### Method: `markImage`

**Use when you need image overlays** (and optional text). Returns a string that is either a file path or base64.

```ts
const filePath = markImage({
  backgroundImage: {image: photoUri},
  watermarkImages: [
    {
      src: logoUri,
      position: {position: Position.bottomRight, X: 16, Y: 16},
      scale: 0.25,
      alpha: 0.8,
    },
  ],
  saveFormat: ImageFormat.png,
})
```

## Examples for each method

### `markText` examples

Text with custom background and shadow:

```ts
const filePath = markText({
  backgroundImage: {image: photoUri},
  watermarkTexts: [
    {
      text: 'Paid',
      position: {position: Position.topRight, X: 16, Y: 16},
      style: {
        color: '#FFFFFF',
        fontSize: 24,
        bold: true,
        shadow: {shadowRadius: 6, shadowDx: 0, shadowDy: 3, shadowColor: '#000000AA'},
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

Multiple text overlays with different positions:

```ts
const filePath = markText({
  backgroundImage: {image: photoUri, scale: 1},
  watermarkTexts: [
    {
      text: 'Order #5521',
      position: {position: Position.bottomLeft, X: 16, Y: 16},
      style: {color: '#FFFFFF', fontSize: 18, bold: true},
    },
    {
      text: new Date().toLocaleString(),
      position: {position: Position.bottomRight, X: 16, Y: 16},
      style: {color: '#FFFFFF', fontSize: 16, textAlign: TextAlign.right},
    },
  ],
  saveFormat: ImageFormat.png,
})
```

Base64 output (for upload):

```ts
const base64 = markText({
  backgroundImage: {image: photoUri},
  watermarkTexts: [{text: 'Sample', position: {position: Position.center}}],
  saveFormat: ImageFormat.base64,
})
```

### `markImage` examples

Image watermark only:

```ts
const filePath = markImage({
  backgroundImage: {image: photoUri},
  watermarkImages: [
    {
      src: logoUri,
      position: {position: Position.topLeft, X: 24, Y: 24},
      scale: 0.2,
      alpha: 0.9,
    },
  ],
  saveFormat: ImageFormat.jpg,
  quality: 0.85,
})
```

Image watermark + text overlay:

```ts
const filePath = markImage({
  backgroundImage: {image: photoUri},
  watermarkImages: [
    {
      src: logoUri,
      position: {position: Position.bottomRight, X: 12, Y: 12},
      scale: 0.25,
      alpha: 0.8,
    },
  ],
  watermarkTexts: [
    {
      text: 'Demo',
      position: {position: Position.topCenter, Y: 20},
      style: {color: '#FFFFFF', fontSize: 20, bold: true},
    },
  ],
  saveFormat: ImageFormat.png,
})
```

## Example apps

- React Native CLI: `example/`
- Expo (dev client): `expo-example/`

## Saving helpers

### React Native CLI (CameraRoll)

```ts
import {CameraRoll} from '@react-native-camera-roll/camera-roll'

const saveToGallery = async (path: string) => {
  const uri = path.startsWith('file://') ? path : `file://${path}`
  await CameraRoll.saveAsset(uri, {type: 'photo'})
}
```

### Expo (MediaLibrary)

```ts
import * as MediaLibrary from 'expo-media-library'

const saveToGallery = async (path: string) => {
  const uri = path.startsWith('file://') ? path : `file://${path}`
  const perm = await MediaLibrary.requestPermissionsAsync()
  if (!perm.granted) return
  await MediaLibrary.saveToLibraryAsync(uri)
}
```

## API reference

### API table

| Category | Name | Description |
| --- | --- | --- |
| Method | `markText(options)` | Add text watermark(s) to an image. Returns file path or base64. |
| Method | `markImage(options)` | Add image watermark(s) and optional text. Returns file path or base64. |
| Enum | `Position` | Anchor positions: `topLeft`, `topCenter`, `topRight`, `center`, `bottomLeft`, `bottomCenter`, `bottomRight`. |
| Enum | `TextAlign` | Text alignment: `left`, `center`, `right`. |
| Enum | `TextBackgroundType` | Background modes: `none`, `stretchX`, `stretchY`, `cornerRadius`. |
| Enum | `ImageFormat` | Output: `jpg`, `png`, `base64`. |

### Exports

- `markText(options)`
- `markImage(options)`
- Enums: `Position`, `TextAlign`, `TextBackgroundType`, `ImageFormat`

### Return value

Both methods return a `string`:

- `ImageFormat.jpg` or `ImageFormat.png` → file path
- `ImageFormat.base64` → base64 string (no file written)

### Common options

#### `ImageOptions`

- `image` (string | ImageSourcePropType) — local file path, `file://` URI, or bundled asset
- `scale` (number) — scales the image before drawing
- `rotate` (number) — degrees
- `alpha` (number) — 0..1
- `quality` (number) — 0..1 (applies to jpg)

#### `PositionOptions`

- `position` — enum `Position.*`
- `X`, `Y` — numbers or strings (offsets in px)

#### `TextStyle`

- `color`, `fontName`, `fontSize`, `bold`, `italic`, `underline`, `strikeThrough`
- `textAlign` — enum `TextAlign.*`
- `rotate` — degrees
- `shadow` / `shadowStyle`
- `textBackgroundStyle` — uses `TextBackgroundType.*`

#### `TextBackgroundStyle`

- `type`, `color`
- `cornerRadius`, `cornerRadiusAll`
- `padding`, `paddingLeft`, `paddingTop`, `paddingRight`, `paddingBottom`
- `paddingHorizontal`, `paddingVertical`

#### `ShadowLayerStyle`

- `shadowRadius`, `shadowDx`, `shadowDy`, `shadowColor`

### `markText` options

```ts
markText({
  backgroundImage: ImageOptions,
  watermarkTexts: TextOptions[],
  quality?: number,
  filename?: string,
  saveFormat?: ImageFormat,
  maxSize?: number,
})
```

### `markImage` options

```ts
markImage({
  backgroundImage: ImageOptions,
  watermarkImages: WatermarkImageOptions[],
  watermarkTexts?: TextOptions[],
  quality?: number,
  filename?: string,
  saveFormat?: ImageFormat,
  maxSize?: number,
})
```

### Full option table

| Type | Property | Description |
| --- | --- | --- |
| `ImageOptions` | `image` | Local file path, `file://` URI, or bundled asset. |
| `ImageOptions` | `scale` | Scale factor for the background image. |
| `ImageOptions` | `rotate` | Rotation in degrees. |
| `ImageOptions` | `alpha` | Opacity 0..1. |
| `ImageOptions` | `quality` | JPG quality 0..1. |
| `PositionOptions` | `position` | Anchor via `Position.*`. |
| `PositionOptions` | `X` | Horizontal offset (px). |
| `PositionOptions` | `Y` | Vertical offset (px). |
| `TextStyle` | `color` | Text color (hex). |
| `TextStyle` | `fontName` | Font family name. |
| `TextStyle` | `fontSize` | Size in px. |
| `TextStyle` | `bold` | Bold text. |
| `TextStyle` | `italic` | Italic text. |
| `TextStyle` | `underline` | Underline. |
| `TextStyle` | `strikeThrough` | Strikethrough. |
| `TextStyle` | `textAlign` | `TextAlign.*`. |
| `TextStyle` | `rotate` | Rotation in degrees. |
| `TextStyle` | `skewX` | Skew in degrees. |
| `TextStyle` | `shadow` | Shadow settings. |
| `TextStyle` | `shadowStyle` | Shadow settings (alias). |
| `TextStyle` | `textBackgroundStyle` | Background style settings. |
| `TextBackgroundStyle` | `type` | `TextBackgroundType.*`. |
| `TextBackgroundStyle` | `color` | Background color (hex). |
| `TextBackgroundStyle` | `cornerRadius` | Per-corner radii. |
| `TextBackgroundStyle` | `cornerRadiusAll` | Uniform corner radius. |
| `TextBackgroundStyle` | `padding` | All sides padding. |
| `TextBackgroundStyle` | `paddingLeft` | Left padding. |
| `TextBackgroundStyle` | `paddingTop` | Top padding. |
| `TextBackgroundStyle` | `paddingRight` | Right padding. |
| `TextBackgroundStyle` | `paddingBottom` | Bottom padding. |
| `TextBackgroundStyle` | `paddingHorizontal` | Horizontal padding. |
| `TextBackgroundStyle` | `paddingVertical` | Vertical padding. |
| `ShadowLayerStyle` | `shadowRadius` | Blur radius. |
| `ShadowLayerStyle` | `shadowDx` | X offset. |
| `ShadowLayerStyle` | `shadowDy` | Y offset. |
| `ShadowLayerStyle` | `shadowColor` | Shadow color (hex). |
| `TextOptions` | `text` | Text content. |
| `TextOptions` | `position` | `PositionOptions`. |
| `TextOptions` | `style` | `TextStyle`. |
| `WatermarkImageOptions` | `src` | Watermark image source. |
| `WatermarkImageOptions` | `position` | `PositionOptions`. |
| `WatermarkImageOptions` | `scale` | Scale factor for watermark. |
| `WatermarkImageOptions` | `rotate` | Rotation in degrees. |
| `WatermarkImageOptions` | `alpha` | Opacity 0..1. |
| `TextMarkOptions` | `backgroundImage` | `ImageOptions`. |
| `TextMarkOptions` | `watermarkTexts` | `TextOptions[]`. |
| `TextMarkOptions` | `quality` | JPG quality 0..1. |
| `TextMarkOptions` | `filename` | Output filename (no extension). |
| `TextMarkOptions` | `saveFormat` | `ImageFormat.*`. |
| `TextMarkOptions` | `maxSize` | Max size of longest edge (px). |
| `ImageMarkOptions` | `backgroundImage` | `ImageOptions`. |
| `ImageMarkOptions` | `watermarkImages` | `WatermarkImageOptions[]`. |
| `ImageMarkOptions` | `watermarkTexts` | `TextOptions[]`. |
| `ImageMarkOptions` | `quality` | JPG quality 0..1. |
| `ImageMarkOptions` | `filename` | Output filename (no extension). |
| `ImageMarkOptions` | `saveFormat` | `ImageFormat.*`. |
| `ImageMarkOptions` | `maxSize` | Max size of longest edge (px). |

## Expo (dev client)

This package requires native code, so **Expo Go is not supported**. Use prebuild + dev client.

```bash
cd expo-example
npm install
npx expo install react-native expo-image-picker expo-media-library
npx expo prebuild --clean
npx expo run:android
# or
npx expo run:ios
```

Example usage in Expo:

```ts
import * as ImagePicker from 'expo-image-picker'
import * as MediaLibrary from 'expo-media-library'
import {markText, ImageFormat, Position} from 'react-native-nitro-image-marker'

const pickAndMark = async () => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  })

  if (result.canceled) return
  const uri = result.assets?.[0]?.uri
  if (!uri) return

  const filePath = markText({
    backgroundImage: {image: uri},
    watermarkTexts: [{text: 'Expo', position: {position: Position.center}}],
    saveFormat: ImageFormat.png,
  })

  const normalized = filePath.startsWith('file://') ? filePath : `file://${filePath}`
  const savePerm = await MediaLibrary.requestPermissionsAsync()
  if (savePerm.granted) {
    await MediaLibrary.saveToLibraryAsync(normalized)
  }
}
```

## Notes

- Images must be local file paths/URIs or base64 strings. Remote URLs should be downloaded first.
- The return value is a file path for PNG/JPG; add `file://` if a library expects it.
- The library only renders the watermark. Saving to the device or gallery is up to you.
- For Android 13+, request `READ_MEDIA_IMAGES` for reading gallery images. For earlier versions, use `READ_EXTERNAL_STORAGE`.
- For iOS saving, add `NSPhotoLibraryAddUsageDescription` to `Info.plist` when you write to the photo library.

## Performance tips

- Prefer JPG for large photos and tune `quality` (e.g. 0.7–0.9) to reduce output size.
- Use `maxSize` to limit the longest edge and prevent memory pressure on large images.
- If you only need smaller output, set `backgroundImage.scale` (e.g. 0.5) before watermarking.
- Avoid too many overlays on very large images; render multiple watermarks in a single call instead of looping.

## Troubleshooting

- **“Unable to load image”**: ensure the input is a local file path/URI or base64 string. Remote URLs must be downloaded first.
- **“Unable to resolve image source”**: when passing bundled assets, use `require()` directly (e.g. `{image: require('./asset.png')}`).
- **Result not visible in gallery**: make sure you’re saving the file with a library like CameraRoll/MediaLibrary and that permissions are granted.
- **Incorrect positioning**: `X` and `Y` are offsets in pixels; use `position` for anchors and `X`/`Y` for fine tuning.
- **Large images are slow**: use `maxSize` or `backgroundImage.scale` to reduce processing time and memory.

## Credits

Bootstrapped with [create-nitro-module](https://github.com/patrickkabwe/create-nitro-module).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
