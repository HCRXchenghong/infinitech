import Foundation

enum ConversationRole: String, Codable {
    case rider
    case shop
    case user
    case cs
    case unknown
}

struct ConversationSummary: Identifiable, Equatable {
    let id: String
    let chatId: String
    let name: String
    let role: ConversationRole
    let avatar: String?
    let preview: String
    let timeText: String
    let unread: Int
    let updatedAt: Date?
}

enum ChatMessageType: String, Codable {
    case text
    case image
    case order
    case unknown
}

struct ChatMessage: Identifiable, Equatable {
    let id: String
    let chatId: String
    let senderId: String?
    let senderRole: ConversationRole
    let senderName: String
    let content: String
    let type: ChatMessageType
    let imageURL: String?
    let timeText: String
    let isSelf: Bool
}
