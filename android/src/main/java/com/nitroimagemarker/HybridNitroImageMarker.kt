package com.nitroimagemarker

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Base64
import com.margelo.nitro.nitroimagemarker.HybridNitroImageMarkerSpec
import com.margelo.nitro.nitroimagemarker.ImageFormat
import com.margelo.nitro.nitroimagemarker.ImageMarkOptions
import com.margelo.nitro.nitroimagemarker.ImageOptions
import com.margelo.nitro.nitroimagemarker.Position
import com.margelo.nitro.nitroimagemarker.PositionOptions
import com.margelo.nitro.nitroimagemarker.ShadowLayerStyle
import com.margelo.nitro.nitroimagemarker.TextBackgroundStyle
import com.margelo.nitro.nitroimagemarker.TextBackgroundType
import com.margelo.nitro.nitroimagemarker.TextAlign
import com.margelo.nitro.nitroimagemarker.TextMarkOptions
import com.margelo.nitro.nitroimagemarker.TextOptions
import com.margelo.nitro.nitroimagemarker.TextStyle
import com.margelo.nitro.nitroimagemarker.WatermarkImageOptions
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.tan

class HybridNitroImageMarker : HybridNitroImageMarkerSpec() {
    override fun markText(options: TextMarkOptions): String {
        return render(
            background = options.backgroundImage,
            watermarkTexts = options.watermarkTexts,
            watermarkImages = emptyArray(),
            quality = options.quality,
            filename = options.filename,
            saveFormat = options.saveFormat,
            maxSize = options.maxSize
        )
    }

    override fun markImage(options: ImageMarkOptions): String {
        return render(
            background = options.backgroundImage,
            watermarkTexts = options.watermarkTexts ?: emptyArray(),
            watermarkImages = options.watermarkImages,
            quality = options.quality,
            filename = options.filename,
            saveFormat = options.saveFormat,
            maxSize = options.maxSize
        )
    }

