import Foundation

final class NotificationRemoteService: NotificationServiceProtocol {
    private let apiClient: APIClientProtocol
    private let iso8601 = ISO8601DateFormatter()
    private let iso8601Fractional = ISO8601DateFormatter()

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient
        iso8601.formatOptions = [.withInternetDateTime]
        iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    }

    func fetchNotifications(page: Int, pageSize: Int) async throws -> AppNotificationPage {
        let row: [String: JSONValue] = try await apiClient.request(
            path: "/notifications",
            method: .GET,
            query: [
                URLQueryItem(name: "page", value: String(page)),
                URLQueryItem(name: "pageSize", value: String(pageSize))
            ],
            body: nil
        )

        let listValue = resolveListValue(from: row)
        let items = parseSummaryList(listValue)
        let rootData = unwrapObject(row["data"]) ?? [:]
        let resolvedPage = firstInt(row, keys: ["page"]) ?? firstInt(rootData, keys: ["page"]) ?? page
        let resolvedPageSize = firstInt(row, keys: ["pageSize", "page_size", "limit"]) ?? firstInt(rootData, keys: ["pageSize", "page_size", "limit"]) ?? pageSize

        return AppNotificationPage(
            items: items,
            page: max(1, resolvedPage),
            pageSize: max(1, resolvedPageSize)
        )
    }

    func fetchNotificationDetail(id: String) async throws -> AppNotificationDetail {
        let pathID = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        let row: [String: JSONValue] = try await apiClient.request(
            path: "/notifications/\(pathID)",
            method: .GET,
            query: [],
            body: nil
        )

        let payload = unwrapObject(row["data"]) ?? row
        let title = firstString(payload, keys: ["title"]) ?? String(localized: "notifications.detail.title")
        let source = firstString(payload, keys: ["source"]) ?? String(localized: "notifications.source.default")
        let timeText = firstString(payload, keys: ["time", "createdAt", "created_at"]) ?? "--"
        let createdAt = parseDate(firstString(payload, keys: ["createdAt", "created_at"]))
        let cover = firstString(payload, keys: ["cover", "coverUrl", "cover_url"])
        let blocks = parseContentBlocks(payload["content"])

        return AppNotificationDetail(
            id: firstString(payload, keys: ["id"]) ?? id,
            title: title,
            source: source,
            timeText: timeText,
            createdAt: createdAt,
            coverURL: cover,
            blocks: blocks.isEmpty ? [.paragraph(String(localized: "notifications.detail.empty"))] : blocks
        )
    }

    private func resolveListValue(from row: [String: JSONValue]) -> JSONValue? {
        if let direct = row["list"] ?? row["items"] {
            return direct
        }

        guard let data = row["data"] else { return nil }
        switch data {
        case .array:
            return data
        case let .object(object):
            return object["list"] ?? object["items"] ?? object["notifications"] ?? object["data"]
        default:
            return nil
        }
    }

    private func parseSummaryList(_ value: JSONValue?) -> [AppNotificationSummary] {
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

        return rows.compactMap { row in
            guard let id = firstString(row, keys: ["id"]), !id.isEmpty else {
                return nil
            }

            return AppNotificationSummary(
                id: id,
                title: firstString(row, keys: ["title"]) ?? String(localized: "notifications.detail.title"),
                summary: firstString(row, keys: ["summary", "preview"]) ?? String(localized: "notifications.detail.empty"),
                coverURL: firstString(row, keys: ["cover", "coverUrl", "cover_url"]),
                source: firstString(row, keys: ["source"]) ?? String(localized: "notifications.source.default"),
                createdAtText: firstString(row, keys: ["createdAt", "created_at", "time"]) ?? "--",
                isRead: firstBool(row, keys: ["isRead", "is_read"]) ?? false
            )
        }
    }

    private func parseContentBlocks(_ value: JSONValue?) -> [AppNotificationBlock] {
        guard let value else { return [] }
        switch value {
        case let .object(object):
            if let blocks = object["blocks"] {
                return parseContentBlocks(blocks)
            }
            if let text = firstString(object, keys: ["text", "content"]) {
                return [.paragraph(text)]
            }
            return []
        case let .array(list):
            return list.compactMap(parseBlock)
        case let .string(text):
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return [] }
            if let parsed = JSONValue.parse(jsonText: trimmed) {
                let blocks = parseContentBlocks(parsed)
                if !blocks.isEmpty {
                    return blocks
                }
            }
            return [.paragraph(trimmed)]
        default:
            return []
        }
    }

    private func parseBlock(_ value: JSONValue) -> AppNotificationBlock? {
        guard let row = value.objectValue else {
            if let text = value.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
                return .paragraph(text)
            }
            return nil
        }

        let type = firstString(row, keys: ["type"])?.lowercased() ?? "p"
        switch type {
        case "p", "paragraph", "text":
            guard let text = firstString(row, keys: ["text", "content"]), !text.isEmpty else {
                return nil
            }
            return .paragraph(text)
        case "h1", "h2", "heading", "title":
            guard let text = firstString(row, keys: ["text", "content"]), !text.isEmpty else {
                return nil
            }
            return .heading(text)
        case "quote":
            guard let text = firstString(row, keys: ["text", "content"]), !text.isEmpty else {
                return nil
            }
            return .quote(text)
        case "ul", "list", "bullet":
            let items = stringArray(row["items"])
            if !items.isEmpty {
                return .bulletList(items)
            }
            if let text = firstString(row, keys: ["text", "content"]), !text.isEmpty {
                return .bulletList([text])
            }
            return nil
        case "img", "image":
            guard let url = firstString(row, keys: ["url", "image", "src"]), !url.isEmpty else {
                return nil
            }
            let caption = firstString(row, keys: ["caption", "text"])
            return .image(url: url, caption: caption)
        default:
            if let text = firstString(row, keys: ["text", "content"]), !text.isEmpty {
                return .paragraph(text)
            }
            return nil
        }
    }

    private func stringArray(_ value: JSONValue?) -> [String] {
        guard let value else { return [] }
        switch value {
        case let .array(list):
            return list.compactMap { $0.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
        case let .string(text):
            if let parsed = JSONValue.parse(jsonText: text), case let .array(list) = parsed {
                return list.compactMap { $0.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
            }
            return []
        default:
            return []
        }
    }

    private func parseDate(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        if let date = iso8601Fractional.date(from: raw) { return date }
        if let date = iso8601.date(from: raw) { return date }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        for format in ["yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd"] {
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
            if let text = row[key]?.stringValue,
               let value = Int(text.trimmingCharacters(in: .whitespacesAndNewlines)) {
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
}
