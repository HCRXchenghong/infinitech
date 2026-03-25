import Foundation
import Combine

@MainActor
final class AppSessionStore: ObservableObject {
    @Published private(set) var isAuthenticated = false
    @Published private(set) var userId: String?
    @Published private(set) var userPhone: String?
    @Published private(set) var userType: String = "customer"
    @Published private(set) var userName: String?

    private let tokenStore: AuthTokenStore

    init(tokenStore: AuthTokenStore) {
        self.tokenStore = tokenStore
        refreshFromStorage()
    }

    func refreshFromStorage() {
        let token = tokenStore.accessToken
        let uid = tokenStore.userId

        isAuthenticated = !(token ?? "").isEmpty && !(uid ?? "").isEmpty
        userId = uid
        userPhone = tokenStore.userPhone
        userType = tokenStore.userType
        userName = tokenStore.userName
    }

    func saveLogin(
        accessToken: String,
        refreshToken: String,
        expiresIn: TimeInterval?,
        userId: String,
        userPhone: String?,
        userType: String,
        userName: String?
    ) {
        tokenStore.saveAuth(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            userId: userId,
            userPhone: userPhone,
            userType: userType,
            userName: userName
        )
        refreshFromStorage()
    }

    func logout() {
        tokenStore.clear()
        refreshFromStorage()
    }
}
