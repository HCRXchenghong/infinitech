import SwiftUI

struct WalletCenterView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    @State private var balance: WalletBalanceSnapshot?
    @State private var transactions: [WalletTransactionRecord] = []
    @State private var selectedFilter: WalletFilter = .all
    @State private var selectedTransaction: WalletTransactionRecord?
    @State private var isLoading = false
    @State private var errorText: String?

    private var activeUserID: String? {
        env.session.userPhone ?? env.session.userId
    }

    private var filteredTransactions: [WalletTransactionRecord] {
        guard let filterType = selectedFilter.apiType else {
            return transactions
        }
        return transactions.filter { $0.type.lowercased() == filterType }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 12) {
                        balanceCard
                        transactionSection
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("wallet.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") { dismiss() }
                }
            }
            .task(id: activeUserID) {
                await loadData()
            }
            .refreshable {
                await loadData()
            }
            .sheet(item: $selectedTransaction) { tx in
                WalletTransactionDetailView(record: tx)
                    .presentationDetents([.medium, .large])
            }
        }
    }

    private var balanceCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("wallet.hero.title")
                            .font(.headline)
                        Text("wallet.hero.subtitle")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "wallet.pass.fill")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.blue)
                }

                Text(yuanText(balance?.balance ?? 0))
                    .font(.system(size: 34, weight: .bold, design: .rounded))

                HStack(spacing: 12) {
                    metricCard(
                        title: String(localized: "wallet.balance.available"),
                        value: yuanText(balance?.balance ?? 0)
                    )
                    metricCard(
                        title: String(localized: "wallet.balance.frozen"),
                        value: yuanText(balance?.frozenBalance ?? 0)
                    )
                    metricCard(
                        title: String(localized: "wallet.balance.total"),
                        value: yuanText(balance?.totalBalance ?? 0)
                    )
                }

                if let errorText {
                    Text(errorText)
                        .font(.footnote)
                        .foregroundStyle(.red)
                } else if isLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("wallet.loading")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Text("wallet.hint")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func metricCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(verbatim: value)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .background(Color.white.opacity(0.55))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var transactionSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("wallet.section.transactions")
                .font(.headline)
                .padding(.leading, 2)

            GlassCard {
                Picker("", selection: $selectedFilter) {
                    ForEach(WalletFilter.allCases) { filter in
                        Text(filter.titleKey).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
            }

            if isLoading && transactions.isEmpty {
                GlassCard {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("wallet.loading")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }
            } else if filteredTransactions.isEmpty {
                GlassCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("wallet.empty")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Button("wallet.retry") {
                            Task { await loadData() }
                        }
                        .font(.subheadline.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                ForEach(filteredTransactions) { item in
                    Button {
                        selectedTransaction = item
                    } label: {
                        transactionCard(item)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func transactionCard(_ record: WalletTransactionRecord) -> some View {
        GlassCard {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(directionColor(record.direction).opacity(0.16))
                        .frame(width: 40, height: 40)
                    Image(systemName: iconName(for: record.type))
                        .foregroundStyle(directionColor(record.direction))
                }

                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(typeLabel(record.type))
                            .font(.headline)
                            .lineLimit(1)
                        Spacer()
                        Text(amountText(record.amount))
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(directionColor(record.direction))
                    }

                    HStack {
                        Text(statusLabel(record.status))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(verbatim: record.createdAtText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let remark = record.description, !remark.isEmpty {
                        Text(verbatim: remark)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
            }
        }
    }

    private func loadData() async {
        guard let userID = activeUserID, !userID.isEmpty else {
            balance = nil
            transactions = []
            errorText = String(localized: "wallet.user.required")
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            async let balanceResult = env.walletService.fetchBalance(userId: userID, userType: env.session.userType)
            async let txResult = env.walletService.fetchTransactions(
                userId: userID,
                userType: env.session.userType,
                type: nil,
                page: 1,
                limit: 20
            )
            let (balanceResultValue, txResultValue) = try await (balanceResult, txResult)
            balance = balanceResultValue
            transactions = txResultValue.items
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func directionColor(_ direction: WalletTransactionDirection) -> Color {
        switch direction {
        case .income:
            return .green
        case .expense:
            return .red
        case .neutral:
            return .blue
        }
    }

    private func iconName(for type: String) -> String {
        switch type.lowercased() {
        case "payment":
            return "creditcard.fill"
        case "recharge":
            return "plus.circle.fill"
        case "refund":
            return "arrow.uturn.backward.circle.fill"
        case "withdraw":
            return "arrow.up.right.circle.fill"
        default:
            return "wallet.pass.fill"
        }
    }

    private func typeLabel(_ type: String) -> String {
        switch type.lowercased() {
        case "payment":
            return String(localized: "wallet.type.payment")
        case "recharge":
            return String(localized: "wallet.type.recharge")
        case "refund":
            return String(localized: "wallet.type.refund")
        case "withdraw":
            return String(localized: "wallet.type.withdraw")
        case "admin_add_balance":
            return String(localized: "wallet.type.admin.add")
        case "admin_deduct_balance":
            return String(localized: "wallet.type.admin.deduct")
        default:
            return String(localized: "wallet.type.unknown")
        }
    }

    private func statusLabel(_ status: String) -> String {
        switch status.lowercased() {
        case "success":
            return String(localized: "wallet.status.success")
        case "pending":
            return String(localized: "wallet.status.pending")
        case "processing":
            return String(localized: "wallet.status.processing")
        case "failed":
            return String(localized: "wallet.status.failed")
        case "cancelled":
            return String(localized: "wallet.status.cancelled")
        default:
            return String(localized: "wallet.status.unknown")
        }
    }

    private func amountText(_ amount: Int64) -> String {
        let sign: String
        if amount > 0 {
            sign = "+"
        } else if amount < 0 {
            sign = "-"
        } else {
            sign = ""
        }
        return "\(sign)\(yuanText(amount))"
    }

    private func yuanText(_ amountInFen: Int64) -> String {
        let value = Double(abs(amountInFen)) / 100
        return String(format: "¥%.2f", value)
    }
}

private struct WalletTransactionDetailView: View {
    @Environment(\.dismiss) private var dismiss

    let record: WalletTransactionRecord

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    GlassCard {
                        VStack(alignment: .leading, spacing: 10) {
                            detailRow("wallet.detail.type", value: typeLabel(record.type))
                            detailRow("wallet.detail.status", value: statusLabel(record.status))
                            detailRow("wallet.detail.amount", value: amountText(record.amount))
                            detailRow("wallet.detail.method", value: paymentMethodLabel(record.paymentMethod))
                            detailRow("wallet.detail.id", value: record.transactionId)
                            detailRow("wallet.detail.time", value: record.createdAtText)
                            detailRow("wallet.detail.remark", value: record.description ?? String(localized: "wallet.detail.none"))
                        }
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("wallet.detail.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") { dismiss() }
                }
            }
        }
    }

    private func detailRow(_ key: LocalizedStringKey, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(key)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(verbatim: value)
                .font(.subheadline)
                .foregroundStyle(.primary)
                .textSelection(.enabled)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func amountText(_ amount: Int64) -> String {
        let sign: String
        if amount > 0 {
            sign = "+"
        } else if amount < 0 {
            sign = "-"
        } else {
            sign = ""
        }
        let value = Double(abs(amount)) / 100
        return "\(sign)\(String(format: "¥%.2f", value))"
    }

    private func paymentMethodLabel(_ method: String?) -> String {
        let value = (method ?? "").lowercased()
        switch value {
        case "ifpay", "if-pay", "if_pay":
            return String(localized: "orders.detail.payment.method.ifpay")
        case "wechat", "wxpay", "wechatpay":
            return String(localized: "orders.detail.payment.method.wechat")
        case "alipay", "ali":
            return String(localized: "orders.detail.payment.method.alipay")
        default:
            return String(localized: "wallet.detail.none")
        }
    }

    private func typeLabel(_ type: String) -> String {
        switch type.lowercased() {
        case "payment":
            return String(localized: "wallet.type.payment")
        case "recharge":
            return String(localized: "wallet.type.recharge")
        case "refund":
            return String(localized: "wallet.type.refund")
        case "withdraw":
            return String(localized: "wallet.type.withdraw")
        case "admin_add_balance":
            return String(localized: "wallet.type.admin.add")
        case "admin_deduct_balance":
            return String(localized: "wallet.type.admin.deduct")
        default:
            return String(localized: "wallet.type.unknown")
        }
    }

    private func statusLabel(_ status: String) -> String {
        switch status.lowercased() {
        case "success":
            return String(localized: "wallet.status.success")
        case "pending":
            return String(localized: "wallet.status.pending")
        case "processing":
            return String(localized: "wallet.status.processing")
        case "failed":
            return String(localized: "wallet.status.failed")
        case "cancelled":
            return String(localized: "wallet.status.cancelled")
        default:
            return String(localized: "wallet.status.unknown")
        }
    }
}

private enum WalletFilter: String, CaseIterable, Identifiable, Hashable {
    case all
    case payment
    case recharge
    case refund
    case withdraw

    var id: Self { self }

    var apiType: String? {
        switch self {
        case .all:
            return nil
        case .payment:
            return "payment"
        case .recharge:
            return "recharge"
        case .refund:
            return "refund"
        case .withdraw:
            return "withdraw"
        }
    }

    var titleKey: LocalizedStringKey {
        switch self {
        case .all:
            return "wallet.filter.all"
        case .payment:
            return "wallet.filter.payment"
        case .recharge:
            return "wallet.filter.recharge"
        case .refund:
            return "wallet.filter.refund"
        case .withdraw:
            return "wallet.filter.withdraw"
        }
    }
}
