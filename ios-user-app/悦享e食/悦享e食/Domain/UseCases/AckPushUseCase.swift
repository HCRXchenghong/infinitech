import Foundation

struct AckPushUseCase {
    private let pushService: PushServiceProtocol

    init(pushService: PushServiceProtocol) {
        self.pushService = pushService
    }

    func execute(messageId: String, action: String) async throws {
        let payload = PushAckPayload(
            messageId: messageId,
            action: action,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
        try await pushService.ack(payload)
    }
}
