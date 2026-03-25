import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var env: AppEnvironment
    @State private var activeSheet: HomeSheet?
    @State private var pulseHero = false
    @State private var currentOrder: UserOrder?
    @State private var currentOrderLoading = false

    private let modules: [(LocalizedStringKey, String, Color)] = [
        ("home.module.medicine", "cross.case.fill", .pink),
        ("home.module.diningBuddy", "person.2.fill", .orange),
        ("home.module.charity", "heart.circle.fill", .green),
        ("home.module.errand", "shippingbox.fill", .blue)
    ]

    private var activeUserID: String? {
        env.session.userPhone ?? env.session.userId
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {
                        heroCard
                        quickActions
                        currentOrderCard
                        modulesCard
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 28)
                }
            }
            .navigationTitle("home.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    StatusPill(text: "home.badge.native", color: .blue)
                }
            }
            .sheet(item: $activeSheet) { sheet in
                sheetContent(sheet)
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) {
                    pulseHero = true
                }
            }
            .task(id: activeUserID) {
                await loadCurrentOrder()
            }
        }
    }

    private var heroCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("home.hero.title")
                            .font(.title2.weight(.bold))
                        Text("home.hero.subtitle")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 8)
                    Image(systemName: "apple.logo")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Color.black.opacity(0.8))
                }

                HStack(spacing: 8) {
                    StatusPill(text: "home.badge.apns", color: .indigo)
                    StatusPill(text: "home.badge.map", color: .teal)
                }

                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(AppleTheme.brandGradient.opacity(0.15))
                    .frame(height: 8)
                    .overlay(
                        GeometryReader { proxy in
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(AppleTheme.brandGradient)
                                .frame(width: pulseHero ? proxy.size.width : proxy.size.width * 0.65, height: 8)
                                .animation(.spring(duration: 1.2), value: pulseHero)
                        }
                    )
            }
        }
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("home.section.quick")
                .font(.headline)
                .padding(.leading, 2)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                actionCard(
                    icon: "mappin.and.ellipse",
                    titleKey: "home.action.address",
                    subtitleKey: "home.action.address.desc",
                    tint: .blue
                ) {
                    activeSheet = .address
                }

                actionCard(
                    icon: "creditcard.fill",
                    titleKey: "home.action.payment",
                    subtitleKey: "home.action.payment.desc",
                    tint: .purple
                ) {
                    activeSheet = .wallet
                }

                actionCard(
                    icon: "bell.badge.fill",
                    titleKey: "home.action.notify",
                    subtitleKey: "home.action.notify.desc",
                    tint: .indigo
                ) {
                    activeSheet = .notifications
                }

                actionCard(
                    icon: "person.crop.circle.badge.questionmark",
                    titleKey: "home.action.support",
                    subtitleKey: "home.action.support.desc",
                    tint: .orange
                ) {
                    env.coordinator.selectedTab = .messages
                }
            }
        }
    }

    private func actionCard(
        icon: String,
        titleKey: LocalizedStringKey,
        subtitleKey: LocalizedStringKey,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: icon)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(tint)

                VStack(alignment: .leading, spacing: 3) {
                    Text(titleKey)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    Text(subtitleKey)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 110, alignment: .leading)
        }
        .buttonStyle(.plain)
        .glassCardStyle()
    }

    private var currentOrderCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("home.section.current")
                .font(.headline)
                .padding(.leading, 2)

            GlassCard {
                VStack(alignment: .leading, spacing: 10) {
                    if currentOrderLoading {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("home.current.loading")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Spacer()
                        }
                    } else if let currentOrder {
                        HStack {
                            Text(verbatim: "#\(currentOrder.id)")
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            StatusPill(text: statusKey(currentOrder.status), color: statusColor(currentOrder.status))
                        }

                        Text(verbatim: currentOrder.shopName)
                            .font(.subheadline.weight(.semibold))

                        Text(currentOrder.address.isEmpty ? String(localized: "home.current.address.empty") : currentOrder.address)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        HStack {
                            Text("home.current.id")
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            StatusPill(text: "orders.status.delivering", color: .blue)
                        }

                        Text("home.current.address")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Button("home.address.pick") {
                        activeSheet = .address
                    }
                    .font(.subheadline.weight(.semibold))
                }
            }
        }
    }

    private var modulesCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("home.section.modules")
                .font(.headline)
                .padding(.leading, 2)

            GlassCard {
                VStack(spacing: 10) {
                    ForEach(Array(modules.enumerated()), id: \.offset) { entry in
                        let item = entry.element
                        HStack(spacing: 10) {
                            Image(systemName: item.1)
                                .font(.headline)
                                .foregroundStyle(item.2)
                                .frame(width: 28, height: 28)
                                .background(item.2.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            Text(item.0)
                                .font(.subheadline.weight(.medium))
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    private func loadCurrentOrder() async {
        guard let userID = activeUserID, !userID.isEmpty else {
            currentOrder = nil
            return
        }

        currentOrderLoading = true
        defer { currentOrderLoading = false }

        do {
            let list = try await env.orderService.fetchUserOrders(userId: userID)
            currentOrder = list.first(where: { $0.status == .pending || $0.status == .preparing || $0.status == .delivering })
                ?? list.first
        } catch {
            currentOrder = nil
        }
    }

    private func statusKey(_ status: OrderLifecycleStatus) -> LocalizedStringKey {
        switch status {
        case .pending:
            return "orders.status.pending"
        case .preparing:
            return "orders.status.preparing"
        case .delivering:
            return "orders.status.delivering"
        case .completed:
            return "orders.status.completed"
        case .afterSale:
            return "orders.status.afterSale"
        case .cancelled:
            return "orders.status.cancelled"
        case .unknown:
            return "orders.status.unknown"
        }
    }

    private func statusColor(_ status: OrderLifecycleStatus) -> Color {
        switch status {
        case .pending:
            return .orange
        case .preparing:
            return .indigo
        case .delivering:
            return .blue
        case .completed:
            return .green
        case .afterSale:
            return .red
        case .cancelled:
            return .gray
        case .unknown:
            return .secondary
        }
    }

    @ViewBuilder
    private func sheetContent(_ sheet: HomeSheet) -> some View {
        switch sheet {
        case .address:
            MapAddressPickerView()
                .environmentObject(env)
        case .wallet:
            WalletCenterView()
                .environmentObject(env)
                .presentationDetents([.large])
        case .notifications:
            NotificationCenterView(initialNotificationID: nil)
                .environmentObject(env)
                .presentationDetents([.large])
        }
    }
}

private extension View {
    func glassCardStyle() -> some View {
        self
            .padding(12)
            .background(AppleTheme.cardBackground)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(AppleTheme.cardStroke, lineWidth: 1)
            )
            .shadow(color: AppleTheme.heroShadow, radius: 12, x: 0, y: 7)
    }
}

private enum HomeSheet: String, Identifiable {
    case address
    case wallet
    case notifications

    var id: String { rawValue }
}
