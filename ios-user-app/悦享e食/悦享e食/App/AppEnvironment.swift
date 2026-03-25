import Foundation
import Combine

@MainActor
final class AppEnvironment: ObservableObject {
    let config: AppConfig
    let tokenStore: AuthTokenStore
    let session: AppSessionStore
    let apiClient: APIClientProtocol
    let authService: AuthRemoteService
    let orderService: OrderServiceProtocol
    let messageService: MessageServiceProtocol
    let walletService: WalletServiceProtocol
    let notificationService: NotificationServiceProtocol
    let pushService: PushServiceProtocol
    let mapService: MapServiceProtocol
    let syncService: IncrementalSyncService
    let coordinator: AppCoordinator

    init() {
        self.config = AppConfig.current()
        self.tokenStore = AuthTokenStore()
        self.session = AppSessionStore(tokenStore: tokenStore)
        self.apiClient = APIClient(config: config, tokenStore: tokenStore)
        self.authService = AuthRemoteService(apiClient: apiClient)
        self.orderService = OrderRemoteService(apiClient: apiClient)
        self.messageService = MessageRemoteService(apiClient: apiClient)
        self.walletService = WalletRemoteService(apiClient: apiClient)
        self.notificationService = NotificationRemoteService(apiClient: apiClient)
        self.pushService = PushRemoteService(apiClient: apiClient)
        self.mapService = MapRemoteService(apiClient: apiClient)
        let sqlite = SQLiteCacheService()
        self.syncService = IncrementalSyncService(apiClient: apiClient, cache: sqlite)
        self.coordinator = AppCoordinator()
    }
}
