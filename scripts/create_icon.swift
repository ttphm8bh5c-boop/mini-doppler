import Cocoa

func createIconImage(size: CGFloat) -> NSImage {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()

    guard let ctx = NSGraphicsContext.current?.cgContext else {
        image.unlockFocus()
        return image
    }

    let rect = CGRect(x: 0, y: 0, width: size, height: size)
    let inset: CGFloat = size * 0.08
    let roundedRect = rect.insetBy(dx: inset, dy: inset)
    let cornerRadius: CGFloat = size * 0.22

    // Background Shadow
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: -size * 0.04), blur: size * 0.06, color: NSColor(white: 0, alpha: 0.35).cgColor)
    let bgPath = CGPath(roundedRect: roundedRect, cornerWidth: cornerRadius, cornerHeight: cornerRadius, transform: nil)
    ctx.addPath(bgPath)
    ctx.setFillColor(NSColor(red: 0.08, green: 0.15, blue: 0.35, alpha: 1.0).cgColor)
    ctx.fillPath()
    ctx.restoreGState()

    // Background Gradient (Deep Medical Sapphire Blue to Vibrant Azure)
    ctx.saveGState()
    ctx.addPath(bgPath)
    ctx.clip()

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let colors = [
        NSColor(red: 0.08, green: 0.22, blue: 0.52, alpha: 1.0).cgColor,
        NSColor(red: 0.02, green: 0.50, blue: 0.85, alpha: 1.0).cgColor
    ] as CFArray
    let locations: [CGFloat] = [0.0, 1.0]
    if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: locations) {
        ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: size), end: CGPoint(x: size, y: 0), options: [])
    }

    // Grid lines for ultrasound monitor aesthetic
    ctx.setStrokeColor(NSColor(white: 1.0, alpha: 0.12).cgColor)
    ctx.setLineWidth(size * 0.005)
    let gridCount = 6
    let step = roundedRect.width / CGFloat(gridCount)
    for i in 1..<gridCount {
        let x = roundedRect.minX + CGFloat(i) * step
        let y = roundedRect.minY + CGFloat(i) * step
        ctx.move(to: CGPoint(x: x, y: roundedRect.minY))
        ctx.addLine(to: CGPoint(x: x, y: roundedRect.maxY))
        ctx.move(to: CGPoint(x: roundedRect.minX, y: y))
        ctx.addLine(to: CGPoint(x: roundedRect.maxX, y: y))
    }
    ctx.strokePath()

    // Doppler Ultrasound Waveform (Systolic peak + diastolic flow)
    let wavePath = CGMutablePath()
    let startX = roundedRect.minX + size * 0.06
    let endX = roundedRect.maxX - size * 0.06
    let baselineY = roundedRect.minY + size * 0.38
    let peakY = roundedRect.minY + size * 0.68
    let notchY = roundedRect.minY + size * 0.46
    let diastoleY = roundedRect.minY + size * 0.44

    wavePath.move(to: CGPoint(x: startX, y: baselineY))
    wavePath.addLine(to: CGPoint(x: startX + size * 0.12, y: baselineY))
    // Wave 1
    wavePath.addCurve(
        to: CGPoint(x: startX + size * 0.28, y: peakY),
        control1: CGPoint(x: startX + size * 0.16, y: baselineY),
        control2: CGPoint(x: startX + size * 0.20, y: peakY)
    )
    wavePath.addCurve(
        to: CGPoint(x: startX + size * 0.36, y: notchY),
        control1: CGPoint(x: startX + size * 0.32, y: peakY),
        control2: CGPoint(x: startX + size * 0.34, y: notchY)
    )
    wavePath.addCurve(
        to: CGPoint(x: startX + size * 0.46, y: diastoleY),
        control1: CGPoint(x: startX + size * 0.38, y: notchY + size * 0.03),
        control2: CGPoint(x: startX + size * 0.42, y: diastoleY)
    )
    // Wave 2
    wavePath.addCurve(
        to: CGPoint(x: startX + size * 0.58, y: peakY * 0.95),
        control1: CGPoint(x: startX + size * 0.49, y: diastoleY),
        control2: CGPoint(x: startX + size * 0.52, y: peakY * 0.95)
    )
    wavePath.addCurve(
        to: CGPoint(x: startX + size * 0.66, y: notchY * 0.96),
        control1: CGPoint(x: startX + size * 0.61, y: peakY * 0.95),
        control2: CGPoint(x: startX + size * 0.64, y: notchY * 0.96)
    )
    wavePath.addLine(to: CGPoint(x: endX, y: baselineY))

    // Glow effect on waveform
    ctx.saveGState()
    ctx.setShadow(offset: .zero, blur: size * 0.04, color: NSColor(red: 0.3, green: 0.9, blue: 1.0, alpha: 0.9).cgColor)
    ctx.setStrokeColor(NSColor(red: 0.6, green: 0.95, blue: 1.0, alpha: 0.95).cgColor)
    ctx.setLineWidth(size * 0.024)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    ctx.addPath(wavePath)
    ctx.strokePath()
    ctx.restoreGState()

    // Inner bright waveform stroke
    ctx.setStrokeColor(NSColor.white.cgColor)
    ctx.setLineWidth(size * 0.012)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    ctx.addPath(wavePath)
    ctx.strokePath()

    // Upper Stethoscope / Ultrasound Badge
    let probeRect = CGRect(x: size * 0.38, y: size * 0.68, width: size * 0.24, height: size * 0.12)
    let probePath = CGPath(roundedRect: probeRect, cornerWidth: size * 0.04, cornerHeight: size * 0.04, transform: nil)
    ctx.setFillColor(NSColor(white: 1.0, alpha: 0.25).cgColor)
    ctx.addPath(probePath)
    ctx.fillPath()

    // Top Title / Badge "CPR"
    let font = NSFont.systemFont(ofSize: size * 0.13, weight: .black)
    let textAttrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor.white
    ]
    let text = "CPR" as NSString
    let textSize = text.size(withAttributes: textAttrs)
    let textPoint = CGPoint(x: (size - textSize.width) / 2, y: size * 0.16)
    text.draw(at: textPoint, withAttributes: textAttrs)

    // Subtitle "DOPPLER"
    let subFont = NSFont.systemFont(ofSize: size * 0.045, weight: .heavy)
    let subAttrs: [NSAttributedString.Key: Any] = [
        .font: subFont,
        .foregroundColor: NSColor(white: 1.0, alpha: 0.85)
    ]
    let subText = "DOPPLER FOLLOW" as NSString
    let subSize = subText.size(withAttributes: subAttrs)
    let subPoint = CGPoint(x: (size - subSize.width) / 2, y: size * 0.10)
    subText.draw(at: subPoint, withAttributes: subAttrs)

    ctx.restoreGState()
    image.unlockFocus()
    return image
}

let icon = createIconImage(size: 1024)
guard let tiffData = icon.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Failed to generate PNG")
}

let iconsetPath = "AppIcon.iconset"
let fm = FileManager.default
try? fm.removeItem(atPath: iconsetPath)
try? fm.createDirectory(atPath: iconsetPath, withIntermediateDirectories: true)

let icon1024Path = "\(iconsetPath)/icon_512x512@2x.png"
try! pngData.write(to: URL(fileURLWithPath: icon1024Path))

// Sizes for standard macOS iconset
let sizes: [(String, CGFloat)] = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512)
]

for (name, s) in sizes {
    let subImg = createIconImage(size: s)
    if let subTiff = subImg.tiffRepresentation,
       let subBitmap = NSBitmapImageRep(data: subTiff),
       let subPng = subBitmap.representation(using: .png, properties: [:]) {
        try? subPng.write(to: URL(fileURLWithPath: "\(iconsetPath)/\(name)"))
    }
}

print("Iconset generated successfully at \(iconsetPath)")
