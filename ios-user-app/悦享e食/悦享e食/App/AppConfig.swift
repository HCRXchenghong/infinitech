import Foundation

enum AppBuildEnvironment: String {
    case dev
    case staging
    case prod
}

struct AppConfig {
    let environment: AppBuildEnvironment
    let apiBaseURL: URL
    let socketURL: URL
    let osmTileTemplate: String
    let requestTimeout: TimeInterval

    private static let defaultDevAPIBase = "http://127.0.0.1:25500"
    private static let defaultDevSocketBase = "http://127.0.0.1:9898"
    private static let defaultStagingBase = "https://staging-api.yuexiang.com"
    private static let defaultProdBase = "https://api.yuexiang.com"
    private static let defaultTileTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

    static func current() -> AppConfig {
        let envRaw = UserDefaults.standard.string(forKey: "runtime_env") ?? "dev"
        let env = AppBuildEnvironment(rawValue: envRaw) ?? .dev

        let apiBase: String
        let socketBase: String
        switch env {
        case .dev:
            #if targetEnvironment(simulator)
            apiBase = sanitizeSimulatorRuntimeBase(
                UserDefaults.standard.string(forKey: "runtime_api_base"),
                fallback: infoValue("API_BASE_URL") ?? defaultDevAPIBase
            )
            socketBase = sanitizeSimulatorRuntimeBase(
                UserDefaults.standard.string(forKey: "runtime_socket_base"),
                fallback: infoValue("SOCKET_URL") ?? defaultDevSocketBase
            )
            #else
            apiBase = UserDefaults.standard.string(forKey: "runtime_api_base") ?? (infoValue("API_BASE_URL") ?? defaultDevAPIBase)
            socketBase = UserDefaults.standard.string(forKey: "runtime_socket_base") ?? (infoValue("SOCKET_URL") ?? defaultDevSocketBase)
            #endif
        case .staging:
            apiBase = UserDefaults.standard.string(forKey: "runtime_api_base") ?? (infoValue("API_BASE_URL") ?? defaultStagingBase)
            socketBase = UserDefaults.standard.string(forKey: "runtime_socket_base") ?? (infoValue("SOCKET_URL") ?? defaultStagingBase)
        case .prod:
            apiBase = UserDefaults.standard.string(forKey: "runtime_api_base") ?? (infoValue("API_BASE_URL") ?? defaultProdBase)
            socketBase = UserDefaults.standard.string(forKey: "runtime_socket_base") ?? (infoValue("SOCKET_URL") ?? defaultProdBase)
        }

        return AppConfig(
            environment: env,
            apiBaseURL: URL(string: apiBase) ?? URL(string: defaultDevAPIBase)!,
            socketURL: URL(string: socketBase) ?? URL(string: defaultDevSocketBase)!,
            osmTileTemplate: UserDefaults.standard.string(forKey: "runtime_osm_tiles") ?? (infoValue("MAP_TILE_TEMPLATE") ?? defaultTileTemplate),
            requestTimeout: 30
        )
    }

    private static func infoValue(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
            return nil
        }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    #if targetEnvironment(simulator)
    private static func sanitizeSimulatorRuntimeBase(_ runtimeValue: String?, fallback: String) -> String {
        guard let runtimeValue = runtimeValue?.trimmingCharacters(in: .whitespacesAndNewlines),
              !runtimeValue.isEmpty,
              let url = URL(string: runtimeValue),
              let host = url.host?.lowercased() else {
            return fallback
        }

        if host == "127.0.0.1" || host == "localhost" {
            return runtimeValue
        }

        // Legacy LAN defaults frequently break simulator login in local development.
        if host.hasPrefix("192.168.") || host.hasPrefix("10.") || host.hasPrefix("172.") {
            return fallback
        }

        return runtimeValue
    }
    #endif
}
