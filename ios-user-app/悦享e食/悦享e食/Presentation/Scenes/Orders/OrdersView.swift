import SwiftUI

struct OrdersView: View {
    @EnvironmentObject private var env: AppEnvironment
    @State private var selectedFilter: OrderFilter = .all
    @State private var selectedOrder: UserOrder?
    @State private var routedOrderId: String?
    @State private var orders: [UserOrder] = []
    @State private var isLoading = false
    @State private var errorText: String?

    private var activeUserID: String? {
        env.session.userPhone ?? env.session.userId
    }

    private var filteredOrders: [UserOrder] {
        switch selectedFilter {
        case .all:
            return orders
        case .pending:
            return orders.filter { $0.status == .pending || $0.status == .preparing || $0.status == .delivering }
        case .completed:
            return orders.filter { $0.status == .completed }
        case .afterSale:
            return orders.filter { $0.status == .afterSale || $0.status == .cancelled }
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 14) {
                        filterBar

                        if let routedOrderId {
                            routeBanner(orderId: routedOrderId)
                        }

                        if isLoading && filteredOrders.isEmpty {
                            GlassCard {
                                HStack(spacing: 10) {
                                    ProgressView()
                                    Text("orders.loading")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                }
                            }
                        } else if let errorText, filteredOrders.isEmpty {
                            GlassCard {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text(errorText)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Button("orders.retry") {
                                        Task { await loadOrders() }
                                    }
                                    .font(.subheadline.weight(.semibold))
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        } else if filteredOrders.isEmpty {
                            GlassCard {
                                Text("orders.empty")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        } else {
                            ForEach(filteredOrders) { order in
                                Button {
                                    selectedOrder = order
                                } label: {
                                    orderCard(order)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("orders.title")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $selectedOrder) { order in
                OrderDetailView(orderId: order.id, snapshot: order)
                    .environmentObject(env)
                    .presentationDetents([.medium, .large])
            }
            .onAppear {
                syncRouteIfNeeded()
            }
            .onChange(of: env.coordinator.pendingRoute) { _ in
                syncRouteIfNeeded()
            }
            .task(id: activeUserID) {
                await loadOrders()
            }
            .refreshable {
                await loadOrders()
            }
        }
    }

    private var filterBar: some View {
        GlassCard {
            Picker("", selection: $selectedFilter) {
                ForEach(OrderFilter.allCases) { filter in
                    Text(filter.titleKey).tag(filter)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private func routeBanner(orderId: String) -> some View {
        GlassCard {
            HStack(spacing: 10) {
                Image(systemName: "bell.badge.fill")
                    .foregroundStyle(.indigo)
                Text("orders.route.banner")
                    .font(.subheadline.weight(.medium))
                Spacer()
                Button("orders.route.open") {
                    if let order = orders.first(where: { $0.id == orderId }) {
                        selectedOrder = order
                    } else {
                        errorText = String(localized: "orders.route.missing")
                    }
                }
                .font(.subheadline.weight(.semibold))
            }
        }
    }

    private func orderCard(_ order: UserOrder) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(order.shopName)
                        .font(.headline)
                        .lineLimit(1)
                    Spacer()
                    StatusPill(text: order.status.titleKey, color: order.status.color)
                }

                Text(order.address.isEmpty ? String(localized: "orders.address.unavailable") : order.address)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack {
                    Text(order.id)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(order.timeText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()

                HStack {
                    Text("orders.card.items")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(order.itemCount)")
                        .font(.caption.weight(.semibold))
                    Spacer()
                    Text("orders.card.total")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(currencyText(order.totalPrice))
                        .font(.headline.weight(.semibold))
                }
            }
        }
    }

    private func syncRouteIfNeeded() {
        guard case let .orderDetail(orderId) = env.coordinator.pendingRoute else {
            return
        }
        routedOrderId = orderId
    }

    private func loadOrders() async {
        guard let userID = activeUserID, !userID.isEmpty else {
            orders = []
            errorText = String(localized: "orders.user.required")
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            orders = try await env.orderService.fetchUserOrders(userId: userID)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func currencyText(_ amount: Double) -> String {
        String(format: "¥%.2f", amount)
    }
}

private extension OrderLifecycleStatus {
    var titleKey: LocalizedStringKey {
        switch self {
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

    var color: Color {
        switch self {
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
}

private enum OrderFilter: CaseIterable, Identifiable, Hashable {
    case all
    case pending
    case completed
    case afterSale

    var id: Self { self }

    var titleKey: LocalizedStringKey {
        switch self {
        case .all:
            return "orders.filter.all"
        case .pending:
            return "orders.filter.pending"
        case .completed:
            return "orders.filter.completed"
        case .afterSale:
            return "orders.filter.afterSale"
        }
    }
}
