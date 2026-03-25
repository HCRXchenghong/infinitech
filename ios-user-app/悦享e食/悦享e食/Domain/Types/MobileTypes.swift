import Foundation

struct PushRegistrationPayload: Codable {
    let userId: String
    let userType: String
    let deviceToken: String
    let appVersion: String
    let locale: String
    let timezone: String
    let appEnv: String
}

struct PushAckPayload: Codable {
    let messageId: String
    let action: String
    let timestamp: String
}

struct MapSearchResult: Codable, Identifiable {
    let id: String
    let name: String
    let displayName: String
    let address: [String: String]?
    let latitude: Double
    let longitude: Double
}

struct MapSearchResponse: Codable {
    let list: [MapSearchResult]
    let page: Int
    let pageSize: Int
    let total: Int
}

struct AddressFallbackModel: Codable {
    let typedAddress: String
    let savedAddresses: [String]
    let suggestedAddress: String?
}

enum PushRoute: Equatable {
    case orderDetail(orderId: String)
    case chat(roomId: String)
    case notification(notificationId: String)
    case unknown
}
