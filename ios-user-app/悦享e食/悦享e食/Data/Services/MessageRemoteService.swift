import Foundation

final class MessageRemoteService: MessageServiceProtocol {
    private let apiClient: APIClientProtocol

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient
    }

    func fetchConversations() async throws -> [ConversationSummary] {
        let rows: [[String: JSONValue]] = try await apiClient.request(
            path: "/messages/conversations",
            method: .GET,
            query: [],
            body: nil
        )

        return rows
            .compactMap(mapConversationRow)
            .sorted { lhs, rhs in
                switch (lhs.updatedAt, rhs.updatedAt) {
                case let (l?, r?):
                    return l > r
                case (_?, nil):
                    return true
                case (nil, _?):
                    return false
                case (nil, nil):
                    return lhs.id > rhs.id
                }
            }
    }

    func fetchHistory(roomId: String) async throws -> [ChatMessage] {
        let pathID = roomId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? roomId
        let rows: [[String: JSONValue]] = try await apiClient.request(
            path: "/messages/\(pathID)",
            method: .GET,
            query: [],
            body: nil
        )

        return rows.compactMap(mapMessageRow)
    }

    func sendMessage(roomId: String, senderId: String, senderName: String, content: String) async throws -> ChatMessage {
        struct Payload: Codable {
            let chatId: String
            let senderId: String
            let senderRole: String
            let senderName: String
            let content: String
            let messageType: String
        }

        let payload = Payload(
            chatId: roomId,
            senderId: senderId,
            senderRole: "user",
            senderName: senderName,
            content: content,
            messageType: "text"
        )

        let row: [String: JSONValue] = try await apiClient.request(
            path: "/messages/sync",
            method: .POST,
            query: [],
            body: payload
        )

        guard let message = mapMessageRow(row) else {
            throw APIClientError.invalidResponse
        }
        return message
    }

    private func mapConversationRow(_ row: [String: JSONValue]) -> ConversationSummary? {
        guard let chatID = firstString(row, keys: ["chatId", "id"]), !chatID.isEmpty else {
            return nil
        }

        let updatedAtMillis = firstDouble(row, keys: ["updatedAt"])
        let updatedAt = updatedAtMillis.map { Date(timeIntervalSince1970: $0 / 1000) }
        let preview = firstString(row, keys: ["lastMessage", "msg"]) ?? String(localized: "messages.preview.empty")

        return ConversationSummary(
            id: chatID,
            chatId: chatID,
            name: firstString(row, keys: ["name"]) ?? String(localized: "messages.name.unknown"),
            role: mapRole(firstString(row, keys: ["role"]) ?? ""),
            avatar: firstString(row, keys: ["avatar"]),
            preview: preview,
            timeText: firstString(row, keys: ["time"]) ?? "--:--",
            unread: max(0, firstInt(row, keys: ["unread"]) ?? 0),
            updatedAt: updatedAt
        )
    }

    private func mapMessageRow(_ row: [String: JSONValue]) -> ChatMessage? {
        guard let id = firstString(row, keys: ["id"]), !id.isEmpty else {
            return nil
        }
        let chatID = firstString(row, keys: ["chatId"]) ?? ""
        let senderID = firstString(row, keys: ["senderId"])
        let senderRole = mapRole(firstString(row, keys: ["senderRole"]) ?? "")
        let type = mapMessageType(firstString(row, keys: ["messageType"]) ?? "")
        return ChatMessage(
            id: id,
            chatId: chatID,
            senderId: senderID,
            senderRole: senderRole,
            senderName: firstString(row, keys: ["sender"]) ?? String(localized: "messages.name.unknown"),
            content: firstString(row, keys: ["content"]) ?? "",
            type: type,
            imageURL: firstString(row, keys: ["imageUrl", "image_url"]),
            timeText: firstString(row, keys: ["time"]) ?? "--:--",
            isSelf: senderRole == .user
        )
    }

    private func mapRole(_ raw: String) -> ConversationRole {
        switch raw.lowercased() {
        case "rider":
            return .rider
        case "shop", "merchant":
            return .shop
        case "user":
            return .user
        case "cs", "support", "admin":
            return .cs
        default:
            return .unknown
        }
    }

    private func mapMessageType(_ raw: String) -> ChatMessageType {
        switch raw.lowercased() {
        case "text":
            return .text
        case "image":
            return .image
        case "order":
            return .order
        default:
            return .unknown
        }
    }

    private func firstString(_ row: [String: JSONValue], keys: [String]) -> String? {
        for key in keys {
            guard let value = row[key]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !value.isEmpty else {
                continue
            }
            return value
        }
        return nil
    }

    private func firstDouble(_ row: [String: JSONValue], keys: [String]) -> Double? {
        for key in keys {
            if let value = row[key]?.doubleValue {
                return value
            }
        }
        return nil
    }

    private func firstInt(_ row: [String: JSONValue], keys: [String]) -> Int? {
        for key in keys {
            if let value = row[key]?.intValue {
                return value
            }
        }
        return nil
    }
}
