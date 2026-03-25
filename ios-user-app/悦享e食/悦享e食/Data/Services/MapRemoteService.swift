import Foundation

private struct ReverseResponse: Codable {
    let displayName: String
}

final class MapRemoteService: MapServiceProtocol {
    private let apiClient: APIClientProtocol

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient
    }

    func search(keyword: String, city: String?, page: Int = 1, pageSize: Int = 20) async throws -> MapSearchResponse {
        var query = [
            URLQueryItem(name: "keyword", value: keyword),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "pageSize", value: String(pageSize))
        ]
        if let city, !city.isEmpty {
            query.append(URLQueryItem(name: "city", value: city))
        }

        return try await apiClient.request(
            path: "/mobile/maps/search",
            method: .GET,
            query: query,
            body: nil
        )
    }

    func reverseGeocode(lat: Double, lng: Double) async throws -> String {
        let response: ReverseResponse = try await apiClient.request(
            path: "/mobile/maps/reverse-geocode",
            method: .GET,
            query: [
                URLQueryItem(name: "lat", value: String(lat)),
                URLQueryItem(name: "lng", value: String(lng))
            ],
            body: nil
        )

        return response.displayName
    }
}
