import Foundation

struct RegisterPushDeviceUseCase {
    private let pushService: PushServiceProtocol

    init(pushService: PushServiceProtocol) {
        self.pushService = pushService
    }

    func execute(payload: PushRegistrationPayload) async throws {
        try await pushService.registerDevice(payload)
    }
}
