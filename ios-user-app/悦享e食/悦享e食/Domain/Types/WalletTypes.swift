import Foundation

struct WalletBalanceSnapshot: Equatable {
    let userId: String
    let userType: String
    let balance: Int64
    let frozenBalance: Int64
    let totalBalance: Int64
    let status: String
    let updatedAt: Date?
}

enum WalletTransactionDirection: Equatable {
    case income
    case expense
    case neutral
}

struct WalletTransactionRecord: Identifiable, Equatable {
    let id: String
    let transactionId: String
    let type: String
    let status: String
    let amount: Int64
    let paymentMethod: String?
    let description: String?
    let createdAt: Date?
    let createdAtText: String
    let direction: WalletTransactionDirection
}

struct WalletTransactionPage: Equatable {
    let items: [WalletTransactionRecord]
    let page: Int
    let limit: Int
    let total: Int
}
