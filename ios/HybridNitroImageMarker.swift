//
//  HybridNitroImageMarker.swift
//  Pods
//
//  Created by Prahlad on 26/1/2026.
//

import Foundation
import UIKit
import NitroModules

class HybridNitroImageMarker: HybridNitroImageMarkerSpec {
    func markText(options: TextMarkOptions) throws -> Promise<String> {
        return Promise.async {
            return try self.render(
                background: options.backgroundImage,
                watermarkTexts: options.watermarkTexts,
                watermarkImages: [],
                quality: options.quality,
                filename: options.filename,
                saveFormat: options.saveFormat,
                maxSize: options.maxSize,
                crop: options.crop,
                filter: options.filter,
                blurRegions: options.blurRegions,
                tile: options.tile
            )
        }
    }

    func markImage(options: ImageMarkOptions) throws -> Promise<String> {
        return Promise.async {
            return try self.render(
                background: options.backgroundImage,
                watermarkTexts: options.watermarkTexts ?? [],
                watermarkImages: options.watermarkImages,
                quality: options.quality,
                filename: options.filename,
                saveFormat: options.saveFormat,
                maxSize: options.maxSize,
                crop: options.crop,
                filter: options.filter,
                blurRegions: options.blurRegions,
                tile: options.tile
            )
        }
    }

    func markTextBatch(optionsArray: [TextMarkOptions]) throws -> Promise<[String]> {
        return Promise.async {
            var results: [String] = []
            for options in optionsArray {
                let result = try self.render(
                    background: options.backgroundImage,
                    watermarkTexts: options.watermarkTexts,
                    watermarkImages: [],
                    quality: options.quality,
                    filename: options.filename,
                    saveFormat: options.saveFormat,
                    maxSize: options.maxSize,
                    crop: options.crop,
                    filter: options.filter,
                    blurRegions: options.blurRegions,
                    tile: options.tile
                )
                results.append(result)
            }
            return results
        }
    }

    func markImageBatch(optionsArray: [ImageMarkOptions]) throws -> Promise<[String]> {
        return Promise.async {
            var results: [String] = []
            for options in optionsArray {
                let result = try self.render(
                    background: options.backgroundImage,
                    watermarkTexts: options.watermarkTexts ?? [],
                    watermarkImages: options.watermarkImages,
                    quality: options.quality,
                    filename: options.filename,
                    saveFormat: options.saveFormat,
                    maxSize: options.maxSize,
                    crop: options.crop,
                    filter: options.filter,
                    blurRegions: options.blurRegions,
                    tile: options.tile
                )
                results.append(result)
            }
            return results
        }
    }
}

// MARK: - Core Render Pipeline

