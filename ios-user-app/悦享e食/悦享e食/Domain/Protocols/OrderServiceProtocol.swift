import Foundation

protocol OrderServiceProtocol {
    func fetchUserOrders(userId: String) async throws -> [UserOrder]
    func fetchOrderDetail(orderId: String) async throws -> UserOrderDetail
}
