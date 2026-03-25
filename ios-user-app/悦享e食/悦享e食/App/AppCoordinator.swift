import Foundation
import Combine

@MainActor
final class AppCoordinator: ObservableObject {
    enum Tab: Hashable {
        case home
        case orders
        case messages
        case profile
    }

    @Published var selectedTab: Tab = .home
    @Published var pendingRoute: PushRoute?

    func handlePushRoute(_ route: PushRoute) {
        pendingRoute = route
        switch route {
        case .orderDetail:
            selectedTab = .orders
        case .chat, .notification:
            selectedTab = .messages
        case .unknown:
            selectedTab = .home
        }
    }
}
