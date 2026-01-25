//
//  HybridNitroImageMarker.swift
//  Pods
//
//  Created by Prahlad on 26/1/2026.
//

import Foundation
import UIKit

class HybridNitroImageMarker: HybridNitroImageMarkerSpec {
    func markText(options: TextMarkOptions) throws -> String {
        return try render(
            background: options.backgroundImage,
            watermarkTexts: options.watermarkTexts,
            watermarkImages: [],
            quality: options.quality,
            filename: options.filename,
            saveFormat: options.saveFormat,
            maxSize: options.maxSize
        )
    }

    func markImage(options: ImageMarkOptions) throws -> String {
        return try render(
            background: options.backgroundImage,
            watermarkTexts: options.watermarkTexts ?? [],
            watermarkImages: options.watermarkImages,
            quality: options.quality,
            filename: options.filename,
            saveFormat: options.saveFormat,
            maxSize: options.maxSize
        )
    }
}

private extension HybridNitroImageMarker {
    func render(
        background: ImageOptions,
        watermarkTexts: [TextOptions],
        watermarkImages: [WatermarkImageOptions],
        quality: Double?,
        filename: String?,
        saveFormat: ImageFormat?,
        maxSize: Double?
    ) throws -> String {
        var baseImage = try loadImage(source: background.image)
        if let scale = background.scale, scale > 0 {
            baseImage = resizeImage(baseImage, scale: CGFloat(scale))
        }
        let bgRotate = CGFloat(background.rotate ?? 0)
        let bgAlpha = CGFloat(background.alpha ?? 1)

        let canvasSize = baseImage.size
        UIGraphicsBeginImageContextWithOptions(canvasSize, false, baseImage.scale)
        guard let context = UIGraphicsGetCurrentContext() else {
            throw NSError(domain: "NitroImageMarker", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create graphics context."])
        }

        context.saveGState()
        context.setAlpha(bgAlpha)
        drawImage(baseImage, in: CGRect(origin: .zero, size: canvasSize), rotate: bgRotate, context: context)
        context.restoreGState()

        for imageWatermark in watermarkImages {
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
        }

        for textWatermark in watermarkTexts {
            drawText(textWatermark, in: canvasSize, context: context)
        }

        guard var output = UIGraphicsGetImageFromCurrentImageContext() else {
            UIGraphicsEndImageContext()
            throw NSError(domain: "NitroImageMarker", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to read output image."])
        }
        UIGraphicsEndImageContext()

        if let maxSize = maxSize, maxSize > 0 {
            output = resizeImage(output, maxSize: CGFloat(maxSize))
        }

        return try persistImage(output, quality: quality, filename: filename, saveFormat: saveFormat)
    }

    func loadImage(source: String) throws -> UIImage {
        let path = source.hasPrefix("file://") ? String(source.dropFirst(7)) : source
        if FileManager.default.fileExists(atPath: path), let image = UIImage(contentsOfFile: path) {
            return image
        }

        if let data = decodeBase64(source), let image = UIImage(data: data) {
            return image
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
        let shadow = resolveShadow(style)
        let obliqueness = style?.skewX.map { CGFloat(tan(degreesToRadians(CGFloat($0)))) }
        let strokeWidth = CGFloat(style?.strokeWidth ?? 0)
        let strokeColor = style?.strokeColor.map(parseColor)

        var attributes: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: color,
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

        let attributed = NSAttributedString(string: watermark.text, attributes: attributes)
        let textBounds = attributed.boundingRect(
            with: CGSize(width: 100000, height: 100000),
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

        var textRect = CGRect(
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

    func resizeImage(_ image: UIImage, scale: CGFloat) -> UIImage {
        let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        UIGraphicsBeginImageContextWithOptions(newSize, false, image.scale)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let scaled = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()
        return scaled
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
