import Foundation

struct Item: Codable, Identifiable {
    let id: UUID
    let timestamp: Date

    init(id: UUID = UUID(), timestamp: Date = Date()) {
        self.id = id
        self.timestamp = timestamp
    }
}
