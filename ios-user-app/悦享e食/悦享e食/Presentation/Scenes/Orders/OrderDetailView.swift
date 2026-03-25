import SwiftUI

struct OrderDetailView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    let orderId: String
    let snapshot: UserOrder?

    @State private var detail: UserOrderDetail?
    @State private var isLoading = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 12) {
                        summaryCard

                        if let detail {
                            shopCard(detail)
                            paymentCard(detail)
                            deliveryCard(detail)
                            if shouldShowBizCard(detail) {
                                bizCard(detail)
                            }
                            itemsCard(detail)
                            metaCard(detail)
                        } else if isLoading {
                            loadingCard
                        } else {
                            errorCard
                        }
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("orders.detail.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") {
                        dismiss()
                    }
                }
            }
            .task(id: orderId) {
                await loadDetail()
            }
        }
    }

    private var loadingCard: some View {
        GlassCard {
            HStack(spacing: 8) {
                ProgressView()
                Text("orders.detail.loading")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
    }

    private var errorCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(errorText ?? String(localized: "orders.detail.error.empty"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Button("orders.detail.retry") {
                    Task { await loadDetail() }
                }
                .font(.subheadline.weight(.semibold))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var summaryCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("orders.detail.orderId")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(verbatim: "#\(detail?.id ?? snapshot?.id ?? orderId)")
                            .font(.headline)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 6) {
                        StatusPill(text: statusKey, color: statusColor)
                        Text(verbatim: paymentStatusLabel(detail?.paymentStatus))
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                }

                Divider()

                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("orders.card.total")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(currencyText(totalPrice))
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        metricRow(titleKey: "orders.detail.productFee", value: currencyText(productPrice))
                        metricRow(titleKey: "orders.detail.deliveryFee", value: currencyText(deliveryFee))
                    }
                }

                if let detail, !detail.displayTags.isEmpty {
                    tagsWrap(detail.displayTags)
                }
            }
        }
    }

    private func metricRow(titleKey: LocalizedStringKey, value: String) -> some View {
        HStack(spacing: 6) {
            Text(titleKey)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(verbatim: value)
                .font(.caption.weight(.semibold))
        }
    }

    private func shopCard(_ detail: UserOrderDetail) -> some View {
        GlassCard {
            HStack(spacing: 10) {
                if let logo = detail.shopLogo, let url = URL(string: logo), !logo.isEmpty {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.secondary.opacity(0.12)
                        }
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                } else {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.secondary.opacity(0.12))
                        .frame(width: 44, height: 44)
                        .overlay(Image(systemName: "storefront.fill").foregroundStyle(.secondary))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("orders.detail.shop")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(verbatim: detail.shopName)
                        .font(.headline)
                }
                Spacer()
            }
        }
    }

    private func paymentCard(_ detail: UserOrderDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Label {
                    Text("orders.detail.payment")
                        .font(.headline)
                } icon: {
                    Image(systemName: "wallet.pass.fill")
                        .foregroundStyle(.blue)
                }

                infoRow("orders.detail.paymentMethod", paymentMethodLabel(detail.paymentMethod))
                infoRow("orders.detail.paymentStatus", paymentStatusLabel(detail.paymentStatus))
                infoRow("orders.detail.paidAt", formatDate(detail.paidAt))
            }
            .font(.subheadline)
        }
    }

    private func deliveryCard(_ detail: UserOrderDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Label {
                    Text("orders.detail.delivery")
                        .font(.headline)
                } icon: {
                    Image(systemName: "location.fill")
                        .foregroundStyle(.indigo)
                }

                infoRow("orders.detail.address", detail.address ?? String(localized: "orders.address.unavailable"))

                if let deliveryName = detail.deliveryName, !deliveryName.isEmpty {
                    infoRow("orders.detail.deliveryContact", deliveryName)
                }

                if let riderName = detail.riderName, !riderName.isEmpty {
                    infoRow("orders.detail.rider", riderName)
                }

                if let rating = detail.riderRating {
                    let count = detail.riderRatingCount ?? 0
                    infoRow("orders.detail.riderRating", String(format: "%.1f (%d)", rating, count))
                }

                HStack(spacing: 10) {
                    if let riderPhone = detail.riderPhone, !riderPhone.isEmpty {
                        actionPill(titleKey: "orders.detail.riderCall", icon: "phone.fill") {
                            dial(riderPhone)
                        }
                    }
                    if let deliveryPhone = detail.deliveryPhone, !deliveryPhone.isEmpty {
                        actionPill(titleKey: "orders.detail.deliveryCall", icon: "phone.circle.fill") {
                            dial(deliveryPhone)
                        }
                    }
                }
            }
            .font(.subheadline)
        }
    }

    private func actionPill(titleKey: LocalizedStringKey, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(titleKey)
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.blue)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Color.blue.opacity(0.12))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func bizCard(_ detail: UserOrderDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Label {
                    Text("orders.detail.biz")
                        .font(.headline)
                } icon: {
                    Image(systemName: "shippingbox.fill")
                        .foregroundStyle(.teal)
                }

                infoRow("orders.detail.bizType", bizTypeLabel(detail.bizType))

                if !detail.displayTags.isEmpty {
                    tagsWrap(detail.displayTags)
                }

                if detail.bizType.lowercased() == "groupbuy" {
                    if detail.canRedeem {
                        Text("orders.detail.groupbuy.redeem")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                    if detail.canRefund {
                        Text("orders.detail.groupbuy.refund")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
            }
            .font(.subheadline)
        }
    }

    private func tagsWrap(_ tags: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(tags, id: \.self) { tag in
                    Text(verbatim: tag)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color.black.opacity(0.06))
                        .clipShape(Capsule())
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func itemsCard(_ detail: UserOrderDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("orders.detail.items")
                    .font(.headline)

                if detail.items.isEmpty {
                    Text("orders.detail.items.empty")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(detail.items) { item in
                        HStack(spacing: 10) {
                            if let image = item.imageURL, let url = URL(string: image), !image.isEmpty {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case let .success(image):
                                        image.resizable().scaledToFill()
                                    default:
                                        Color.secondary.opacity(0.12)
                                    }
                                }
                                .frame(width: 32, height: 32)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }

                            Text(verbatim: item.name)
                                .lineLimit(1)
                            Spacer()
                            Text("x\(item.quantity)")
                                .foregroundStyle(.secondary)
                            Text(currencyText(item.unitPrice))
                                .font(.subheadline.weight(.semibold))
                        }
                        .font(.subheadline)
                    }
                }
            }
        }
    }

    private func metaCard(_ detail: UserOrderDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("orders.detail.meta")
                    .font(.headline)

                infoRow("orders.detail.status", detail.statusText)
                infoRow("orders.detail.createdAt", formatDate(detail.createdAt))
                infoRow("orders.detail.paidAt", formatDate(detail.paidAt))
                infoRow("orders.detail.completedAt", formatDate(detail.completedAt))
            }
            .font(.subheadline)
        }
    }

    private func infoRow(_ titleKey: LocalizedStringKey, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(titleKey)
                .foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(verbatim: value.isEmpty ? String(localized: "orders.detail.value.none") : value)
                .multilineTextAlignment(.trailing)
        }
    }

    private func shouldShowBizCard(_ detail: UserOrderDetail) -> Bool {
        !detail.displayTags.isEmpty || detail.bizType.lowercased() == "groupbuy"
    }

    private func loadDetail() async {
        isLoading = true
        defer { isLoading = false }

        do {
            detail = try await env.orderService.fetchOrderDetail(orderId: orderId)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private var statusKey: LocalizedStringKey {
        let status = detail?.status ?? snapshot?.status ?? .unknown
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

    private var statusColor: Color {
        let status = detail?.status ?? snapshot?.status ?? .unknown
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

    private var totalPrice: Double {
        detail?.totalPrice ?? snapshot?.totalPrice ?? 0
    }

    private var productPrice: Double {
        detail?.productPrice ?? 0
    }

    private var deliveryFee: Double {
        detail?.deliveryFee ?? 0
    }

    private func paymentMethodLabel(_ raw: String?) -> String {
        let value = raw?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        switch value {
        case "ifpay":
            return String(localized: "orders.detail.payment.method.ifpay")
        case "wechat", "wx", "wechatpay":
            return String(localized: "orders.detail.payment.method.wechat")
        case "alipay":
            return String(localized: "orders.detail.payment.method.alipay")
        case "apple_pay", "applepay":
            return String(localized: "orders.detail.payment.method.applepay")
        case "":
            return String(localized: "orders.detail.value.none")
        default:
            return value
        }
    }

    private func paymentStatusLabel(_ raw: String?) -> String {
        let value = raw?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        switch value {
        case "paid":
            return String(localized: "orders.detail.payment.status.paid")
        case "unpaid":
            return String(localized: "orders.detail.payment.status.unpaid")
        case "refunded":
            return String(localized: "orders.detail.payment.status.refunded")
        case "refunding":
            return String(localized: "orders.detail.payment.status.refunding")
        case "":
            return String(localized: "orders.detail.payment.status.unknown")
        default:
            return value
        }
    }

    private func bizTypeLabel(_ raw: String) -> String {
        switch raw.lowercased() {
        case "groupbuy":
            return String(localized: "orders.detail.biz.groupbuy")
        default:
            return String(localized: "orders.detail.biz.takeout")
        }
    }

    private func dial(_ rawNumber: String) {
        let phone = rawNumber.filter { $0.isNumber || $0 == "+" }
        guard !phone.isEmpty, let url = URL(string: "tel://\(phone)") else {
            return
        }
        openURL(url)
    }

    private func currencyText(_ amount: Double) -> String {
        String(format: "¥%.2f", amount)
    }

    private func formatDate(_ date: Date?) -> String {
        guard let date else {
            return "--"
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }
}