private extension HybridNitroImageMarker {
    func render(
        background: ImageOptions,
        watermarkTexts: [TextOptions],
        watermarkImages: [WatermarkImageOptions],
        quality: Double?,
        filename: String?,
        saveFormat: ImageFormat?,
        maxSize: Double?,
        crop: CropOptions?,
        filter: FilterOptions?,
        blurRegions: [BlurRegion]?,
        tile: TileOptions?
    ) throws -> String {
        var baseImage = try loadImage(source: background.image)
        if let scale = background.scale, scale > 0 {
            baseImage = resizeImage(baseImage, scale: CGFloat(scale))
        }

        // Crop
        if let crop = crop {
            baseImage = try cropImage(baseImage, options: crop)
        }

        // Filter
        if let filter = filter {
            baseImage = applyFilter(baseImage, options: filter)
        }

        let bgRotate = CGFloat(background.rotate ?? 0)
        let bgAlpha = CGFloat(background.alpha ?? 1)

        let canvasSize = baseImage.size
        let format = UIGraphicsImageRendererFormat()
        format.scale = baseImage.scale
        let renderer = UIGraphicsImageRenderer(size: canvasSize, format: format)

        var renderError: Error?
        var output = renderer.image { rendererContext in
            let context = rendererContext.cgContext

            context.saveGState()
            context.setAlpha(bgAlpha)
            drawImage(baseImage, in: CGRect(origin: .zero, size: canvasSize), rotate: bgRotate, context: context)
            context.restoreGState()

            // Blur regions
            if let blurRegions = blurRegions {
                for region in blurRegions {
                    applyBlurRegion(region, canvasSize: canvasSize, baseImage: baseImage, context: context)
                }
            }

            // Image watermarks
            for imageWatermark in watermarkImages {
                do {
                    var image = try loadImage(source: imageWatermark.src)
                    if let scale = imageWatermark.scale, scale > 0 {
                        image = resizeImage(image, scale: CGFloat(scale))
                    }
                    let rotate = CGFloat(imageWatermark.rotate ?? 0)
                    let alpha = CGFloat(imageWatermark.alpha ?? 1)
                    let pos = resolvePosition(imageWatermark.position, itemSize: image.size, canvasSize: canvasSize)
                    context.saveGState()
                    context.setAlpha(alpha)
                    drawImage(image, in: CGRect(origin: pos, size: image.size), rotate: rotate, context: context)
                    context.restoreGState()
                } catch {
                    renderError = error
                    return
                }
            }

            // Text watermarks
            for textWatermark in watermarkTexts {
                drawText(textWatermark, in: canvasSize, context: context)
            }

            // Tile watermark
            if let tile = tile {
                do {
                    try self.drawTile(tile, canvasSize: canvasSize, context: context)
                } catch {
                    renderError = error
                    return
                }
            }
        }

        if let renderError = renderError {
            throw renderError
        }

        if let maxSize = maxSize, maxSize > 0 {
            output = resizeImage(output, maxSize: CGFloat(maxSize))
        }

        return try persistImage(output, quality: quality, filename: filename, saveFormat: saveFormat)
    }
}

// MARK: - Image Loading

private extension HybridNitroImageMarker {
    func loadImage(source: String) throws -> UIImage {
        let path = source.hasPrefix("file://") ? String(source.dropFirst(7)) : source
        if FileManager.default.fileExists(atPath: path), let image = UIImage(contentsOfFile: path) {
            return image
        }

        if let data = decodeBase64(source), let image = UIImage(data: data) {
            return image
        }

        // URL loading (http/https)
        if source.hasPrefix("http://") || source.hasPrefix("https://") {
            if let url = URL(string: source), let data = try? Data(contentsOf: url), let image = UIImage(data: data) {
                return image
            }
        }

        throw NSError(domain: "NitroImageMarker", code: 3, userInfo: [NSLocalizedDescriptionKey: "Unable to load image: \(source)"])
    }

    func decodeBase64(_ source: String) -> Data? {
        if source.hasPrefix("data:") {
            guard let range = source.range(of: "base64,") else { return nil }
            let base64 = String(source[range.upperBound...])
            return Data(base64Encoded: base64)
        }
        return Data(base64Encoded: source)
    }
}

// MARK: - Crop

