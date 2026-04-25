import Foundation
import Combine
import UserNotifications
import UIKit

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    private let tokenStore: AuthTokenStore
    private let pushService: PushServiceProtocol
    private let registerUseCase: RegisterPushDeviceUseCase
    private let ackUseCase: AckPushUseCase
    private var cachedDeviceToken: String?
    var onRoute: ((PushRoute) -> Void)?

    init(tokenStore: AuthTokenStore, pushService: PushServiceProtocol) {
        self.tokenStore = tokenStore
        self.pushService = pushService
        self.registerUseCase = RegisterPushDeviceUseCase(pushService: pushService)
        self.ackUseCase = AckPushUseCase(pushService: pushService)
        self.cachedDeviceToken = tokenStore.apnsDeviceToken
        super.init()
    }

    func requestAuthorizationAndRegister() {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error {
                AppLogger.error("Push permission request failed: \(error.localizedDescription)")
                return
            }
            guard granted else {
                AppLogger.warn("Push permission denied")
                return
            }

            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func registerDeviceToken(_ data: Data, appConfig: AppConfig) {
        let token = data.map { String(format: "%02.2hhx", $0) }.joined()
        cachedDeviceToken = token
        tokenStore.apnsDeviceToken = token
        syncRegistrationIfNeeded(appConfig: appConfig)
    }

    func syncRegistrationIfNeeded(appConfig: AppConfig) {
        guard let token = cachedDeviceToken, !token.isEmpty else {
            return
        }
        guard let userId = tokenStore.userId else {
            AppLogger.warn("Skip push registration because user is not logged in")
            return
        }

        let payload = PushRegistrationPayload(
            userId: userId,
            userType: tokenStore.userType,
            deviceToken: token,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.2",
            locale: Locale.current.identifier,
            timezone: TimeZone.current.identifier,
            appEnv: appConfig.environment.rawValue
        )

        Task {
            do {
                try await registerUseCase.execute(payload: payload)
                AppLogger.info("APNs token registered")
            } catch {
                AppLogger.error("APNs token register failed: \(error.localizedDescription)")
            }
        }
    }

    func unregisterCurrentDevice() async {
        guard let token = cachedDeviceToken, !token.isEmpty else {
            return
        }
        guard let userId = tokenStore.userId else {
            return
        }

        do {
            try await pushService.unregisterDevice(
                userId: userId,
                userType: tokenStore.userType,
                deviceToken: token
            )
            AppLogger.info("APNs token unregistered")
        } catch {
            AppLogger.error("APNs token unregister failed: \(error.localizedDescription)")
        }
    }

    func route(from userInfo: [AnyHashable: Any]) -> PushRoute {
        if let orderId = userInfo["orderId"] as? String {
            return .orderDetail(orderId: orderId)
        }
        if let roomId = userInfo["roomId"] as? String {
            return .chat(roomId: roomId)
        }
        if let notificationId = userInfo["notificationId"] as? String {
            return .notification(notificationId: notificationId)
        }
        return .unknown
    }
}

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        if let messageId = notification.request.content.userInfo["messageId"] as? String {
            Task { try? await ackUseCase.execute(messageId: messageId, action: "received") }
        }
        return [UNNotificationPresentationOptions.banner,
                UNNotificationPresentationOptions.list,
                UNNotificationPresentationOptions.sound,
                UNNotificationPresentationOptions.badge]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let userInfo = response.notification.request.content.userInfo
        if let messageId = userInfo["messageId"] as? String {
            Task { try? await ackUseCase.execute(messageId: messageId, action: "opened") }
        }
        let route = route(from: userInfo)
        await MainActor.run {
            onRoute?(route)
        }
    }
}
