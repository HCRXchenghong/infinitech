import Foundation

final class IncrementalSyncService {
    private let apiClient: APIClientProtocol
    private let cache: SQLiteCacheService

    init(apiClient: APIClientProtocol, cache: SQLiteCacheService) {
        self.apiClient = apiClient
        self.cache = cache
    }

    func bootstrap() async {
        do {
            try cache.bootstrap()
            AppLogger.info("SQLite cache ready")
        } catch {
            AppLogger.warn("SQLite bootstrap failed: \(error.localizedDescription)")
        }

        do {
            let _: [String: Int] = try await apiClient.request(
                path: "/sync/state",
                method: .GET,
                query: [],
                body: nil
            )
            AppLogger.info("Sync state fetched")
        } catch {
            AppLogger.warn("Sync state fetch failed, keep offline cache: \(error.localizedDescription)")
        }
    }
}