private extension HybridNitroImageMarker {
    func cropImage(_ image: UIImage, options: CropOptions) throws -> UIImage {
        let scale = image.scale
        let cropRect = CGRect(
            x: CGFloat(options.x) * scale,
            y: CGFloat(options.y) * scale,
            width: CGFloat(options.width) * scale,
            height: CGFloat(options.height) * scale
        )
        guard let cgImage = image.cgImage?.cropping(to: cropRect) else {
            throw NSError(domain: "NitroImageMarker", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to crop image."])
        }
        return UIImage(cgImage: cgImage, scale: scale, orientation: image.imageOrientation)
    }
}

// MARK: - Filters

private extension HybridNitroImageMarker {
    func applyFilter(_ image: UIImage, options: FilterOptions) -> UIImage {
        guard let ciImage = CIImage(image: image) else { return image }
        var filtered = ciImage

        // Grayscale
        if options.grayscale == true {
            if let grayscaleFilter = CIFilter(name: "CIColorMonochrome") {
                grayscaleFilter.setValue(filtered, forKey: kCIInputImageKey)
                grayscaleFilter.setValue(CIColor(red: 0.7, green: 0.7, blue: 0.7), forKey: "inputColor")
                grayscaleFilter.setValue(1.0, forKey: "inputIntensity")
                if let output = grayscaleFilter.outputImage { filtered = output }
            }
        }

        // Brightness
        if let brightness = options.brightness, brightness != 0 {
            if let brightnessFilter = CIFilter(name: "CIColorControls") {
                brightnessFilter.setValue(filtered, forKey: kCIInputImageKey)
                brightnessFilter.setValue(brightness / 100.0, forKey: kCIInputBrightnessKey)
                if let output = brightnessFilter.outputImage { filtered = output }
            }
        }

        // Contrast
        if let contrast = options.contrast, contrast != 0 {
            if let contrastFilter = CIFilter(name: "CIColorControls") {
                contrastFilter.setValue(filtered, forKey: kCIInputImageKey)
                // Map -100..100 to 0.25..1.75
                let contrastValue = 1.0 + (contrast / 100.0) * 0.75
                contrastFilter.setValue(contrastValue, forKey: kCIInputContrastKey)
                if let output = contrastFilter.outputImage { filtered = output }
            }
        }

        let context = CIContext()
        guard let cgImage = context.createCGImage(filtered, from: filtered.extent) else { return image }
        return UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
    }
}

// MARK: - Blur Region

private extension HybridNitroImageMarker {
    func applyBlurRegion(_ region: BlurRegion, canvasSize: CGSize, baseImage: UIImage, context: CGContext) {
        let radius = CGFloat(region.blurRadius ?? 15)
        let rect = CGRect(
            x: CGFloat(region.x),
            y: CGFloat(region.y),
            width: CGFloat(region.width),
            height: CGFloat(region.height)
        )

        guard let cgImage = baseImage.cgImage else { return }
        let scale = baseImage.scale
        let scaledRect = CGRect(
            x: rect.origin.x * scale,
            y: rect.origin.y * scale,
            width: rect.size.width * scale,
            height: rect.size.height * scale
        )
        guard let cropped = cgImage.cropping(to: scaledRect) else { return }

        let ciImage = CIImage(cgImage: cropped)
        let blurFilter = CIFilter(name: "CIGaussianBlur")
        blurFilter?.setValue(ciImage, forKey: kCIInputImageKey)
        blurFilter?.setValue(radius, forKey: kCIInputRadiusKey)

        let ciContext = CIContext()
        guard let blurredCI = blurFilter?.outputImage,
              let blurredCG = ciContext.createCGImage(blurredCI, from: ciImage.extent) else { return }

        let blurredImage = UIImage(cgImage: blurredCG, scale: scale, orientation: baseImage.imageOrientation)
        context.saveGState()
        blurredImage.draw(in: rect)
        context.restoreGState()
    }
}

// MARK: - Tile Watermark

private extension HybridNitroImageMarker {
    func drawTile(_ tile: TileOptions, canvasSize: CGSize, context: CGContext) throws {
        let spacing = CGFloat(tile.spacing ?? 100)
        let angle = CGFloat(tile.angle ?? -30)
        let angleRad = degreesToRadians(angle)

        context.saveGState()
        let centerX = canvasSize.width / 2
        let centerY = canvasSize.height / 2
        context.translateBy(x: centerX, y: centerY)
        context.rotate(by: angleRad)
        context.translateBy(x: -centerX, y: -centerY)

        // Calculate extended bounds to cover rotated area
        let diagonal = sqrt(canvasSize.width * canvasSize.width + canvasSize.height * canvasSize.height)
        let startX = centerX - diagonal / 2
        let startY = centerY - diagonal / 2

        if let tileText = tile.tileText {
            let style = tileText.style
            let fontSize = CGFloat(style?.fontSize ?? 20)
            var font = UIFont.systemFont(ofSize: fontSize)
            if let fontName = style?.fontName, let customFont = UIFont(name: fontName, size: fontSize) {
                font = customFont
            }
            if style?.bold == true {
                if let descriptor = font.fontDescriptor.withSymbolicTraits(.traitBold) {
                    font = UIFont(descriptor: descriptor, size: fontSize)
                }
            }

            let color = parseColor(style?.color ?? "#000000")
            let alpha = CGFloat(style?.alpha ?? 0.3)
            let attributes: [NSAttributedString.Key: Any] = [
                .font: font,
                .foregroundColor: color.withAlphaComponent(alpha),
            ]

            let textSize = (tileText.text as NSString).size(withAttributes: attributes)
            let stepX = textSize.width + spacing
            let stepY = textSize.height + spacing

            var y = startY
            while y < startY + diagonal {
                var x = startX
                while x < startX + diagonal {
                    (tileText.text as NSString).draw(at: CGPoint(x: x, y: y), withAttributes: attributes)
                    x += stepX
                }
                y += stepY
            }
        }

        if let tileImage = tile.tileImage {
            var image = try loadImage(source: tileImage.src)
            if let scale = tileImage.scale, scale > 0 {
                image = resizeImage(image, scale: CGFloat(scale))
            }
            let alpha = CGFloat(tileImage.alpha ?? 0.3)
            let stepX = image.size.width + spacing
            let stepY = image.size.height + spacing

            context.setAlpha(alpha)
            var y = startY
            while y < startY + diagonal {
                var x = startX
                while x < startX + diagonal {
                    image.draw(at: CGPoint(x: x, y: y))
                    x += stepX
                }
                y += stepY
            }
        }

        context.restoreGState()
    }
}

// MARK: - Drawing

private extension HybridNitroImageMarker {
    func drawImage(_ image: UIImage, in rect: CGRect, rotate: CGFloat, context: CGContext) {
        if rotate == 0 {
            image.draw(in: rect)
            return
        }
        let center = CGPoint(x: rect.midX, y: rect.midY)
        context.translateBy(x: center.x, y: center.y)
        context.rotate(by: degreesToRadians(rotate))
        context.translateBy(x: -center.x, y: -center.y)
        image.draw(in: rect)
        context.translateBy(x: center.x, y: center.y)
        context.rotate(by: -degreesToRadians(rotate))
        context.translateBy(x: -center.x, y: -center.y)
    }

