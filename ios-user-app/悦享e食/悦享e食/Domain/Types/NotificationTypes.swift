import Foundation

struct AppNotificationSummary: Identifiable, Equatable {
    let id: String
    let title: String
    let summary: String
    let coverURL: String?
    let source: String
    let createdAtText: String
    let isRead: Bool
}

struct AppNotificationPage: Equatable {
    let items: [AppNotificationSummary]
    let page: Int
    let pageSize: Int
}

enum AppNotificationBlock: Equatable {
    case paragraph(String)
    case heading(String)
    case quote(String)
    case bulletList([String])
    case image(url: String, caption: String?)
}

struct AppNotificationDetail: Identifiable, Equatable {
    let id: String
    let title: String
    let source: String
    let timeText: String
    let createdAt: Date?
    let coverURL: String?
    let blocks: [AppNotificationBlock]
}
