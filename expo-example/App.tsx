import React, {useMemo, useState} from 'react'
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as MediaLibrary from 'expo-media-library'
import {
  ImageFormat,
  Position,
  TextAlign,
  TextBackgroundType,
  markText,
} from 'react-native-nitro-image-marker'

export default function App(): React.JSX.Element {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [resultUri, setResultUri] = useState<string | null>(null)
  const [text, setText] = useState('Sample watermark')
  const [position, setPosition] = useState<Position>(Position.bottomRight)
  const [status, setStatus] = useState('Ready')

  const positions = useMemo(
    () => [
      {label: 'Top Left', value: Position.topLeft},
      {label: 'Top Center', value: Position.topCenter},
      {label: 'Top Right', value: Position.topRight},
      {label: 'Center', value: Position.center},
      {label: 'Bottom Left', value: Position.bottomLeft},
      {label: 'Bottom Center', value: Position.bottomCenter},
      {label: 'Bottom Right', value: Position.bottomRight},
    ],
    []
  )

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setStatus('Permission denied')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    })

    if (result.canceled) {
      setStatus('Selection cancelled')
      return
    }

    const asset = result.assets?.[0]
    if (!asset?.uri) {
      setStatus('No image selected')
      return
    }

    setSelectedImage(asset.uri)
    setResultUri(null)
    setStatus('Image selected')
  }

  const submit = async () => {
    if (!selectedImage) {
      setStatus('Please select an image first')
      return
    }

    if (!text.trim()) {
      setStatus('Please enter watermark text')
      return
    }

    try {
      setStatus('Marking image...')
      const filePath = markText({
        backgroundImage: {
          image: selectedImage,
        },
        watermarkTexts: [
          {
            text,
            position: {position},
            style: {
              color: '#FFFFFF',
              fontSize: 24,
              textAlign: TextAlign.center,
              bold: true,
              textBackgroundStyle: {
                type: TextBackgroundType.cornerRadius,
                color: '#000000AA',
                paddingHorizontal: 12,
                paddingVertical: 8,
                cornerRadiusAll: 10,
              },
            },
          },
        ],
        saveFormat: ImageFormat.png,
      })

      const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`

      if (Platform.OS !== 'web') {
        const savePerm = await MediaLibrary.requestPermissionsAsync()
        if (!savePerm.granted) {
          setStatus('Save permission denied')
          setResultUri(uri)
          return
        }
        await MediaLibrary.saveToLibraryAsync(uri)
      }

      setResultUri(uri)
      setStatus('Saved to gallery')
    } catch (error) {
      setStatus(`Error: ${String(error)}`)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nitro Image Marker Expo</Text>
      <Text style={styles.subtitle}>{status}</Text>

      <Pressable style={styles.primaryButton} onPress={pickImage}>
        <Text style={styles.primaryButtonText}>
          {selectedImage ? 'Change Image' : 'Upload Image'}
        </Text>
      </Pressable>

      {selectedImage ? (
        <View style={styles.previewCard}>
          <Image source={{uri: selectedImage}} style={styles.previewImage} />
        </View>
      ) : (
        <View style={styles.previewCard}>
          <Text style={styles.previewPlaceholder}>Select an image to start.</Text>
        </View>
      )}

      <View style={styles.inputCard}>
        <Text style={styles.label}>Watermark text</Text>
        <TextInput
          placeholder="Enter text"
          placeholderTextColor="#6C7280"
          value={text}
          onChangeText={setText}
          style={styles.input}
        />

        <Text style={styles.label}>Position</Text>
        <View style={styles.positionGrid}>
          {positions.map(option => (
            <Pressable
              key={option.label}
              style={[
                styles.positionButton,
                position === option.value && styles.positionButtonActive,
              ]}
              onPress={() => setPosition(option.value)}>
              <Text
                style={[
                  styles.positionButtonText,
                  position === option.value && styles.positionButtonTextActive,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.submitButton} onPress={submit}>
          <Text style={styles.submitButtonText}>Submit & Save</Text>
        </Pressable>
      </View>

      {resultUri ? (
        <View style={styles.previewCard}>
          <Text style={styles.resultLabel}>Marked image</Text>
          <Image source={{uri: resultUri}} style={styles.previewImage} />
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0B0D10',
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    color: '#F5F5F5',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#9BA3AE',
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#F5D74D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '700',
    color: '#111111',
  },
  previewCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#141923',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: 320,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2532',
  },
  previewPlaceholder: {
    color: '#7A8496',
    paddingVertical: 48,
  },
  inputCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#111521',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    color: '#F5F5F5',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0B0F18',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  positionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#293148',
  },
  positionButtonActive: {
    borderColor: '#F5D74D',
    backgroundColor: '#1B2012',
  },
  positionButtonText: {
    color: '#A7AFBF',
    fontSize: 12,
  },
  positionButtonTextActive: {
    color: '#F5D74D',
  },
  submitButton: {
    backgroundColor: '#2E5BFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultLabel: {
    color: '#F5F5F5',
    marginBottom: 12,
    fontWeight: '600',
  },
})
