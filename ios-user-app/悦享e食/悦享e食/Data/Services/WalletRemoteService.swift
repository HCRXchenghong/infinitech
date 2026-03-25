import Foundation

final class WalletRemoteService: WalletServiceProtocol {
    private let apiClient: APIClientProtocol
    private let iso8601 = ISO8601DateFormatter()
    private let iso8601Fractional = ISO8601DateFormatter()
    private let fullFormatter: DateFormatter

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient

        iso8601.formatOptions = [.withInternetDateTime]
        iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        self.fullFormatter = DateFormatter()
        fullFormatter.dateFormat = "yyyy-MM-dd HH:mm"
        fullFormatter.locale = Locale(identifier: "zh_Hans")
    }

    func fetchBalance(userId: String, userType: String) async throws -> WalletBalanceSnapshot {
        let row: [String: JSONValue] = try await apiClient.request(
            path: "/wallet/balance",
            method: .GET,
            query: [
                URLQueryItem(name: "userId", value: userId),
                URLQueryItem(name: "userType", value: userType),
                URLQueryItem(name: "user_id", value: userId),
                URLQueryItem(name: "user_type", value: userType)
            ],
            body: nil
        )

        let payload = unwrapObject(row["data"]) ?? row
        let balance = firstInt64(payload, keys: ["balance"]) ?? 0
        let frozenBalance = firstInt64(payload, keys: ["frozenBalance", "frozen_balance"]) ?? 0
        let totalBalance = firstInt64(payload, keys: ["totalBalance", "total_balance"]) ?? (balance + frozenBalance)

        return WalletBalanceSnapshot(
            userId: firstString(payload, keys: ["userId", "user_id"]) ?? userId,
            userType: firstString(payload, keys: ["userType", "user_type"]) ?? userType,
            balance: balance,
            frozenBalance: frozenBalance,
            totalBalance: totalBalance,
            status: firstString(payload, keys: ["status"]) ?? "active",
            updatedAt: parseDate(firstString(payload, keys: ["updatedAt", "updated_at"]))
        )
    }

    func fetchTransactions(
        userId: String,
        userType: String,
        type: String?,
        page: Int,
        limit: Int
    ) async throws -> WalletTransactionPage {
        var query: [URLQueryItem] = [
            URLQueryItem(name: "userId", value: userId),
            URLQueryItem(name: "userType", value: userType),
            URLQueryItem(name: "user_id", value: userId),
            URLQueryItem(name: "user_type", value: userType),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        if let type, !type.isEmpty {
            query.append(URLQueryItem(name: "type", value: type))
        }

        let row: [String: JSONValue] = try await apiClient.request(
            path: "/wallet/transactions",
            method: .GET,
            query: query,
            body: nil
        )

        let payload = unwrapObject(row["data"]) ?? row
        let itemsValue = payload["items"] ?? row["items"]
        let items = parseItems(itemsValue)

        let pagination = unwrapObject(payload["pagination"]) ?? unwrapObject(row["pagination"]) ?? [:]
        let resolvedPage = firstInt(pagination, keys: ["page"]) ?? firstInt(payload, keys: ["page"]) ?? page
        let resolvedLimit = firstInt(pagination, keys: ["limit", "pageSize", "page_size"]) ?? firstInt(payload, keys: ["limit", "pageSize", "page_size"]) ?? limit
        let resolvedTotal = firstInt(pagination, keys: ["total"]) ?? firstInt(payload, keys: ["total"]) ?? items.count

        return WalletTransactionPage(
            items: items,
            page: max(1, resolvedPage),
            limit: max(1, resolvedLimit),
            total: max(0, resolvedTotal)
        )
    }

    private func parseItems(_ value: JSONValue?) -> [WalletTransactionRecord] {
        guard let value else { return [] }
        let rows: [[String: JSONValue]]
        switch value {
        case let .array(list):
            rows = list.compactMap { $0.objectValue }
        case let .object(object):
            rows = [object]
        case let .string(text):
            if let parsed = JSONValue.parse(jsonText: text), case let .array(list) = parsed {
                rows = list.compactMap { $0.objectValue }
            } else {
                rows = []
            }
        default:
            rows = []
        }

        return rows
            .compactMap(mapItem)
            .sorted { lhs, rhs in
                switch (lhs.createdAt, rhs.createdAt) {
                case let (left?, right?):
                    return left > right
                case (_?, nil):
                    return true
                case (nil, _?):
                    return false
                case (nil, nil):
                    return lhs.id > rhs.id
                }
            }
    }

    private func mapItem(_ row: [String: JSONValue]) -> WalletTransactionRecord? {
        guard let txID = firstString(row, keys: ["transactionId", "transaction_id", "id"]),
              !txID.isEmpty else {
            return nil
        }

        let type = firstString(row, keys: ["type"]) ?? "unknown"
        let status = firstString(row, keys: ["status"]) ?? "unknown"
        let amountRaw = firstInt64(row, keys: ["amount"]) ?? 0
        let amount = normalizedSignedAmount(rawAmount: amountRaw, type: type)
        let createdAt = parseDate(firstString(row, keys: ["createdAt", "created_at", "completedAt", "completed_at"]))
        let createdAtText = firstString(row, keys: ["createdAt", "created_at"])
            ?? createdAt.map { fullFormatter.string(from: $0) }
            ?? "--"

        return WalletTransactionRecord(
            id: txID,
            transactionId: txID,
            type: type,
            status: status,
            amount: amount,
            paymentMethod: firstString(row, keys: ["paymentMethod", "payment_method"]),
            description: firstString(row, keys: ["description", "remark"]),
            createdAt: createdAt,
            createdAtText: createdAtText,
            direction: direction(of: amount)
        )
    }

    private func direction(of amount: Int64) -> WalletTransactionDirection {
        if amount > 0 {
            return .income
        }
        if amount < 0 {
            return .expense
        }
        return .neutral
    }

    private func normalizedSignedAmount(rawAmount: Int64, type: String) -> Int64 {
        let amount = abs(rawAmount)
        let normalizedType = type.lowercased()
        let incomeTypes: Set<String> = ["refund", "recharge", "compensation", "admin_add_balance", "income"]
        let expenseTypes: Set<String> = ["payment", "withdraw", "admin_deduct_balance"]

        if incomeTypes.contains(normalizedType) {
            return amount
        }
        if expenseTypes.contains(normalizedType) {
            return -amount
        }
        return rawAmount
    }

    private func parseDate(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        if let date = iso8601Fractional.date(from: raw) { return date }
        if let date = iso8601.date(from: raw) { return date }

        let formats = [
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd HH:mm",
            "yyyy-MM-dd"
        ]
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: raw) {
                return date
            }
        }
        return nil
    }

    private func unwrapObject(_ value: JSONValue?) -> [String: JSONValue]? {
        guard let value else { return nil }
        if case let .object(object) = value {
            return object
        }
        return nil
    }

    private func firstString(_ row: [String: JSONValue], keys: [String]) -> String? {
        for key in keys {
            guard let value = row[key]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !value.isEmpty else {
                continue
            }
            return value
        }
        return nil
    }

    private func firstInt(_ row: [String: JSONValue], keys: [String]) -> Int? {
        for key in keys {
            if let value = row[key]?.intValue {
                return value
            }
            if let value = row[key]?.stringValue,
               let parsed = Int(value.trimmingCharacters(in: .whitespacesAndNewlines)) {
                return parsed
            }
        }
        return nil
    }

    private func firstInt64(_ row: [String: JSONValue], keys: [String]) -> Int64? {
        for key in keys {
            if let value = row[key]?.intValue {
                return Int64(value)
            }
            if let value = row[key]?.doubleValue {
                return Int64(value)
            }
            if let value = row[key]?.stringValue,
               let parsed = Int64(value.trimmingCharacters(in: .whitespacesAndNewlines)) {
                return parsed
            }
        }
        return nil
    }
}
