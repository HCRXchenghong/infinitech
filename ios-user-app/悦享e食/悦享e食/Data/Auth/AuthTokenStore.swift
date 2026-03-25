import Foundation

final class AuthTokenStore {
    private let keychain = KeychainStore()

    private enum Keys {
        static let accessToken = "yx_access_token"
        static let refreshToken = "yx_refresh_token"
        static let userId = "yx_user_id"
        static let userPhone = "yx_user_phone"
        static let userType = "yx_user_type"
        static let userName = "yx_user_name"
        static let tokenExpiresAt = "yx_token_expires_at"
        static let apnsDeviceToken = "yx_apns_device_token"
    }

    var accessToken: String? {
        get { keychain.get(Keys.accessToken) }
        set {
            if let newValue { keychain.set(newValue, for: Keys.accessToken) }
            else { keychain.remove(Keys.accessToken) }
        }
    }

    var refreshToken: String? {
        get { keychain.get(Keys.refreshToken) }
        set {
            if let newValue { keychain.set(newValue, for: Keys.refreshToken) }
            else { keychain.remove(Keys.refreshToken) }
        }
    }

    var userId: String? {
        get { keychain.get(Keys.userId) }
        set {
            if let newValue { keychain.set(newValue, for: Keys.userId) }
            else { keychain.remove(Keys.userId) }
        }
    }

    var userPhone: String? {
        get { keychain.get(Keys.userPhone) }
        set {
            if let newValue { keychain.set(newValue, for: Keys.userPhone) }
            else { keychain.remove(Keys.userPhone) }
        }
    }

    var userType: String {
        get { keychain.get(Keys.userType) ?? "customer" }
        set { keychain.set(newValue, for: Keys.userType) }
    }

    var userName: String? {
        get { keychain.get(Keys.userName) }
        set {
            if let newValue { keychain.set(newValue, for: Keys.userName) }
            else { keychain.remove(Keys.userName) }
        }
    }

    var tokenExpiresAt: TimeInterval? {
        get {
            guard let raw = keychain.get(Keys.tokenExpiresAt),
                  let value = TimeInterval(raw) else {
                return nil
            }
            return value
        }
        set {
            if let newValue {
                keychain.set(String(newValue), for: Keys.tokenExpiresAt)
            } else {
                keychain.remove(Keys.tokenExpiresAt)
            }
        }
    }

    var apnsDeviceToken: String? {
        get { keychain.get(Keys.apnsDeviceToken) }
        set {
            if let newValue {
                keychain.set(newValue, for: Keys.apnsDeviceToken)
            } else {
                keychain.remove(Keys.apnsDeviceToken)
            }
        }
    }

    func saveAuth(
        accessToken: String,
        refreshToken: String,
        expiresIn: TimeInterval?,
        userId: String,
        userPhone: String?,
        userType: String,
        userName: String?
    ) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.userId = userId
        self.userPhone = userPhone
        self.userType = userType
        self.userName = userName

        if let expiresIn {
            tokenExpiresAt = Date().addingTimeInterval(expiresIn).timeIntervalSince1970
        } else {
            tokenExpiresAt = nil
        }
    }

    func clear() {
        accessToken = nil
        refreshToken = nil
        userId = nil
        userPhone = nil
        userName = nil
        tokenExpiresAt = nil
        keychain.remove(Keys.userType)
    }
}
