import React, { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import {
  ImageFormat,
  Position,
  TextAlign,
  TextBackgroundType,
  markText,
  markImage,
  markTextBatch,
} from 'react-native-nitro-image-marker'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_WIDTH = SCREEN_WIDTH - 48

type Demo =
  | 'text-basic'
  | 'text-styled'
  | 'text-shadow'
  | 'text-multi'
  | 'text-background'
  | 'image-overlay'
  | 'combined'
  | 'tile'
  | 'crop'
  | 'filter'
  | 'blur'
  | 'batch'

interface DemoItem {
  key: Demo
  title: string
  description: string
}

const DEMOS: DemoItem[] = [
  {
    key: 'text-basic',
    title: 'Basic Text',
    description: 'Simple text watermark with position control',
  },
  {
    key: 'text-styled',
    title: 'Styled Text',
    description: 'Bold, italic, underline, strikethrough, rotation & skew',
  },
  {
    key: 'text-shadow',
    title: 'Text Shadow',
    description: 'Text watermark with drop shadow effect',
  },
  {
    key: 'text-multi',
    title: 'Multiple Texts',
    description: 'Several text watermarks at different positions',
  },
  {
    key: 'text-background',
    title: 'Text Backgrounds',
    description: 'StretchX, stretchY, and cornerRadius backgrounds',
  },
  {
    key: 'image-overlay',
    title: 'Image Overlay',
    description: 'Overlay a second image with scale, rotate & alpha',
  },
  {
    key: 'combined',
    title: 'Combined',
    description: 'Image overlay + text watermarks together',
  },
  {
    key: 'tile',
    title: 'Tile Watermark',
    description: 'Repeat text diagonally across the entire image',
  },
  {
    key: 'crop',
    title: 'Crop',
    description: 'Crop the image before watermarking',
  },
  {
    key: 'filter',
    title: 'Filters',
    description: 'Brightness, contrast, and grayscale filters',
  },
  {
    key: 'blur',
    title: 'Blur Region',
    description: 'Blur a rectangular area of the image',
  },
  {
    key: 'batch',
    title: 'Batch',
    description: 'Process multiple watermark configs at once',
  },
]

const POSITIONS = [
  { label: 'TL', value: Position.topLeft },
  { label: 'TC', value: Position.topCenter },
  { label: 'TR', value: Position.topRight },
  { label: 'C', value: Position.center },
  { label: 'BL', value: Position.bottomLeft },
  { label: 'BC', value: Position.bottomCenter },
  { label: 'BR', value: Position.bottomRight },
]

const FORMATS = [
  { label: 'PNG', value: ImageFormat.png },
  { label: 'JPG', value: ImageFormat.jpg },
  { label: 'Base64', value: ImageFormat.base64 },
]

function AnimatedCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, opacity, translateY])

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  )
}

