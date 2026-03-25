import SwiftUI

struct RootTabView: View {
    @EnvironmentObject private var env: AppEnvironment

    private var selectedTab: Binding<AppCoordinator.Tab> {
        Binding(
            get: { env.coordinator.selectedTab },
            set: { env.coordinator.selectedTab = $0 }
        )
    }

    var body: some View {
        TabView(selection: selectedTab) {
            HomeView()
                .tabItem { Label("tab.home", systemImage: "house.fill") }
                .tag(AppCoordinator.Tab.home)

            OrdersView()
                .tabItem { Label("tab.orders", systemImage: "list.bullet.clipboard.fill") }
                .tag(AppCoordinator.Tab.orders)

            MessagesView()
                .tabItem { Label("tab.messages", systemImage: "bubble.left.and.bubble.right.fill") }
                .tag(AppCoordinator.Tab.messages)

            ProfileView()
                .tabItem { Label("tab.profile", systemImage: "person.crop.circle.fill") }
                .tag(AppCoordinator.Tab.profile)
        }
        .tint(Color(red: 0.08, green: 0.36, blue: 0.96))
        .toolbarBackground(.ultraThinMaterial, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarColorScheme(.light, for: .tabBar)
    }
}
