import Foundation

protocol PushServiceProtocol {
    func registerDevice(_ payload: PushRegistrationPayload) async throws
    func unregisterDevice(userId: String, userType: String, deviceToken: String) async throws
    func ack(_ payload: PushAckPayload) async throws
}