function PressableScale({
  children,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode
  style?: any
  onPress: () => void
  disabled?: boolean
}) {
  const scale = useRef(new Animated.Value(1)).current

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.96,
          useNativeDriver: true,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start()
      }
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  )
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function App(): React.JSX.Element {
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [overlayImage, setOverlayImage] = useState<string | null>(null)
  const [resultUri, setResultUri] = useState<string | null>(null)
  const [activeDemo, setActiveDemo] = useState<Demo>('text-basic')
  const [position, setPosition] = useState(Position.bottomRight)
  const [format, setFormat] = useState(ImageFormat.png)
  const [watermarkText, setWatermarkText] = useState('Watermark')
  const [fontSize, setFontSize] = useState(28)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // Crop controls
  const [cropX, setCropX] = useState(50)
  const [cropY, setCropY] = useState(50)
  const [cropW, setCropW] = useState(400)
  const [cropH, setCropH] = useState(300)

  // Filter controls
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(1)
  const [grayscale, setGrayscale] = useState(false)

  // Blur controls
  const [blurX, setBlurX] = useState(50)
  const [blurY, setBlurY] = useState(50)
  const [blurW, setBlurW] = useState(200)
  const [blurH, setBlurH] = useState(150)
  const [blurRadius, setBlurRadius] = useState(20)

  // Tile controls
  const [tileSpacing, setTileSpacing] = useState(80)
  const [tileAngle, setTileAngle] = useState(-30)

  const pickImage = useCallback(
    async (target: 'source' | 'overlay') => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        setStatus('Permission denied')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      })
      if (result.canceled || !result.assets?.[0]?.uri) return
      const uri = result.assets[0].uri
      if (target === 'source') {
        setSourceImage(uri)
        setResultUri(null)
        setStatus('')
      } else {
        setOverlayImage(uri)
      }
    },
    []
  )


  const runDemo = useCallback(async () => {
    if (!sourceImage) {
      setStatus('Pick a source image first')
      return
    }
    setLoading(true)
    setStatus('')
    setResultUri(null)

    try {
      let result: string

      switch (activeDemo) {
        case 'text-basic':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: watermarkText || 'Watermark',
                position: { position },
                style: {
                  color: '#FFFFFF',
                  fontSize,
                  bold: true,
                  textAlign: TextAlign.center,
                },
              },
            ],
            saveFormat: format,
            quality: 90,
          })
          break

        case 'text-styled':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: 'Bold & Italic',
                position: { position: Position.topLeft, X: 20, Y: 40 },
                style: {
                  color: '#FF6B6B',
                  fontSize: 22,
                  bold: true,
                  italic: true,
                },
              },
              {
                text: 'Underlined',
                position: { position: Position.topLeft, X: 20, Y: 80 },
                style: {
                  color: '#4ECDC4',
                  fontSize: 22,
                  underline: true,
                },
              },
              {
                text: 'Strikethrough',
                position: { position: Position.topLeft, X: 20, Y: 120 },
                style: {
                  color: '#FFE66D',
                  fontSize: 22,
                  strikeThrough: true,
                },
              },
              {
                text: 'Rotated 15deg',
                position: { position: Position.center },
                style: {
                  color: '#A8E6CF',
                  fontSize: 26,
                  bold: true,
                  rotate: 15,
                },
              },
              {
                text: 'Skewed Text',
                position: { position: Position.bottomLeft, X: 20, Y: '85%' },
                style: {
                  color: '#DDA0DD',
                  fontSize: 22,
                  skewX: 20,
                  bold: true,
                },
              },
            ],
            saveFormat: format,
          })
          break

        case 'text-shadow':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: watermarkText || 'Shadow Text',
                position: { position },
                style: {
                  color: '#FFFFFF',
                  fontSize,
                  bold: true,
                  shadowStyle: {
                    shadowRadius: 8,
                    shadowDx: 3,
                    shadowDy: 3,
                    shadowColor: '#000000CC',
                  },
                },
              },
            ],
            saveFormat: format,
          })
          break

        case 'text-multi':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: 'TOP LEFT',
                position: { position: Position.topLeft, X: 12, Y: 12 },
                style: { color: '#FF6B6B', fontSize: 18, bold: true },
              },
              {
                text: 'TOP RIGHT',
                position: { position: Position.topRight, X: '-12', Y: 12 },
                style: { color: '#4ECDC4', fontSize: 18, bold: true },
              },
              {
                text: 'CENTER',
                position: { position: Position.center },
                style: {
                  color: '#FFFFFF',
                  fontSize: 36,
                  bold: true,
                  textAlign: TextAlign.center,
                  strokeColor: '#000000',
                  strokeWidth: 2,
                },
              },
              {
                text: 'BOTTOM LEFT',
                position: {
                  position: Position.bottomLeft,
                  X: 12,
                  Y: '-12',
                },
                style: { color: '#FFE66D', fontSize: 18, bold: true },
              },
              {
                text: 'BOTTOM RIGHT',
                position: {
                  position: Position.bottomRight,
                  X: '-12',
                  Y: '-12',
                },
                style: { color: '#DDA0DD', fontSize: 18, bold: true },
              },
            ],
            saveFormat: format,
          })
          break

        case 'text-background':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: 'Corner Radius BG',
                position: { position: Position.topCenter, Y: 30 },
                style: {
                  color: '#FFFFFF',
                  fontSize: 20,
                  bold: true,
                  textBackgroundStyle: {
                    type: TextBackgroundType.cornerRadius,
                    color: '#FF6B6BAA',
                    cornerRadiusAll: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  },
                },
              },
              {
                text: 'Stretch X Background',
                position: { position: Position.center },
                style: {
                  color: '#FFFFFF',
                  fontSize: 20,
                  bold: true,
                  textAlign: TextAlign.center,
                  textBackgroundStyle: {
                    type: TextBackgroundType.stretchX,
                    color: '#4ECDC488',
                    paddingVertical: 10,
                  },
                },
              },
              {
                text: 'Stretch Y',
                position: { position: Position.bottomRight, X: '-20' },
                style: {
                  color: '#FFFFFF',
                  fontSize: 18,
                  bold: true,
                  textBackgroundStyle: {
                    type: TextBackgroundType.stretchY,
                    color: '#FFE66D55',
                    paddingHorizontal: 12,
                  },
                },
              },
            ],
            saveFormat: format,
          })
          break

        case 'image-overlay': {
          if (!overlayImage) {
            setStatus('Pick an overlay image first')
            setLoading(false)
            return
          }
          result = await markImage({
            backgroundImage: { image: sourceImage },
            watermarkImages: [
              {
                src: overlayImage,
                position: { position },
                scale: 0.3,
                alpha: 0.8,
                rotate: 0,
              },
            ],
            saveFormat: format,
            quality: 90,
          })
          break
        }

        case 'combined': {
          if (!overlayImage) {
            setStatus('Pick an overlay image first')
            setLoading(false)
            return
          }
          result = await markImage({
            backgroundImage: { image: sourceImage },
            watermarkImages: [
              {
                src: overlayImage,
                position: { position: Position.bottomRight, X: '-16', Y: '-50' },
                scale: 0.25,
                alpha: 0.7,
              },
            ],
            watermarkTexts: [
              {
                text: new Date().toLocaleString(),
                position: { position: Position.topLeft, X: 12, Y: 12 },
                style: {
                  color: '#FFFFFF',
                  fontSize: 16,
                  textBackgroundStyle: {
                    type: TextBackgroundType.cornerRadius,
                    color: '#00000099',
                    cornerRadiusAll: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  },
                },
              },
              {
                text: watermarkText || 'Proof of Delivery',
                position: {
                  position: Position.bottomLeft,
                  X: 12,
                  Y: '-16',
                },
                style: {
                  color: '#FFFFFF',
                  fontSize,
                  bold: true,
                  shadowStyle: {
                    shadowRadius: 6,
                    shadowDx: 2,
                    shadowDy: 2,
                    shadowColor: '#000000BB',
                  },
                },
              },
            ],
            saveFormat: format,
            quality: 90,
          })
          break
        }

        case 'tile':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [],
            tile: {
              tileText: {
                text: watermarkText || 'CONFIDENTIAL',
                style: {
                  color: '#FF0000',
                  fontSize,
                  bold: true,
                  alpha: 0.25,
                },
              },
              spacing: tileSpacing,
              angle: tileAngle,
            },
            saveFormat: format,
          })
          break

        case 'crop':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: 'Cropped',
                position: { position: Position.bottomRight, X: '-8', Y: '-8' },
                style: {
                  color: '#FFFFFF',
                  fontSize: 20,
                  bold: true,
                  textBackgroundStyle: {
                    type: TextBackgroundType.cornerRadius,
                    color: '#FF6B6BAA',
                    cornerRadiusAll: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  },
                },
              },
            ],
            crop: { x: cropX, y: cropY, width: cropW, height: cropH },
            saveFormat: format,
          })
          break

        case 'filter':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: 'Filtered',
                position: { position: Position.topLeft, X: 12, Y: 12 },
                style: {
                  color: '#FFFFFF',
                  fontSize: 22,
                  bold: true,
                },
              },
            ],
            filter: { grayscale, brightness, contrast },
            saveFormat: format,
          })
          break

        case 'blur':
          result = await markText({
            backgroundImage: { image: sourceImage },
            watermarkTexts: [
              {
                text: 'Blurred Region',
                position: { position: Position.topCenter, Y: 12 },
                style: {
                  color: '#FFFFFF',
                  fontSize: 20,
                  bold: true,
                },
              },
            ],
            blurRegions: [
              { x: blurX, y: blurY, width: blurW, height: blurH, blurRadius },
            ],
            saveFormat: format,
          })
          break

        case 'batch': {
          const results = await markTextBatch([
            {
              backgroundImage: { image: sourceImage },
              watermarkTexts: [
                {
                  text: 'Batch 1',
                  position: { position: Position.center },
                  style: { color: '#FF6B6B', fontSize: 30, bold: true },
                },
              ],
              saveFormat: format,
            },
            {
              backgroundImage: { image: sourceImage },
              watermarkTexts: [
                {
                  text: 'Batch 2',
                  position: { position: Position.center },
                  style: { color: '#4ECDC4', fontSize: 30, bold: true },
                },
              ],
              saveFormat: format,
            },
          ])
          // Show the last result
          result = results[results.length - 1] ?? ''
          setStatus(`Batch processed ${results.length} images`)
          break
        }

        default:
          result = ''
      }

      if (!result) {
        setStatus('No result returned')
        setLoading(false)
        return
      }

      if (format === ImageFormat.base64) {
        setResultUri(`data:image/png;base64,${result}`)
        setStatus('Generated base64 output')
      } else {
        const uri = result.startsWith('file://') ? result : `file://${result}`
        setResultUri(uri)
        setStatus('Done')
      }
    } catch (error) {
      setStatus(`Error: ${String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [
    sourceImage,
    overlayImage,
    activeDemo,
    position,
    format,
    fontSize,
    watermarkText,
    cropX,
    cropY,
    cropW,
    cropH,
    brightness,
    contrast,
    grayscale,
    blurX,
    blurY,
    blurW,
    blurH,
    blurRadius,
    tileSpacing,
    tileAngle,
  ])

  const needsOverlay = activeDemo === 'image-overlay' || activeDemo === 'combined'

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <AnimatedCard>
            <Text style={styles.title}>Nitro Image Marker</Text>
            <Text style={styles.subtitle}>
              High-performance watermarking demo
            </Text>
          </AnimatedCard>

          {/* Source Image */}
          <AnimatedCard delay={50}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Source Image</Text>
              <PressableScale
                style={styles.pickButton}
                onPress={() => pickImage('source')}
              >
                <Text style={styles.pickButtonText}>
                  {sourceImage ? 'Change Image' : 'Pick Image'}
                </Text>
              </PressableScale>
              {sourceImage ? (
                <Image
                  source={{ uri: sourceImage }}
                  style={styles.preview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    Tap above to select an image
                  </Text>
                </View>
              )}
            </View>
          </AnimatedCard>

          {/* Demo Selector */}
          <AnimatedCard delay={100}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Demo</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.demoScroll}
              >
                {DEMOS.map((demo) => (
                  <PressableScale
                    key={demo.key}
                    style={[
                      styles.demoCard,
                      activeDemo === demo.key && styles.demoCardActive,
                    ]}
                    onPress={() => {
                      setActiveDemo(demo.key)
                      setResultUri(null)
                      setStatus('')
                    }}
                  >
                    <Text
                      style={[
                        styles.demoTitle,
                        activeDemo === demo.key && styles.demoTitleActive,
                      ]}
                    >
                      {demo.title}
                    </Text>
                    <Text
                      style={[
                        styles.demoDesc,
                        activeDemo === demo.key && styles.demoDescActive,
                      ]}
                      numberOfLines={2}
                    >
                      {demo.description}
                    </Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>
          </AnimatedCard>

          {/* Overlay Image (for image-overlay and combined demos) */}
          {needsOverlay && (
            <AnimatedCard delay={150}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Overlay Image</Text>
                <PressableScale
                  style={styles.pickButtonSecondary}
                  onPress={() => pickImage('overlay')}
                >
                  <Text style={styles.pickButtonSecondaryText}>
                    {overlayImage ? 'Change Overlay' : 'Pick Overlay Image'}
                  </Text>
                </PressableScale>
                {overlayImage && (
                  <Image
                    source={{ uri: overlayImage }}
                    style={styles.overlayPreview}
                    resizeMode="cover"
                  />
                )}
              </View>
            </AnimatedCard>
          )}

          {/* Controls */}
          <AnimatedCard delay={200}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Options</Text>

              {/* Text input - shown for demos that use custom text */}
              {(activeDemo === 'text-basic' ||
                activeDemo === 'text-shadow' ||
                activeDemo === 'combined' ||
                activeDemo === 'tile') && (
                <View style={styles.field}>
                  <Text style={styles.label}>Text</Text>
                  <TextInput
                    value={watermarkText}
                    onChangeText={setWatermarkText}
                    placeholder="Enter watermark text"
                    placeholderTextColor="#555"
                    style={styles.input}
                  />
                </View>
              )}

              {/* Font size - shown for demos that use custom text */}
              {(activeDemo === 'text-basic' ||
                activeDemo === 'text-shadow' ||
                activeDemo === 'combined' ||
                activeDemo === 'tile') && (
                <View style={styles.field}>
                  <Text style={styles.label}>Font Size: {fontSize}px</Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      onPress={() => setFontSize((s) => Math.max(8, s - 2))}
                      style={styles.stepperButton}
                    >
                      <Text style={styles.stepperButtonText}>-</Text>
                    </Pressable>
                    <View style={styles.stepperTrack}>
                      <View
                        style={[
                          styles.stepperFill,
                          { width: `${((fontSize - 8) / 64) * 100}%` },
                        ]}
                      />
                    </View>
                    <Pressable
                      onPress={() => setFontSize((s) => Math.min(72, s + 2))}
                      style={styles.stepperButton}
                    >
                      <Text style={styles.stepperButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Position - shown for applicable demos */}
              {(activeDemo === 'text-basic' ||
                activeDemo === 'text-shadow' ||
                activeDemo === 'image-overlay') && (
                <View style={styles.field}>
                  <Text style={styles.label}>Position</Text>
                  <View style={styles.chipRow}>
                    {POSITIONS.map((p) => (
                      <Chip
                        key={p.label}
                        label={p.label}
                        active={position === p.value}
                        onPress={() => setPosition(p.value)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Crop controls */}
              {activeDemo === 'crop' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Crop Region</Text>
                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>X: {cropX}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setCropX((v) => Math.max(0, v - 10))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (cropX / 500) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setCropX((v) => v + 10)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Y: {cropY}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setCropY((v) => Math.max(0, v - 10))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (cropY / 500) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setCropY((v) => v + 10)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.gridRow, { marginTop: 8 }]}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Width: {cropW}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setCropW((v) => Math.max(50, v - 25))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (cropW / 1000) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setCropW((v) => v + 25)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Height: {cropH}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setCropH((v) => Math.max(50, v - 25))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (cropH / 1000) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setCropH((v) => v + 25)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Filter controls */}
              {activeDemo === 'filter' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Filter Settings</Text>
                  <View style={{ marginBottom: 12 }}>
                    <Pressable
                      onPress={() => setGrayscale((v) => !v)}
                      style={[styles.chip, grayscale && styles.chipActive, { alignSelf: 'flex-start', marginBottom: 12 }]}
                    >
                      <Text style={[styles.chipText, grayscale && styles.chipTextActive]}>
                        Grayscale: {grayscale ? 'ON' : 'OFF'}
                      </Text>
                    </Pressable>
                    <Text style={styles.gridLabel}>Brightness: {brightness.toFixed(1)}</Text>
                    <View style={styles.stepperRow}>
                      <Pressable onPress={() => setBrightness((v) => Math.max(-1, +(v - 0.1).toFixed(1)))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>-</Text>
                      </Pressable>
                      <View style={styles.stepperTrack}>
                        <View style={[styles.stepperFill, { width: `${((brightness + 1) / 2) * 100}%` }]} />
                      </View>
                      <Pressable onPress={() => setBrightness((v) => Math.min(1, +(v + 0.1).toFixed(1)))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View>
                    <Text style={styles.gridLabel}>Contrast: {contrast.toFixed(1)}</Text>
                    <View style={styles.stepperRow}>
                      <Pressable onPress={() => setContrast((v) => Math.max(0.5, +(v - 0.1).toFixed(1)))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>-</Text>
                      </Pressable>
                      <View style={styles.stepperTrack}>
                        <View style={[styles.stepperFill, { width: `${((contrast - 0.5) / 1.5) * 100}%` }]} />
                      </View>
                      <Pressable onPress={() => setContrast((v) => Math.min(2, +(v + 0.1).toFixed(1)))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Blur controls */}
              {activeDemo === 'blur' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Blur Region</Text>
                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>X: {blurX}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setBlurX((v) => Math.max(0, v - 10))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (blurX / 500) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setBlurX((v) => v + 10)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Y: {blurY}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setBlurY((v) => Math.max(0, v - 10))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (blurY / 500) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setBlurY((v) => v + 10)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.gridRow, { marginTop: 8 }]}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Width: {blurW}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setBlurW((v) => Math.max(20, v - 20))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (blurW / 500) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setBlurW((v) => v + 20)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Height: {blurH}</Text>
                      <View style={styles.stepperRow}>
                        <Pressable onPress={() => setBlurH((v) => Math.max(20, v - 20))} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>-</Text>
                        </Pressable>
                        <View style={styles.stepperTrack}>
                          <View style={[styles.stepperFill, { width: `${Math.min(100, (blurH / 500) * 100)}%` }]} />
                        </View>
                        <Pressable onPress={() => setBlurH((v) => v + 20)} style={styles.stepperButton}>
                          <Text style={styles.stepperButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.gridLabel}>Blur Radius: {blurRadius}</Text>
                    <View style={styles.stepperRow}>
                      <Pressable onPress={() => setBlurRadius((v) => Math.max(1, v - 2))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>-</Text>
                      </Pressable>
                      <View style={styles.stepperTrack}>
                        <View style={[styles.stepperFill, { width: `${(blurRadius / 50) * 100}%` }]} />
                      </View>
                      <Pressable onPress={() => setBlurRadius((v) => Math.min(50, v + 2))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Tile controls */}
              {activeDemo === 'tile' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Tile Settings</Text>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.gridLabel}>Spacing: {tileSpacing}px</Text>
                    <View style={styles.stepperRow}>
                      <Pressable onPress={() => setTileSpacing((v) => Math.max(20, v - 10))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>-</Text>
                      </Pressable>
                      <View style={styles.stepperTrack}>
                        <View style={[styles.stepperFill, { width: `${((tileSpacing - 20) / 280) * 100}%` }]} />
                      </View>
                      <Pressable onPress={() => setTileSpacing((v) => Math.min(300, v + 10))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View>
                    <Text style={styles.gridLabel}>Angle: {tileAngle} deg</Text>
                    <View style={styles.stepperRow}>
                      <Pressable onPress={() => setTileAngle((v) => Math.max(-90, v - 5))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>-</Text>
                      </Pressable>
                      <View style={styles.stepperTrack}>
                        <View style={[styles.stepperFill, { width: `${((tileAngle + 90) / 180) * 100}%` }]} />
                      </View>
                      <Pressable onPress={() => setTileAngle((v) => Math.min(90, v + 5))} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Format */}
              <View style={styles.field}>
                <Text style={styles.label}>Output Format</Text>
                <View style={styles.chipRow}>
                  {FORMATS.map((f) => (
                    <Chip
                      key={f.label}
                      label={f.label}
                      active={format === f.value}
                      onPress={() => setFormat(f.value)}
                    />
                  ))}
                </View>
              </View>

              {/* Run Button */}
              <PressableScale
                style={[
                  styles.runButton,
                  (!sourceImage || loading) && styles.runButtonDisabled,
                ]}
                onPress={runDemo}
                disabled={!sourceImage || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.runButtonText}>Run Demo</Text>
                )}
              </PressableScale>
            </View>
          </AnimatedCard>

          {/* Status */}
          {status ? (
            <AnimatedCard>
              <View
                style={[
                  styles.statusBar,
                  status.startsWith('Error')
                    ? styles.statusError
                    : styles.statusSuccess,
                ]}
              >
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </AnimatedCard>
          ) : null}

          {/* Result */}
          {resultUri ? (
            <AnimatedCard>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Result</Text>
                <Image
                  source={{ uri: resultUri }}
                  style={styles.preview}
                  resizeMode="cover"
                />
              </View>
            </AnimatedCard>
          ) : null}

          <View style={styles.footer} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0C10',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F0F0F0',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#12151C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1C2030',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E0E0E0',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  pickButtonSecondary: {
    backgroundColor: '#1C2030',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3348',
  },
  pickButtonSecondaryText: {
    color: '#A0A8C0',
    fontWeight: '600',
    fontSize: 14,
  },
  preview: {
    width: '100%',
    height: IMAGE_WIDTH * 0.6,
    borderRadius: 12,
    backgroundColor: '#0A0C10',
  },
  overlayPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#0A0C10',
  },
  placeholder: {
    height: IMAGE_WIDTH * 0.5,
    borderRadius: 12,
    backgroundColor: '#0D1018',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1C2030',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#3D4560',
    fontSize: 14,
  },
  demoScroll: {
    gap: 10,
    paddingRight: 8,
  },
  demoCard: {
    width: 140,
    backgroundColor: '#0D1018',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1C2030',
  },
  demoCardActive: {
    borderColor: '#6C5CE7',
    backgroundColor: '#1A1530',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0A8C0',
    marginBottom: 4,
  },
  demoTitleActive: {
    color: '#B8B0F0',
  },
  demoDesc: {
    fontSize: 11,
    color: '#4A5268',
    lineHeight: 15,
  },
  demoDescActive: {
    color: '#7B72B8',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8890A4',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A0C10',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F0F0F0',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1C2030',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1C2030',
    borderWidth: 1,
    borderColor: '#2D3348',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    color: '#B8B0F0',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  stepperTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1C2030',
    overflow: 'hidden',
  },
  stepperFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#6C5CE7',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0D1018',
    borderWidth: 1,
    borderColor: '#1C2030',
  },
  chipActive: {
    backgroundColor: '#1A1530',
    borderColor: '#6C5CE7',
  },
  chipText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#B8B0F0',
  },
  runButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  runButtonDisabled: {
    opacity: 0.4,
  },
  runButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  statusBar: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statusSuccess: {
    backgroundColor: '#0D2818',
    borderWidth: 1,
    borderColor: '#1A4D2E',
  },
  statusError: {
    backgroundColor: '#2D0A0A',
    borderWidth: 1,
    borderColor: '#4D1A1A',
  },
  statusText: {
    color: '#C0D0C8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    height: 20,
  },
})