    func drawText(_ watermark: TextOptions, in canvasSize: CGSize, context: CGContext) {
        let style = watermark.style
        let fontSize = CGFloat(style?.fontSize ?? 20)
        var font = UIFont.systemFont(ofSize: fontSize)
        if let fontName = style?.fontName, let customFont = UIFont(name: fontName, size: fontSize) {
            font = customFont
        }
        if style?.bold == true || style?.italic == true {
            var traits: UIFontDescriptor.SymbolicTraits = []
            if style?.bold == true { traits.insert(.traitBold) }
            if style?.italic == true { traits.insert(.traitItalic) }
            if let descriptor = font.fontDescriptor.withSymbolicTraits(traits) {
                font = UIFont(descriptor: descriptor, size: fontSize)
            }
        }

        let paragraph = NSMutableParagraphStyle()
        switch style?.textAlign {
        case .center:
            paragraph.alignment = .center
        case .right:
            paragraph.alignment = .right
        default:
            paragraph.alignment = .left
        }

        let color = parseColor(style?.color ?? "#000000")
        let textAlpha = CGFloat(style?.alpha ?? 1)
        let shadow = resolveShadow(style)
        let obliqueness = style?.skewX.map { CGFloat(tan(degreesToRadians(CGFloat($0)))) }
        let strokeWidth = CGFloat(style?.strokeWidth ?? 0)
        let strokeColor = style?.strokeColor.map(parseColor)

        var attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: color.withAlphaComponent(textAlpha),
            .paragraphStyle: paragraph
        ]
        if let shadow = shadow { attributes[.shadow] = shadow }
        if style?.underline == true { attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue }
        if style?.strikeThrough == true { attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
        if let obliqueness = obliqueness { attributes[.obliqueness] = obliqueness }
        if strokeWidth > 0, let strokeColor = strokeColor {
            attributes[.strokeColor] = strokeColor
            attributes[.strokeWidth] = -strokeWidth
        }

        // Calculate text bounds with maxWidth
        let maxWidth = style?.maxWidth.map { CGFloat($0) } ?? 100000
        let attributed = NSAttributedString(string: watermark.text, attributes: attributes)
        let textBounds = attributed.boundingRect(
            with: CGSize(width: maxWidth, height: 100000),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        ).integral

        let padding = resolvePadding(style?.textBackgroundStyle, textSize: textBounds.size)
        var backgroundRect = CGRect(
            x: 0,
            y: 0,
            width: textBounds.width + padding.left + padding.right,
            height: textBounds.height + padding.top + padding.bottom
        )

        let position = resolvePosition(watermark.position, itemSize: backgroundRect.size, canvasSize: canvasSize)
        backgroundRect.origin = position

        let backgroundStyle = style?.textBackgroundStyle
        let backgroundType = backgroundStyle?.type ?? .none
        let backgroundColor = backgroundStyle?.color ?? style?.backgroundColor
        if let backgroundColor = backgroundColor, backgroundType != .none {
            var drawRect = backgroundRect
            if backgroundType == .stretchx {
                drawRect.origin.x = 0
                drawRect.size.width = canvasSize.width
            } else if backgroundType == .stretchy {
                drawRect.origin.y = 0
                drawRect.size.height = canvasSize.height
            }

            context.saveGState()
            context.setFillColor(parseColor(backgroundColor).cgColor)
            let cornerRadius = resolveCornerRadius(backgroundStyle)
            let path = roundedPath(for: drawRect, radii: cornerRadius)
            context.addPath(path.cgPath)
            context.fillPath()
            context.restoreGState()
        }

        let textRect = CGRect(
            x: backgroundRect.origin.x + padding.left,
            y: backgroundRect.origin.y + padding.top,
            width: textBounds.width,
            height: textBounds.height
        )

        if let rotate = style?.rotate, rotate != 0 {
            context.saveGState()
            let center = CGPoint(x: textRect.midX, y: textRect.midY)
            context.translateBy(x: center.x, y: center.y)
            context.rotate(by: degreesToRadians(CGFloat(rotate)))
            context.translateBy(x: -center.x, y: -center.y)
            attributed.draw(in: textRect)
            context.restoreGState()
        } else {
            attributed.draw(in: textRect)
        }
    }
}

// MARK: - Position Resolution

private extension HybridNitroImageMarker {
    func resolvePosition(_ position: PositionOptions?, itemSize: CGSize, canvasSize: CGSize) -> CGPoint {
        let x: CGFloat
        let y: CGFloat
        if let rawX = position?.X {
            x = resolveDimension(rawX, total: canvasSize.width)
        } else {
            x = resolveX(position?.position, itemSize: itemSize, canvasSize: canvasSize)
        }

        if let rawY = position?.Y {
            y = resolveDimension(rawY, total: canvasSize.height)
        } else {
            y = resolveY(position?.position, itemSize: itemSize, canvasSize: canvasSize)
        }
        return CGPoint(x: x, y: y)
    }

