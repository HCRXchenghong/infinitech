import Foundation
import Combine

@MainActor
final class AppBootstrapper: ObservableObject {
    @Published private(set) var isReady = false

    private let environment: AppEnvironment
    let pushManager: PushNotificationManager

    init(environment: AppEnvironment) {
        self.environment = environment
        self.pushManager = PushNotificationManager(tokenStore: environment.tokenStore, pushService: environment.pushService)
        self.pushManager.onRoute = { [weak environment] route in
            environment?.coordinator.handlePushRoute(route)
        }
    }

    func start() async {
        if isReady { return }
        await environment.syncService.bootstrap()
        pushManager.requestAuthorizationAndRegister()
        isReady = true
    }
}
