import Foundation

enum JSONValue: Decodable, Equatable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
            return
        }
        if let value = try? container.decode(Bool.self) {
            self = .bool(value)
            return
        }
        if let value = try? container.decode(Double.self) {
            self = .number(value)
            return
        }
        if let value = try? container.decode(String.self) {
            self = .string(value)
            return
        }
        if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
            return
        }
        if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
            return
        }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON value")
    }

    var stringValue: String? {
        switch self {
        case let .string(value):
            return value
        case let .number(value):
            if value.rounded() == value {
                return String(Int(value))
            }
            return String(value)
        case let .bool(value):
            return value ? "true" : "false"
        default:
            return nil
        }
    }

    var doubleValue: Double? {
        switch self {
        case let .number(value):
            return value
        case let .string(value):
            return Double(value.trimmingCharacters(in: .whitespacesAndNewlines))
        case let .bool(value):
            return value ? 1 : 0
        default:
            return nil
        }
    }

    var intValue: Int? {
        guard let value = doubleValue else { return nil }
        return Int(value)
    }

    var boolValue: Bool? {
        switch self {
        case let .bool(value):
            return value
        case let .number(value):
            return value != 0
        case let .string(value):
            switch value.lowercased() {
            case "1", "true", "yes":
                return true
            case "0", "false", "no":
                return false
            default:
                return nil
            }
        default:
            return nil
        }
    }

    var objectValue: [String: JSONValue]? {
        if case let .object(value) = self {
            return value
        }
        return nil
    }

    var arrayValue: [JSONValue]? {
        if case let .array(value) = self {
            return value
        }
        return nil
    }

    static func parse(jsonText: String) -> JSONValue? {
        let text = jsonText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, let data = text.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(JSONValue.self, from: data)
    }
}
