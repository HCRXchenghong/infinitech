import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var env: AppEnvironment
    @EnvironmentObject private var session: AppSessionStore
    @EnvironmentObject private var bootstrapper: AppBootstrapper

    var body: some View {
        Group {
            if bootstrapper.isReady {
                if session.isAuthenticated {
                    RootTabView()
                        .environmentObject(env)
                        .environmentObject(bootstrapper)
                } else {
                    AuthGatewayView(environment: env)
                        .environmentObject(env)
                        .environmentObject(bootstrapper)
                }
            } else {
                ZStack {
                    AppleBackground()
                    ProgressView("app.bootstrapping")
                        .padding(18)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
        }
        .onChange(of: session.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                bootstrapper.pushManager.syncRegistrationIfNeeded(appConfig: env.config)
            }
        }
    }
}
