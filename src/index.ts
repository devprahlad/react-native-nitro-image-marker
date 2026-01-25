import { Image, type ImageSourcePropType } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import {
  ImageFormat,
  Position,
  TextAlign,
  TextBackgroundType,
  type ImageMarkOptions as NativeImageMarkOptions,
  type ImageOptions as NativeImageOptions,
  type NitroImageMarker as NitroImageMarkerSpec,
  type PositionOptions as NativePositionOptions,
  type TextBackgroundStyle as NativeTextBackgroundStyle,
  type TextMarkOptions as NativeTextMarkOptions,
  type TextOptions as NativeTextOptions,
  type TextStyle as NativeTextStyle,
  type WatermarkImageOptions as NativeWatermarkImageOptions,
} from './specs/nitro-image-marker.nitro'

export { ImageFormat, Position, TextAlign, TextBackgroundType }

export type Dimension = number | string

export interface PositionOptions {
  position?: Position
  X?: Dimension
  Y?: Dimension
}

export interface ShadowLayerStyle {
  shadowRadius: number
  shadowDx: number
  shadowDy: number
  shadowColor: string
}

export interface RadiusValue {
  topLeft?: number
  topRight?: number
  bottomLeft?: number
  bottomRight?: number
}

export interface TextBackgroundStyle {
  type?: TextBackgroundType
  color?: string
  cornerRadius?: RadiusValue
  cornerRadiusAll?: number
  padding?: Dimension
  paddingLeft?: Dimension
  paddingTop?: Dimension
  paddingRight?: Dimension
  paddingBottom?: Dimension
  paddingHorizontal?: Dimension
  paddingVertical?: Dimension
}

export interface TextStyle {
  color?: string
  fontName?: string
  fontSize?: number
  shadowStyle?: ShadowLayerStyle
  shadow?: ShadowLayerStyle
  backgroundColor?: string
  textBackgroundStyle?: TextBackgroundStyle
  underline?: boolean
  skewX?: number
  strikeThrough?: boolean
  textAlign?: TextAlign
  italic?: boolean
  bold?: boolean
  rotate?: number
  strokeColor?: string
  strokeWidth?: number
}

export interface TextOptions {
  text: string
  position?: PositionOptions
  style?: TextStyle
}

export interface ImageOptions {
  image: ImageSource
  scale?: number
  rotate?: number
  alpha?: number
  quality?: number
}

export interface WatermarkImageOptions {
  src: ImageSource
  position?: PositionOptions
  scale?: number
  rotate?: number
  alpha?: number
}

export interface TextMarkOptions {
  backgroundImage: ImageOptions
  watermarkTexts: TextOptions[]
  quality?: number
  filename?: string
  saveFormat?: ImageFormat
  maxSize?: number
}

export interface ImageMarkOptions {
  backgroundImage: ImageOptions
  watermarkImages: WatermarkImageOptions[]
  watermarkTexts?: TextOptions[]
  quality?: number
  filename?: string
  saveFormat?: ImageFormat
  maxSize?: number
}

export type ImageSource = ImageSourcePropType | string

const NitroImageMarker =
  NitroModules.createHybridObject<NitroImageMarkerSpec>('NitroImageMarker')

const normalizeImageSource = (source: ImageSource): string => {
  if (typeof source === 'string') {
    return source
  }

  const resolved = Image.resolveAssetSource(source)
  if (resolved?.uri) {
    return resolved.uri
  }

  throw new Error('Unable to resolve image source.')
}

const toNativeImageOptions = (options: ImageOptions): NativeImageOptions => ({
  ...options,
  image: normalizeImageSource(options.image),
})

const normalizeDimension = (value?: string | number): string | undefined => {
  if (value === undefined || value === null) return undefined
  return String(value)
}

const toNativeTextBackgroundStyle = (
  style?: TextBackgroundStyle
): NativeTextBackgroundStyle | undefined => {
  if (!style) return style
  return {
    ...style,
    padding: normalizeDimension(style.padding),
    paddingLeft: normalizeDimension(style.paddingLeft),
    paddingRight: normalizeDimension(style.paddingRight),
    paddingTop: normalizeDimension(style.paddingTop),
    paddingBottom: normalizeDimension(style.paddingBottom),
    paddingHorizontal: normalizeDimension(
      style.paddingHorizontal
    ),
    paddingVertical: normalizeDimension(
      style.paddingVertical
    ),
  }
}

const toNativePositionOptions = (
  options?: PositionOptions
): NativePositionOptions | undefined => {
  if (!options) return options
  return {
    ...options,
    X: normalizeDimension(options.X),
    Y: normalizeDimension(options.Y),
  }
}

const toNativeTextStyle = (style?: TextStyle): NativeTextStyle | undefined => {
  if (!style) return style
  return {
    ...style,
    textBackgroundStyle: toNativeTextBackgroundStyle(style.textBackgroundStyle),
  }
}

const toNativeTextOptions = (options: TextOptions): NativeTextOptions => ({
  ...options,
  position: toNativePositionOptions(options.position),
  style: toNativeTextStyle(options.style),
})

const toNativeWatermarkImageOptions = (
  options: WatermarkImageOptions
): NativeWatermarkImageOptions => ({
  ...options,
  src: normalizeImageSource(options.src),
  position: toNativePositionOptions(options.position),
})

const toNativeTextMarkOptions = (
  options: TextMarkOptions
): NativeTextMarkOptions => ({
  ...options,
  backgroundImage: toNativeImageOptions(options.backgroundImage),
  watermarkTexts: options.watermarkTexts.map(toNativeTextOptions),
})

const toNativeImageMarkOptions = (
  options: ImageMarkOptions
): NativeImageMarkOptions => ({
  ...options,
  backgroundImage: toNativeImageOptions(options.backgroundImage),
  watermarkImages: options.watermarkImages.map(toNativeWatermarkImageOptions),
  watermarkTexts: options.watermarkTexts?.map(toNativeTextOptions),
})

export const markText = (options: TextMarkOptions): string =>
  NitroImageMarker.markText(toNativeTextMarkOptions(options))

export const markImage = (options: ImageMarkOptions): string =>
  NitroImageMarker.markImage(toNativeImageMarkOptions(options))

const Marker = {
  markText,
  markImage,
}

export default Marker
