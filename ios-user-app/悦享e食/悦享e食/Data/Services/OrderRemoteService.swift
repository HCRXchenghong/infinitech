import Foundation

final class OrderRemoteService: OrderServiceProtocol {
    private let apiClient: APIClientProtocol
    private let iso8601 = ISO8601DateFormatter()
    private let iso8601Fractional = ISO8601DateFormatter()
    private let clockFormatter: DateFormatter
    private let dayFormatter: DateFormatter
    private let fullFormatter: DateFormatter

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient

        iso8601.formatOptions = [.withInternetDateTime]
        iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        self.clockFormatter = DateFormatter()
        clockFormatter.dateFormat = "HH:mm"
        clockFormatter.locale = Locale(identifier: "zh_Hans")

        self.dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "MM-dd HH:mm"
        dayFormatter.locale = Locale(identifier: "zh_Hans")

        self.fullFormatter = DateFormatter()
        fullFormatter.dateFormat = "yyyy-MM-dd HH:mm"
        fullFormatter.locale = Locale(identifier: "zh_Hans")
    }

    func fetchUserOrders(userId: String) async throws -> [UserOrder] {
        let pathID = userId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? userId
        let rows: [[String: JSONValue]] = try await apiClient.request(
            path: "/orders/user/\(pathID)",
            method: .GET,
            query: [],
            body: nil
        )

        return rows
            .compactMap(mapOrderRow)
            .sorted { lhs, rhs in
                switch (lhs.createdAt, rhs.createdAt) {
                case let (l?, r?):
                    return l > r
                case (_?, nil):
                    return true
                case (nil, _?):
                    return false
                case (nil, nil):
                    return lhs.id > rhs.id
                }
            }
    }

    func fetchOrderDetail(orderId: String) async throws -> UserOrderDetail {
        let pathID = orderId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? orderId
        let row: [String: JSONValue] = try await apiClient.request(
            path: "/orders/\(pathID)",
            method: .GET,
            query: [],
            body: nil
        )

        guard let detail = mapOrderDetailRow(row) else {
            throw APIClientError.invalidResponse
        }
        return detail
    }

    private func mapOrderRow(_ row: [String: JSONValue]) -> UserOrder? {
        guard let id = firstString(row, keys: ["id", "tsid", "daily_order_id"]), !id.isEmpty else {
            return nil
        }

        let rawStatus = firstString(row, keys: ["status"]) ?? ""
        let createdAt = parseDate(firstString(row, keys: ["createdAt", "created_at", "time"]))

        return UserOrder(
            id: id,
            shopName: firstString(row, keys: ["shopName", "shop_name"]) ?? String(localized: "orders.shop.unknown"),
            address: firstString(row, keys: ["address"]) ?? "",
            totalPrice: firstDouble(row, keys: ["price", "total_price", "totalPrice"]) ?? 0,
            itemCount: max(1, resolveItemCount(row)),
            status: mapStatus(rawStatus),
            rawStatus: rawStatus,
            statusText: firstString(row, keys: ["statusText", "status_text"]) ?? rawStatus,
            timeText: formatOrderTime(createdAt: createdAt),
            createdAt: createdAt,
            isReviewed: firstBool(row, keys: ["isReviewed", "is_reviewed"]) ?? false,
            bizType: firstString(row, keys: ["bizType", "biz_type"]) ?? "takeout"
        )
    }

    private func mapOrderDetailRow(_ row: [String: JSONValue]) -> UserOrderDetail? {
        guard let id = firstString(row, keys: ["id", "tsid", "daily_order_id"]), !id.isEmpty else {
            return nil
        }

        let rawStatus = firstString(row, keys: ["status"]) ?? ""
        let statusText = firstString(row, keys: ["statusText", "status_text"]) ?? rawStatus
        let items = resolveItems(row)

        return UserOrderDetail(
            id: id,
            shopId: firstString(row, keys: ["shopId", "shop_id"]),
            shopName: firstString(row, keys: ["shopName", "shop_name"]) ?? String(localized: "orders.shop.unknown"),
            shopLogo: firstString(row, keys: ["shopLogo", "shop_logo"]),
            status: mapStatus(rawStatus),
            statusText: statusText,
            totalPrice: firstDouble(row, keys: ["price", "totalPrice", "total_price"]) ?? 0,
            deliveryFee: firstDouble(row, keys: ["deliveryFee", "delivery_fee"]) ?? 0,
            productPrice: firstDouble(row, keys: ["productPrice", "product_price"]) ?? 0,
            address: firstString(row, keys: ["address"]),
            riderName: firstString(row, keys: ["riderName", "rider_name"]),
            riderPhone: firstString(row, keys: ["riderPhone", "rider_phone"]),
            riderRating: firstDouble(row, keys: ["riderRating", "rider_rating"]),
            riderRatingCount: firstInt(row, keys: ["riderRatingCount", "rider_rating_count"]),
            deliveryName: firstString(row, keys: ["deliveryName", "delivery_name"]),
            deliveryPhone: firstString(row, keys: ["deliveryPhone", "delivery_phone"]),
            paymentMethod: firstString(row, keys: ["paymentMethod", "payment_method"]),
            paymentStatus: firstString(row, keys: ["paymentStatus", "payment_status"]),
            bizType: firstString(row, keys: ["bizType", "biz_type"]) ?? "takeout",
            canRedeem: firstBool(row, keys: ["canRedeem", "can_redeem"]) ?? false,
            canRefund: firstBool(row, keys: ["canRefund", "can_refund"]) ?? false,
            displayTags: firstStringArray(row, keys: ["displayTags", "display_tags"]),
            createdAt: parseDate(firstString(row, keys: ["createdAt", "created_at", "time"])),
            paidAt: parseDate(firstString(row, keys: ["paidAt", "paid_at", "paymentTime", "payment_time"])),
            completedAt: parseDate(firstString(row, keys: ["completedAt", "completed_at"])),
            items: items
        )
    }

    private func resolveItemCount(_ row: [String: JSONValue]) -> Int {
        if let direct = firstInt(row, keys: ["itemCount", "item_count"]), direct > 0 {
            return direct
        }
        return max(1, resolveItems(row).reduce(0) { $0 + max($1.quantity, 1) })
    }

    private func resolveItems(_ row: [String: JSONValue]) -> [UserOrderItem] {
        if let raw = row["items"] {
            let fromItems = parseItems(raw)
            if !fromItems.isEmpty {
                return fromItems
            }
        }
        if let raw = row["productList"] {
            return parseItems(raw)
        }
        return []
    }

    private func parseItems(_ value: JSONValue) -> [UserOrderItem] {
        switch value {
        case let .array(list):
            return list.compactMap { itemValue in
                guard let object = itemValue.objectValue else { return nil }
                return mapItemObject(object)
            }
        case let .object(object):
            return [mapItemObject(object)].compactMap { $0 }
        case let .string(text):
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return [] }
            if let parsed = JSONValue.parse(jsonText: trimmed) {
                let items = parseItems(parsed)
                if !items.isEmpty {
                    return items
                }
            }
            return [
                UserOrderItem(
                    id: UUID().uuidString,
                    name: trimmed,
                    quantity: 1,
                    unitPrice: 0,
                    imageURL: nil
                )
            ]
        default:
            return []
        }
    }

    private func mapItemObject(_ object: [String: JSONValue]) -> UserOrderItem? {
        let name = object["name"]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if name.isEmpty {
            return nil
        }
        let id = object["id"]?.stringValue ?? UUID().uuidString
        let quantity = max(1, object["count"]?.intValue ?? object["quantity"]?.intValue ?? 1)
        let price = object["price"]?.doubleValue ?? 0
        let imageURL = object["image"]?.stringValue ?? object["img"]?.stringValue
        return UserOrderItem(id: id, name: name, quantity: quantity, unitPrice: price, imageURL: imageURL)
    }

    private func parseDate(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        if let date = iso8601Fractional.date(from: raw) { return date }
        if let date = iso8601.date(from: raw) { return date }
        return nil
    }

    private func formatOrderTime(createdAt: Date?) -> String {
        guard let createdAt else {
            return "--"
        }
        if Calendar.current.isDateInToday(createdAt) {
            return clockFormatter.string(from: createdAt)
        }

        let currentYear = Calendar.current.component(.year, from: Date())
        let orderYear = Calendar.current.component(.year, from: createdAt)
        if currentYear == orderYear {
            return dayFormatter.string(from: createdAt)
        }
        return fullFormatter.string(from: createdAt)
    }

    private func mapStatus(_ raw: String) -> OrderLifecycleStatus {
        switch raw.lowercased() {
        case "pending", "pending_payment", "paid_unused", "priced":
            return .pending
        case "accepted":
            return .preparing
        case "delivering":
            return .delivering
        case "completed", "redeemed":
            return .completed
        case "refunding", "refunded":
            return .afterSale
        case "cancelled", "expired":
            return .cancelled
        default:
            return .unknown
        }
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

    private func firstDouble(_ row: [String: JSONValue], keys: [String]) -> Double? {
        for key in keys {
            if let value = row[key]?.doubleValue {
                return value
            }
        }
        return nil
    }

    private func firstInt(_ row: [String: JSONValue], keys: [String]) -> Int? {
        for key in keys {
            if let value = row[key]?.intValue {
                return value
            }
        }
        return nil
    }

    private func firstBool(_ row: [String: JSONValue], keys: [String]) -> Bool? {
        for key in keys {
            if let value = row[key]?.boolValue {
                return value
            }
        }
        return nil
    }

    private func firstStringArray(_ row: [String: JSONValue], keys: [String]) -> [String] {
        for key in keys {
            guard let value = row[key] else { continue }
            switch value {
            case let .array(list):
                let result = list.compactMap { $0.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                if !result.isEmpty {
                    return result
                }
            case let .string(text):
                if let parsed = JSONValue.parse(jsonText: text), case let .array(list) = parsed {
                    let result = list.compactMap { $0.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines) }
                        .filter { !$0.isEmpty }
                    if !result.isEmpty {
                        return result
                    }
                }
            default:
                break
            }
        }
        return []
    }
}