    func resolveX(_ position: Position?, itemSize: CGSize, canvasSize: CGSize) -> CGFloat {
        switch position {
        case .topcenter, .center, .bottomcenter:
            return (canvasSize.width - itemSize.width) / 2
        case .topright, .bottomright:
            return canvasSize.width - itemSize.width
        default:
            return 0
        }
    }

    func resolveY(_ position: Position?, itemSize: CGSize, canvasSize: CGSize) -> CGFloat {
        switch position {
        case .center:
            return (canvasSize.height - itemSize.height) / 2
        case .bottomleft, .bottomcenter, .bottomright:
            return canvasSize.height - itemSize.height
        default:
            return 0
        }
    }

    func resolveDimension(_ value: String, total: CGFloat) -> CGFloat {
        if value.hasSuffix("%") {
            let trimmed = value.dropLast()
            if let percent = Double(trimmed) {
                return total * CGFloat(percent) / 100.0
            }
            return 0
        }
        return CGFloat(Double(value) ?? 0)
    }
}

// MARK: - Padding & Corner Radius

private extension HybridNitroImageMarker {
    func resolvePadding(_ style: TextBackgroundStyle?, textSize: CGSize) -> Padding {
        var padding = Padding()
        let defaultPadding = style?.padding
        if let defaultPadding = defaultPadding {
            padding = padding.withAll(resolvePaddingValue(defaultPadding, textSize: textSize))
        }
        if let horizontal = style?.paddingHorizontal {
            let value = resolvePaddingValue(horizontal, textSize: textSize)
            padding.left = value
            padding.right = value
        }
        if let vertical = style?.paddingVertical {
            let value = resolvePaddingValue(vertical, textSize: textSize)
            padding.top = value
            padding.bottom = value
        }
        if let left = style?.paddingLeft { padding.left = resolvePaddingValue(left, textSize: textSize) }
        if let right = style?.paddingRight { padding.right = resolvePaddingValue(right, textSize: textSize) }
        if let top = style?.paddingTop { padding.top = resolvePaddingValue(top, textSize: textSize) }
        if let bottom = style?.paddingBottom { padding.bottom = resolvePaddingValue(bottom, textSize: textSize) }
        return padding
    }

