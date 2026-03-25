import Foundation

enum OrderLifecycleStatus: String, Codable {
    case pending
    case preparing
    case delivering
    case completed
    case afterSale
    case cancelled
    case unknown
}

struct UserOrder: Identifiable, Equatable {
    let id: String
    let shopName: String
    let address: String
    let totalPrice: Double
    let itemCount: Int
    let status: OrderLifecycleStatus
    let rawStatus: String
    let statusText: String
    let timeText: String
    let createdAt: Date?
    let isReviewed: Bool
    let bizType: String
}

struct UserOrderItem: Identifiable, Equatable {
    let id: String
    let name: String
    let quantity: Int
    let unitPrice: Double
    let imageURL: String?
}

struct UserOrderDetail: Identifiable, Equatable {
    let id: String
    let shopId: String?
    let shopName: String
    let shopLogo: String?
    let status: OrderLifecycleStatus
    let statusText: String
    let totalPrice: Double
    let deliveryFee: Double
    let productPrice: Double
    let address: String?
    let riderName: String?
    let riderPhone: String?
    let riderRating: Double?
    let riderRatingCount: Int?
    let deliveryName: String?
    let deliveryPhone: String?
    let paymentMethod: String?
    let paymentStatus: String?
    let bizType: String
    let canRedeem: Bool
    let canRefund: Bool
    let displayTags: [String]
    let createdAt: Date?
    let paidAt: Date?
    let completedAt: Date?
    let items: [UserOrderItem]
}
