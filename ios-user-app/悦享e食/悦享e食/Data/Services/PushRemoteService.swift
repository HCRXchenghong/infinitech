import Foundation

private struct APIResponseEnvelope<T: Decodable>: Decodable {
    let success: Bool?
    let data: T?
}

private struct EmptyResponse: Decodable {}

final class PushRemoteService: PushServiceProtocol {
    private let apiClient: APIClientProtocol

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient
    }

    func registerDevice(_ payload: PushRegistrationPayload) async throws {
        _ = try await apiClient.request(
            path: "/mobile/push/devices/register",
            method: .POST,
            query: [],
            body: payload
        ) as APIResponseEnvelope<EmptyResponse>
    }

    func unregisterDevice(userId: String, userType: String, deviceToken: String) async throws {
        struct Request: Codable {
            let userId: String
            let userType: String
            let deviceToken: String
        }
        let payload = Request(userId: userId, userType: userType, deviceToken: deviceToken)

        _ = try await apiClient.request(
            path: "/mobile/push/devices/unregister",
            method: .POST,
            query: [],
            body: payload
        ) as APIResponseEnvelope<EmptyResponse>
    }

    func ack(_ payload: PushAckPayload) async throws {
        _ = try await apiClient.request(
            path: "/mobile/push/ack",
            method: .POST,
            query: [],
            body: payload
        ) as APIResponseEnvelope<EmptyResponse>
    }
}
