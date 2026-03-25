import Foundation

protocol WalletServiceProtocol {
    func fetchBalance(userId: String, userType: String) async throws -> WalletBalanceSnapshot
    func fetchTransactions(
        userId: String,
        userType: String,
        type: String?,
        page: Int,
        limit: Int
    ) async throws -> WalletTransactionPage
}
