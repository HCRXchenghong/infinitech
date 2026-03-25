import Foundation
import UIKit
import UserNotifications

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    var bootstrapper: AppBootstrapper?
    var environment: AppEnvironment?

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        guard let bootstrapper, let environment else {
            AppLogger.warn("AppDelegate not wired when APNs token received")
            return
        }
        bootstrapper.pushManager.registerDeviceToken(deviceToken, appConfig: environment.config)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        AppLogger.error("APNs register failed: \(error.localizedDescription)")
    }
}
