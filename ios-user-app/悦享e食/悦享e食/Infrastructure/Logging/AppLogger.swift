import Foundation

enum AppLogger {
    static func info(_ message: String) {
        print("[iOS][INFO] \(message)")
    }

    static func warn(_ message: String) {
        print("[iOS][WARN] \(message)")
    }

    static func error(_ message: String) {
        print("[iOS][ERROR] \(message)")
    }
}