    func resolvePaddingValue(_ value: String, textSize: CGSize) -> CGFloat {
        if value.hasSuffix("%") {
            let trimmed = value.dropLast()
            if let percent = Double(trimmed) {
                return max(textSize.width, textSize.height) * CGFloat(percent) / 100.0
            }
            return 0
        }
        return CGFloat(Double(value) ?? 0)
    }

    func resolveCornerRadius(_ style: TextBackgroundStyle?) -> CornerRadii {
        if let all = style?.cornerRadiusAll {
            return CornerRadii(all: CGFloat(all))
        }
        if let value = style?.cornerRadius {
            return CornerRadii(
                topLeft: CGFloat(value.topLeft ?? 0),
                topRight: CGFloat(value.topRight ?? 0),
                bottomLeft: CGFloat(value.bottomLeft ?? 0),
                bottomRight: CGFloat(value.bottomRight ?? 0)
            )
        }
        return CornerRadii(all: 0)
    }

    func roundedPath(for rect: CGRect, radii: CornerRadii) -> UIBezierPath {
        let path = UIBezierPath()
        let minX = rect.minX
        let maxX = rect.maxX
        let minY = rect.minY
        let maxY = rect.maxY

        path.move(to: CGPoint(x: minX + radii.topLeft, y: minY))
        path.addLine(to: CGPoint(x: maxX - radii.topRight, y: minY))
        path.addQuadCurve(to: CGPoint(x: maxX, y: minY + radii.topRight),
                          controlPoint: CGPoint(x: maxX, y: minY))
        path.addLine(to: CGPoint(x: maxX, y: maxY - radii.bottomRight))
        path.addQuadCurve(to: CGPoint(x: maxX - radii.bottomRight, y: maxY),
                          controlPoint: CGPoint(x: maxX, y: maxY))
        path.addLine(to: CGPoint(x: minX + radii.bottomLeft, y: maxY))
        path.addQuadCurve(to: CGPoint(x: minX, y: maxY - radii.bottomLeft),
                          controlPoint: CGPoint(x: minX, y: maxY))
        path.addLine(to: CGPoint(x: minX, y: minY + radii.topLeft))
        path.addQuadCurve(to: CGPoint(x: minX + radii.topLeft, y: minY),
                          controlPoint: CGPoint(x: minX, y: minY))
        path.close()
        return path
    }
}

// MARK: - Shadow & Color

private extension HybridNitroImageMarker {
    func resolveShadow(_ style: TextStyle?) -> NSShadow? {
        let shadowStyle = style?.shadowStyle ?? style?.shadow
        guard let shadowStyle = shadowStyle else { return nil }
        let shadow = NSShadow()
        shadow.shadowColor = parseColor(shadowStyle.shadowColor)
        shadow.shadowBlurRadius = CGFloat(shadowStyle.shadowRadius)
        shadow.shadowOffset = CGSize(width: shadowStyle.shadowDx, height: shadowStyle.shadowDy)
        return shadow
    }

