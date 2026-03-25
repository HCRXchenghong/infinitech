import SwiftUI

struct AppleBackground: View {
    var body: some View {
        ZStack {
            AppleTheme.ambientGradient
                .ignoresSafeArea()

            Circle()
                .fill(Color.blue.opacity(0.20))
                .frame(width: 260, height: 260)
                .blur(radius: 40)
                .offset(x: -120, y: -280)

            Circle()
                .fill(Color.cyan.opacity(0.22))
                .frame(width: 240, height: 240)
                .blur(radius: 35)
                .offset(x: 130, y: -240)
        }
    }
}
