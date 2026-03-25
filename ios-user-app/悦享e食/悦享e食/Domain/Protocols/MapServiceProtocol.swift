import Foundation

protocol MapServiceProtocol {
    func search(keyword: String, city: String?, page: Int, pageSize: Int) async throws -> MapSearchResponse
    func reverseGeocode(lat: Double, lng: Double) async throws -> String
}
