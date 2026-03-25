import Foundation

enum HTTPMethod: String {
    case GET
    case POST
    case PUT
    case DELETE
}

enum APIClientError: LocalizedError {
    case invalidURL
    case invalidResponse
    case networkUnavailable(baseURL: String)
    case requestTimeout(baseURL: String)
    case serverError(statusCode: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid request URL"
        case .invalidResponse:
            return "Invalid server response"
        case let .networkUnavailable(baseURL):
            return "无法连接服务器，请确认后端已启动：\(baseURL)"
        case let .requestTimeout(baseURL):
            return "服务器响应超时，请确认后端服务可用：\(baseURL)"
        case let .serverError(code, message):
            return "Server error (\(code)): \(message)"
        }
    }
}

protocol APIClientProtocol {
    func request<T: Decodable>(
        path: String,
        method: HTTPMethod,
        query: [URLQueryItem],
        body: (any Encodable)?
    ) async throws -> T
}

final class APIClient: APIClientProtocol {
    private let config: AppConfig
    private let tokenStore: AuthTokenStore
    private let decoder = JSONDecoder()

    init(config: AppConfig, tokenStore: AuthTokenStore) {
        self.config = config
        self.tokenStore = tokenStore
    }

    func request<T: Decodable>(
        path: String,
        method: HTTPMethod,
        query: [URLQueryItem] = [],
        body: (any Encodable)? = nil
    ) async throws -> T {
        let bodyData = try body.map { try JSONEncoder().encode(AnyEncodable($0)) }
        let data = try await perform(path: path, method: method, query: query, bodyData: bodyData, retryOnAuthFailure: true)
        return try decode(T.self, from: data)
    }

    private func perform(
        path: String,
        method: HTTPMethod,
        query: [URLQueryItem],
        bodyData: Data?,
        retryOnAuthFailure: Bool
    ) async throws -> Data {
        let request = try buildRequest(path: path, method: method, query: query, bodyData: bodyData)
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch let error as URLError {
            switch error.code {
            case .timedOut:
                throw APIClientError.requestTimeout(baseURL: config.apiBaseURL.absoluteString)
            case .cannotConnectToHost, .cannotFindHost, .networkConnectionLost, .notConnectedToInternet:
                throw APIClientError.networkUnavailable(baseURL: config.apiBaseURL.absoluteString)
            default:
                throw error
            }
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        if http.statusCode == 401 && retryOnAuthFailure && path != "/auth/refresh" {
            let refreshed = try await refreshTokenIfPossible()
            if refreshed {
                return try await perform(path: path, method: method, query: query, bodyData: bodyData, retryOnAuthFailure: false)
            }
        }

        guard (200..<300).contains(http.statusCode) else {
            let message = extractMessage(from: data)
            throw APIClientError.serverError(statusCode: http.statusCode, message: message)
        }

        return data
    }

    private func buildRequest(
        path: String,
        method: HTTPMethod,
        query: [URLQueryItem],
        bodyData: Data?
    ) throws -> URLRequest {
        guard var components = URLComponents(url: config.apiBaseURL, resolvingAgainstBaseURL: false) else {
            throw APIClientError.invalidURL
        }
        components.path = "/api" + path
        if !query.isEmpty {
            components.queryItems = query
        }

        guard let url = components.url else {
            throw APIClientError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.timeoutInterval = config.requestTimeout
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = tokenStore.accessToken, !token.isEmpty {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = bodyData
        return request
    }

    private func refreshTokenIfPossible() async throws -> Bool {
        guard let refreshToken = tokenStore.refreshToken, !refreshToken.isEmpty else {
            return false
        }

        struct Payload: Codable {
            let refreshToken: String
        }

        let bodyData = try JSONEncoder().encode(Payload(refreshToken: refreshToken))
        let data = try await perform(path: "/auth/refresh", method: .POST, query: [], bodyData: bodyData, retryOnAuthFailure: false)
        let refresh = try decode(RefreshTokenResponse.self, from: data)

        guard refresh.success != false,
              let access = refresh.token,
              !access.isEmpty else {
            return false
        }

        tokenStore.accessToken = access
        if let nextRefresh = refresh.refreshToken, !nextRefresh.isEmpty {
            tokenStore.refreshToken = nextRefresh
        }
        if let expiresIn = refresh.expiresIn {
            tokenStore.tokenExpiresAt = Date().addingTimeInterval(expiresIn).timeIntervalSince1970
        }
        return true
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        if data.isEmpty {
            return try decoder.decode(T.self, from: Data("{}".utf8))
        }
        return try decoder.decode(T.self, from: data)
    }

    private func extractMessage(from data: Data) -> String {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let error = json["error"] as? String, !error.isEmpty { return error }
            if let message = json["message"] as? String, !message.isEmpty { return message }
        }
        return String(data: data, encoding: .utf8) ?? "unknown error"
    }
}

private struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        self.encodeClosure = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeClosure(encoder)
    }
}
