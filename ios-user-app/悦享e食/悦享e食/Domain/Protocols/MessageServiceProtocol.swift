import Foundation

protocol MessageServiceProtocol {
    func fetchConversations() async throws -> [ConversationSummary]
    func fetchHistory(roomId: String) async throws -> [ChatMessage]
    func sendMessage(roomId: String, senderId: String, senderName: String, content: String) async throws -> ChatMessage
}
