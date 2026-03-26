import { type HybridObject } from 'react-native-nitro-modules'

export enum Position {
  topLeft = 0,
  topCenter = 1,
  topRight = 2,
  center = 3,
  bottomLeft = 4,
  bottomCenter = 5,
  bottomRight = 6,
}

export enum TextBackgroundType {
  none = 0,
  stretchX = 1,
  stretchY = 2,
  cornerRadius = 3,
}

export enum ImageFormat {
  jpg = 0,
  png = 1,
  base64 = 2,
}

export enum TextAlign {
  left = 0,
  center = 1,
  right = 2,
}

export interface PositionOptions {
  position?: Position
  X?: string
  Y?: string
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
  padding?: string
  paddingLeft?: string
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingHorizontal?: string
  paddingVertical?: string
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
  alpha?: number
  maxWidth?: number
}

export interface TextOptions {
  text: string
  position?: PositionOptions
  style?: TextStyle
}

export interface ImageOptions {
  image: string
  scale?: number
  rotate?: number
  alpha?: number
  quality?: number
}

export interface WatermarkImageOptions {
  src: string
  position?: PositionOptions
  scale?: number
  rotate?: number
  alpha?: number
}

export interface CropOptions {
  x: number
  y: number
  width: number
  height: number
}

export interface FilterOptions {
  brightness?: number
  contrast?: number
  grayscale?: boolean
}

export interface BlurRegion {
  x: number
  y: number
  width: number
  height: number
  blurRadius?: number
}

export interface TileOptions {
  tileText?: TextOptions
  tileImage?: WatermarkImageOptions
  spacing?: number
  angle?: number
}

export interface TextMarkOptions {
  backgroundImage: ImageOptions
  watermarkTexts: TextOptions[]
  quality?: number
  filename?: string
  saveFormat?: ImageFormat
  maxSize?: number
  crop?: CropOptions
  filter?: FilterOptions
  blurRegions?: BlurRegion[]
  tile?: TileOptions
}

export interface ImageMarkOptions {
  backgroundImage: ImageOptions
  watermarkImages: WatermarkImageOptions[]
  watermarkTexts?: TextOptions[]
  quality?: number
  filename?: string
  saveFormat?: ImageFormat
  maxSize?: number
  crop?: CropOptions
  filter?: FilterOptions
  blurRegions?: BlurRegion[]
  tile?: TileOptions
}

export interface NitroImageMarker extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  markText(options: TextMarkOptions): Promise<string>
  markImage(options: ImageMarkOptions): Promise<string>
  markTextBatch(optionsArray: TextMarkOptions[]): Promise<string[]>
  markImageBatch(optionsArray: ImageMarkOptions[]): Promise<string[]>
}
