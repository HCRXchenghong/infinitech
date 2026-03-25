import SwiftUI

@main
struct __e_App: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var environment: AppEnvironment
    @StateObject private var bootstrapper: AppBootstrapper

    init() {
        let env = AppEnvironment()
        _environment = StateObject(wrappedValue: env)
        _bootstrapper = StateObject(wrappedValue: AppBootstrapper(environment: env))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(environment)
                .environmentObject(environment.session)
                .environmentObject(bootstrapper)
                .task {
                    if appDelegate.environment == nil {
                        appDelegate.environment = environment
                        appDelegate.bootstrapper = bootstrapper
                    }
                    await bootstrapper.start()
                }
        }
    }
}