    private fun render(
        background: ImageOptions,
        watermarkTexts: Array<TextOptions>,
        watermarkImages: Array<WatermarkImageOptions>,
        quality: Double?,
        filename: String?,
        saveFormat: ImageFormat?,
        maxSize: Double?
    ): String {
        var baseBitmap = loadBitmap(background.image)
        val scale = background.scale?.toFloat() ?: 1f
        if (scale > 0f && scale != 1f) {
            baseBitmap = scaleBitmap(baseBitmap, scale)
        }

        val outputBitmap = Bitmap.createBitmap(
            baseBitmap.width,
            baseBitmap.height,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(outputBitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val alpha = ((background.alpha ?: 1.0) * 255).toInt().coerceIn(0, 255)
        paint.alpha = alpha
        val rotate = background.rotate?.toFloat() ?: 0f
        drawBitmap(canvas, baseBitmap, 0f, 0f, rotate, paint)

        watermarkImages.forEach { watermark ->
            var bitmap = loadBitmap(watermark.src)
            val wmScale = watermark.scale?.toFloat() ?: 1f
            if (wmScale > 0f && wmScale != 1f) {
                bitmap = scaleBitmap(bitmap, wmScale)
            }
            val wmRotate = watermark.rotate?.toFloat() ?: 0f
            val wmAlpha = ((watermark.alpha ?: 1.0) * 255).toInt().coerceIn(0, 255)
            val position = resolvePosition(
                watermark.position,
                bitmap.width.toFloat(),
                bitmap.height.toFloat(),
                outputBitmap.width.toFloat(),
                outputBitmap.height.toFloat()
            )
            val wmPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.alpha = wmAlpha }
            drawBitmap(canvas, bitmap, position.first, position.second, wmRotate, wmPaint)
        }

        watermarkTexts.forEach { watermark ->
            drawText(canvas, watermark, outputBitmap.width.toFloat(), outputBitmap.height.toFloat())
        }

        val resized = if (maxSize != null && maxSize > 0) {
            resizeBitmap(outputBitmap, maxSize.toFloat())
        } else {
            outputBitmap
        }

        return persistBitmap(resized, quality, filename, saveFormat)
    }

    private fun loadBitmap(source: String): Bitmap {
        val path = if (source.startsWith("file://")) source.substring(7) else source
        val file = File(path)
        if (file.exists()) {
            return BitmapFactory.decodeFile(path)
                ?: throw IllegalArgumentException("Unable to decode image: $source")
        }

        decodeBase64(source)?.let { data ->
            return BitmapFactory.decodeByteArray(data, 0, data.size)
        }

        throw IllegalArgumentException("Unable to load image: $source")
    }

    private fun decodeBase64(source: String): ByteArray? {
        if (source.startsWith("data:")) {
            val index = source.indexOf("base64,")
            if (index >= 0) {
                val base64 = source.substring(index + 7)
                return Base64.decode(base64, Base64.DEFAULT)
            }
        }
        return try {
            Base64.decode(source, Base64.DEFAULT)
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    private fun drawBitmap(
        canvas: Canvas,
        bitmap: Bitmap,
        x: Float,
        y: Float,
        rotate: Float,
        paint: Paint
    ) {
        if (rotate == 0f) {
            canvas.drawBitmap(bitmap, x, y, paint)
            return
        }
        val centerX = x + bitmap.width / 2f
        val centerY = y + bitmap.height / 2f
        canvas.save()
        canvas.rotate(rotate, centerX, centerY)
        canvas.drawBitmap(bitmap, x, y, paint)
        canvas.restore()
    }

    private fun drawText(canvas: Canvas, watermark: TextOptions, canvasWidth: Float, canvasHeight: Float) {
        val style = watermark.style
        val textSize = style?.fontSize?.toFloat() ?: 20f
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor(style?.color ?: "#000000")
            this.textSize = textSize
            isUnderlineText = style?.underline == true
            isStrikeThruText = style?.strikeThrough == true
            textSkewX = style?.skewX?.let { tan(Math.toRadians(it).toFloat()) } ?: 0f
            style?.shadowStyle?.let { applyShadow(this, it) } ?: style?.shadow?.let { applyShadow(this, it) }
            style?.textAlign?.let {
                textAlign = when (it) {
                    TextAlign.CENTER -> Paint.Align.CENTER
                    TextAlign.RIGHT -> Paint.Align.RIGHT
                    else -> Paint.Align.LEFT
                }
            }
        }

        val typefaceStyle = when {
            style?.bold == true && style.italic == true -> android.graphics.Typeface.BOLD_ITALIC
            style?.bold == true -> android.graphics.Typeface.BOLD
            style?.italic == true -> android.graphics.Typeface.ITALIC
            else -> android.graphics.Typeface.NORMAL
        }
        textPaint.typeface = android.graphics.Typeface.create(style?.fontName, typefaceStyle)

        val text = watermark.text
        val textWidth = computeTextWidth(textPaint, text)
        val layout = buildLayout(text, textPaint, textWidth, style)
        val textHeight = layout.height.toFloat()

        val padding = resolvePadding(style?.textBackgroundStyle, textWidth, textHeight)
        var backgroundRect = RectF(
            0f,
            0f,
            textWidth + padding.left + padding.right,
            textHeight + padding.top + padding.bottom
        )

        val position = resolvePosition(
            watermark.position,
            backgroundRect.width(),
            backgroundRect.height(),
            canvasWidth,
            canvasHeight
        )
        backgroundRect.offsetTo(position.first, position.second)

        val backgroundStyle = style?.textBackgroundStyle
        val backgroundType = backgroundStyle?.type ?: TextBackgroundType.NONE
        val backgroundColor = backgroundStyle?.color ?: style?.backgroundColor
        if (backgroundColor != null && backgroundType != TextBackgroundType.NONE) {
            val drawRect = RectF(backgroundRect)
            if (backgroundType == TextBackgroundType.STRETCHX) {
                drawRect.left = 0f
                drawRect.right = canvasWidth
            } else if (backgroundType == TextBackgroundType.STRETCHY) {
                drawRect.top = 0f
                drawRect.bottom = canvasHeight
            }
            val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = parseColor(backgroundColor)
                this.style = Paint.Style.FILL
            }
            val radii = resolveCornerRadius(backgroundStyle)
            val path = roundedPath(drawRect, radii)
            canvas.drawPath(path, bgPaint)
        }

        val textLeft = backgroundRect.left + padding.left
        val textTop = backgroundRect.top + padding.top
        val rotate = style?.rotate?.toFloat() ?: 0f

        canvas.save()
        if (rotate != 0f) {
            val centerX = textLeft + textWidth / 2f
            val centerY = textTop + textHeight / 2f
            canvas.rotate(rotate, centerX, centerY)
        }

        val strokeWidth = style?.strokeWidth?.toFloat() ?: 0f
        val strokeColor = style?.strokeColor
        if (strokeWidth > 0 && strokeColor != null) {
            val strokePaint = TextPaint(textPaint).apply {
                this.style = Paint.Style.STROKE
                this.strokeWidth = strokeWidth
                color = parseColor(strokeColor)
            }
            buildLayout(text, strokePaint, textWidth, style).apply {
                canvas.translate(textLeft, textTop)
                draw(canvas)
                canvas.translate(-textLeft, -textTop)
            }
        }

        canvas.translate(textLeft, textTop)
        layout.draw(canvas)
        canvas.translate(-textLeft, -textTop)
        canvas.restore()
    }

    private fun buildLayout(
        text: String,
        paint: TextPaint,
        width: Float,
        style: TextStyle?
    ): StaticLayout {
        val alignment = when (style?.textAlign) {
            TextAlign.CENTER -> Layout.Alignment.ALIGN_CENTER
            TextAlign.RIGHT -> Layout.Alignment.ALIGN_OPPOSITE
            else -> Layout.Alignment.ALIGN_NORMAL
        }
        return StaticLayout.Builder.obtain(text, 0, text.length, paint, width.toInt().coerceAtLeast(1))
            .setAlignment(alignment)
            .build()
    }

    private fun computeTextWidth(paint: TextPaint, text: String): Float {
        return text.split("\n").maxOfOrNull { paint.measureText(it) } ?: 0f
    }

    private fun resolvePosition(
        position: PositionOptions?,
        itemWidth: Float,
        itemHeight: Float,
        canvasWidth: Float,
        canvasHeight: Float
    ): Pair<Float, Float> {
        val x = position?.X?.let { resolveDimension(it, canvasWidth) }
            ?: resolveX(position?.position, itemWidth, canvasWidth)
        val y = position?.Y?.let { resolveDimension(it, canvasHeight) }
            ?: resolveY(position?.position, itemHeight, canvasHeight)
        return Pair(x, y)
    }

    private fun resolveX(position: Position?, itemWidth: Float, canvasWidth: Float): Float {
        return when (position) {
            Position.TOPCENTER, Position.CENTER, Position.BOTTOMCENTER -> (canvasWidth - itemWidth) / 2f
            Position.TOPRIGHT, Position.BOTTOMRIGHT -> canvasWidth - itemWidth
            else -> 0f
        }
    }

    private fun resolveY(position: Position?, itemHeight: Float, canvasHeight: Float): Float {
        return when (position) {
            Position.CENTER -> (canvasHeight - itemHeight) / 2f
            Position.BOTTOMLEFT, Position.BOTTOMCENTER, Position.BOTTOMRIGHT -> canvasHeight - itemHeight
            else -> 0f
        }
    }

    private fun resolveDimension(value: String, total: Float): Float {
        return if (value.endsWith("%")) {
            value.dropLast(1).toFloatOrNull()?.let { total * it / 100f } ?: 0f
        } else {
            value.toFloatOrNull() ?: 0f
        }
    }

    private fun resolvePadding(style: TextBackgroundStyle?, textWidth: Float, textHeight: Float): Padding {
        var padding = Padding()
        style?.padding?.let { padding = padding.withAll(resolvePaddingValue(it, textWidth, textHeight)) }
        style?.paddingHorizontal?.let {
            val value = resolvePaddingValue(it, textWidth, textHeight)
            padding.left = value
            padding.right = value
        }
        style?.paddingVertical?.let {
            val value = resolvePaddingValue(it, textWidth, textHeight)
            padding.top = value
            padding.bottom = value
        }
        style?.paddingLeft?.let { padding.left = resolvePaddingValue(it, textWidth, textHeight) }
        style?.paddingRight?.let { padding.right = resolvePaddingValue(it, textWidth, textHeight) }
        style?.paddingTop?.let { padding.top = resolvePaddingValue(it, textWidth, textHeight) }
        style?.paddingBottom?.let { padding.bottom = resolvePaddingValue(it, textWidth, textHeight) }
        return padding
    }

    private fun resolvePaddingValue(value: String, textWidth: Float, textHeight: Float): Float {
        return if (value.endsWith("%")) {
            value.dropLast(1).toFloatOrNull()?.let { max(textWidth, textHeight) * it / 100f } ?: 0f
        } else {
            value.toFloatOrNull() ?: 0f
        }
    }

    private fun resolveCornerRadius(style: TextBackgroundStyle?): CornerRadii {
        style?.cornerRadiusAll?.let { return CornerRadii(it.toFloat(), it.toFloat(), it.toFloat(), it.toFloat()) }
        val radius = style?.cornerRadius
        return if (radius != null) {
            CornerRadii(
                radius.topLeft?.toFloat() ?: 0f,
                radius.topRight?.toFloat() ?: 0f,
                radius.bottomRight?.toFloat() ?: 0f,
                radius.bottomLeft?.toFloat() ?: 0f
            )
        } else {
            CornerRadii(0f, 0f, 0f, 0f)
        }
    }

    private fun roundedPath(rect: RectF, radii: CornerRadii): Path {
        val path = Path()
        val radiiArray = floatArrayOf(
            radii.topLeft, radii.topLeft,
            radii.topRight, radii.topRight,
            radii.bottomRight, radii.bottomRight,
            radii.bottomLeft, radii.bottomLeft
        )
        path.addRoundRect(rect, radiiArray, Path.Direction.CW)
        return path
    }

    private fun applyShadow(paint: TextPaint, shadow: ShadowLayerStyle) {
        paint.setShadowLayer(
            shadow.shadowRadius.toFloat(),
            shadow.shadowDx.toFloat(),
            shadow.shadowDy.toFloat(),
            parseColor(shadow.shadowColor)
        )
    }

    private fun parseColor(value: String): Int {
        if (value.startsWith("#") && value.length == 9) {
            val rgba = value.substring(1)
            val r = rgba.substring(0, 2)
            val g = rgba.substring(2, 4)
            val b = rgba.substring(4, 6)
            val a = rgba.substring(6, 8)
            return Color.parseColor("#$a$r$g$b")
        }
        return try {
            Color.parseColor(value)
        } catch (_: IllegalArgumentException) {
            Color.BLACK
        }
    }

    private fun scaleBitmap(bitmap: Bitmap, scale: Float): Bitmap {
        val width = (bitmap.width * scale).toInt().coerceAtLeast(1)
        val height = (bitmap.height * scale).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(bitmap, width, height, true)
    }

    private fun resizeBitmap(bitmap: Bitmap, maxSize: Float): Bitmap {
        val maxDimension = max(bitmap.width, bitmap.height).toFloat()
        if (maxDimension <= maxSize) return bitmap
        val scale = maxSize / maxDimension
        return scaleBitmap(bitmap, scale)
    }

    private fun persistBitmap(
        bitmap: Bitmap,
        quality: Double?,
        filename: String?,
        saveFormat: ImageFormat?
    ): String {
        val format = saveFormat ?: ImageFormat.PNG
        if (format == ImageFormat.BASE64) {
            val output = java.io.ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
            return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
        }

        val name = filename ?: UUID.randomUUID().toString()
        val extension = if (format == ImageFormat.JPG) "jpg" else "png"
        val outputFile = File.createTempFile(name, ".$extension")
        val stream = FileOutputStream(outputFile)
        val compressionQuality = normalizeQuality(quality, if (format == ImageFormat.JPG) 100 else 100)
        val compressFormat = if (format == ImageFormat.JPG) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
        bitmap.compress(compressFormat, compressionQuality, stream)
        stream.flush()
        stream.close()
        return outputFile.absolutePath
    }

    private fun normalizeQuality(quality: Double?, maxValue: Int): Int {
        if (quality == null) return 100
        val normalized = if (quality <= 1) (quality * maxValue) else quality
        return normalized.toInt().coerceIn(0, 100)
    }
}

private data class Padding(
    var left: Float = 0f,
    var right: Float = 0f,
    var top: Float = 0f,
    var bottom: Float = 0f
) {
    fun withAll(value: Float) = Padding(value, value, value, value)
}

private data class CornerRadii(
    val topLeft: Float,
    val topRight: Float,
    val bottomRight: Float,
    val bottomLeft: Float
)
