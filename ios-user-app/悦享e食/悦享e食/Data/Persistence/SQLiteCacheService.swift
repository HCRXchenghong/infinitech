import Foundation
import SQLite3

final class SQLiteCacheService {
    private var db: OpaquePointer?
    private let dbName = "yuexiang_cache.sqlite"

    func bootstrap() throws {
        let url = try databaseURL()
        if sqlite3_open(url.path, &db) != SQLITE_OK {
            throw NSError(domain: "SQLite", code: 1, userInfo: [NSLocalizedDescriptionKey: "open db failed"])
        }

        try execute("""
        CREATE TABLE IF NOT EXISTS sync_versions (
            dataset TEXT PRIMARY KEY,
            version INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        """)
    }

    func close() {
        if db != nil {
            sqlite3_close(db)
            db = nil
        }
    }

    private func databaseURL() throws -> URL {
        let fm = FileManager.default
        let base = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return base.appendingPathComponent(dbName)
    }

    private func execute(_ sql: String) throws {
        var errorMessage: UnsafeMutablePointer<Int8>?
        if sqlite3_exec(db, sql, nil, nil, &errorMessage) != SQLITE_OK {
            let message = errorMessage.map { String(cString: $0) } ?? "sqlite exec error"
            throw NSError(domain: "SQLite", code: 2, userInfo: [NSLocalizedDescriptionKey: message])
        }
    }
}
