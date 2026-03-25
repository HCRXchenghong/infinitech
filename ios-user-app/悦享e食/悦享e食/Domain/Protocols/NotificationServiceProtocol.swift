import Foundation

protocol NotificationServiceProtocol {
    func fetchNotifications(page: Int, pageSize: Int) async throws -> AppNotificationPage
    func fetchNotificationDetail(id: String) async throws -> AppNotificationDetail
}
