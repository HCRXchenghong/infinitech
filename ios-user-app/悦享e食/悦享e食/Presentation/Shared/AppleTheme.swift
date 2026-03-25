import SwiftUI

enum AppleTheme {
    static let pagePadding: CGFloat = 20

    static let brandGradient = LinearGradient(
        colors: [Color(red: 0.08, green: 0.36, blue: 0.96), Color(red: 0.15, green: 0.73, blue: 0.98)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let ambientGradient = LinearGradient(
        colors: [Color(red: 0.96, green: 0.97, blue: 1.0), Color(red: 0.93, green: 0.95, blue: 0.99)],
        startPoint: .top,
        endPoint: .bottom
    )

    static let cardBackground = Color.white.opacity(0.72)
    static let cardStroke = Color.white.opacity(0.65)

    static let heroShadow = Color.black.opacity(0.18)
}