    func parseColor(_ value: String) -> UIColor {
        let sanitized = value.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines).lowercased()
        if sanitized.hasPrefix("#") {
            let hex = String(sanitized.dropFirst())
            if hex.count == 6 || hex.count == 8 {
                let scanner = Scanner(string: hex)
                var hexNumber: UInt64 = 0
                if scanner.scanHexInt64(&hexNumber) {
                    let r, g, b, a: CGFloat
                    if hex.count == 6 {
                        r = CGFloat((hexNumber & 0xFF0000) >> 16) / 255
                        g = CGFloat((hexNumber & 0x00FF00) >> 8) / 255
                        b = CGFloat(hexNumber & 0x0000FF) / 255
                        a = 1
                    } else {
                        r = CGFloat((hexNumber & 0xFF000000) >> 24) / 255
                        g = CGFloat((hexNumber & 0x00FF0000) >> 16) / 255
                        b = CGFloat((hexNumber & 0x0000FF00) >> 8) / 255
                        a = CGFloat(hexNumber & 0x000000FF) / 255
                    }
                    return UIColor(red: r, green: g, blue: b, alpha: a)
                }
            }
        }
        return UIColor.black
    }
}

// MARK: - Resize & Persist

private extension HybridNitroImageMarker {
    func resizeImage(_ image: UIImage, scale: CGFloat) -> UIImage {
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = image.scale
        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }

    func resizeImage(_ image: UIImage, maxSize: CGFloat) -> UIImage {
        let maxDimension = max(image.size.width, image.size.height)
        if maxDimension <= maxSize { return image }
        let scale = maxSize / maxDimension
        return resizeImage(image, scale: scale)
    }

    func persistImage(
        _ image: UIImage,
        quality: Double?,
        filename: String?,
        saveFormat: ImageFormat?
    ) throws -> String {
        let format = saveFormat ?? .png
        let fileName = filename ?? UUID().uuidString
        if format == .base64 {
            let data = imageData(image, format: .png, quality: quality)
            return data.base64EncodedString()
        }

        let dir = FileManager.default.temporaryDirectory
        let ext = format == .jpg ? "jpg" : "png"
        let url = dir.appendingPathComponent("\(fileName).\(ext)")
        let data = imageData(image, format: format, quality: quality)
        try data.write(to: url)
        return url.path
    }

    func imageData(_ image: UIImage, format: ImageFormat, quality: Double?) -> Data {
        if format == .jpg {
            let normalized = normalizeQuality(quality, maxValue: 100)
            return image.jpegData(compressionQuality: CGFloat(normalized)) ?? Data()
        }
        return image.pngData() ?? Data()
    }

    func normalizeQuality(_ quality: Double?, maxValue: Double) -> Double {
        guard let quality = quality else { return 1 }
        if quality <= 1 { return max(0, min(1, quality)) }
        return max(0, min(1, quality / maxValue))
    }

    func degreesToRadians(_ degrees: CGFloat) -> CGFloat {
        return degrees * CGFloat.pi / 180
    }
}

// MARK: - Support Types

private struct Padding {
    var left: CGFloat = 0
    var right: CGFloat = 0
    var top: CGFloat = 0
    var bottom: CGFloat = 0

    func withAll(_ value: CGFloat) -> Padding {
        return Padding(left: value, right: value, top: value, bottom: value)
    }
}

private struct CornerRadii {
    var topLeft: CGFloat
    var topRight: CGFloat
    var bottomLeft: CGFloat
    var bottomRight: CGFloat

    init(all: CGFloat) {
        topLeft = all
        topRight = all
        bottomLeft = all
        bottomRight = all
    }

    init(topLeft: CGFloat, topRight: CGFloat, bottomLeft: CGFloat, bottomRight: CGFloat) {
        self.topLeft = topLeft
        self.topRight = topRight
        self.bottomLeft = bottomLeft
        self.bottomRight = bottomRight
    }
}
