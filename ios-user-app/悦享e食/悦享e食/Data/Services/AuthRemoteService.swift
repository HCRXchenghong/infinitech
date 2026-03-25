import Foundation

final class AuthRemoteService {
    private let apiClient: APIClientProtocol

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient
    }

    func requestSMSCode(phone: String, scene: String) async throws -> SMSCodeResponse {
        struct Payload: Codable {
            let phone: String
            let scene: String
        }

        return try await apiClient.request(
            path: "/request-sms-code",
            method: .POST,
            query: [],
            body: Payload(phone: phone, scene: scene)
        )
    }

    func loginWithCode(phone: String, code: String) async throws -> AuthLoginResponse {
        struct Payload: Codable {
            let phone: String
            let code: String
        }

        return try await apiClient.request(
            path: "/auth/login",
            method: .POST,
            query: [],
            body: Payload(phone: phone, code: code)
        )
    }

    func loginWithPassword(phone: String, password: String) async throws -> AuthLoginResponse {
        struct Payload: Codable {
            let phone: String
            let password: String
        }

        return try await apiClient.request(
            path: "/auth/login",
            method: .POST,
            query: [],
            body: Payload(phone: phone, password: password)
        )
    }

    func register(phone: String, nickname: String, password: String) async throws -> RegisterResponse {
        struct Payload: Codable {
            let phone: String
            let name: String
            let password: String
        }

        return try await apiClient.request(
            path: "/auth/register",
            method: .POST,
            query: [],
            body: Payload(phone: phone, name: nickname, password: password)
        )
    }

    func setNewPassword(phone: String, code: String, password: String) async throws -> RegisterResponse {
        struct Payload: Codable {
            let phone: String
            let code: String
            let password: String
        }

        return try await apiClient.request(
            path: "/auth/set-new-password",
            method: .POST,
            query: [],
            body: Payload(phone: phone, code: code, password: password)
        )
    }
}
