import SwiftUI

struct NotificationCenterView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    let initialNotificationID: String?

    @State private var notifications: [AppNotificationSummary] = []
    @State private var page = 1
    @State private var pageSize = 20
    @State private var hasMore = true
    @State private var isLoading = false
    @State private var isLoadingMore = false
    @State private var errorText: String?
    @State private var activeRoute: NotificationRoute?
    @State private var didOpenInitialRoute = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 12) {
                        if isLoading && notifications.isEmpty {
                            loadingCard
                        } else if let errorText, notifications.isEmpty {
                            errorCard(errorText)
                        } else if notifications.isEmpty {
                            emptyCard
                        } else {
                            ForEach(notifications) { item in
                                Button {
                                    activeRoute = NotificationRoute(id: item.id)
                                } label: {
                                    notificationCard(item)
                                }
                                .buttonStyle(.plain)
                                .onAppear {
                                    triggerLoadMoreIfNeeded(currentID: item.id)
                                }
                            }

                            footerState
                        }
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("notifications.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") { dismiss() }
                }
            }
            .task {
                await bootstrapIfNeeded()
            }
            .refreshable {
                await loadPage(reset: true)
            }
            .sheet(item: $activeRoute) { route in
                NotificationDetailView(notificationID: route.id)
                    .environmentObject(env)
                    .presentationDetents([.large])
            }
        }
    }

    private var loadingCard: some View {
        GlassCard {
            HStack(spacing: 8) {
                ProgressView()
                Text("notifications.loading")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
    }

    private func errorCard(_ text: String) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text(verbatim: text)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Button("notifications.retry") {
                    Task { await loadPage(reset: true) }
                }
                .font(.subheadline.weight(.semibold))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var emptyCard: some View {
        GlassCard {
            Text("notifications.empty")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private var footerState: some View {
        if isLoadingMore {
            GlassCard {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("notifications.loading")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }
        } else if !hasMore {
            GlassCard {
                Text("notifications.noMore")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
    }

    private func notificationCard(_ item: AppNotificationSummary) -> some View {
        GlassCard {
            HStack(alignment: .top, spacing: 12) {
                if let cover = item.coverURL, let url = URL(string: cover), !cover.isEmpty {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.secondary.opacity(0.12)
                        }
                    }
                    .frame(width: 92, height: 68)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                } else {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.indigo.opacity(0.14))
                        .frame(width: 92, height: 68)
                        .overlay {
                            Image(systemName: "bell.badge.fill")
                                .font(.title3.weight(.semibold))
                                .foregroundStyle(.indigo)
                        }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(verbatim: item.title)
                        .font(.headline)
                        .lineLimit(2)

                    Text(verbatim: item.summary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)

                    HStack {
                        Text(verbatim: item.source)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(verbatim: item.createdAtText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        if !item.isRead {
                            Circle()
                                .fill(Color.red)
                                .frame(width: 7, height: 7)
                        }
                    }
                }
            }
        }
    }

    private func bootstrapIfNeeded() async {
        if notifications.isEmpty {
            await loadPage(reset: true)
        }
        guard !didOpenInitialRoute else { return }
        didOpenInitialRoute = true
        if let initialNotificationID, !initialNotificationID.isEmpty {
            activeRoute = NotificationRoute(id: initialNotificationID)
        }
    }

    private func triggerLoadMoreIfNeeded(currentID: String) {
        guard hasMore,
              !isLoading,
              !isLoadingMore,
              notifications.last?.id == currentID else {
            return
        }
        Task { await loadPage(reset: false) }
    }

    private func loadPage(reset: Bool) async {
        if reset {
            page = 1
            hasMore = true
            errorText = nil
        }

        guard hasMore else { return }
        if reset {
            isLoading = true
        } else {
            isLoadingMore = true
        }
        defer {
            isLoading = false
            isLoadingMore = false
        }

        do {
            let result = try await env.notificationService.fetchNotifications(page: page, pageSize: pageSize)
            if reset {
                notifications = result.items
            } else {
                notifications += result.items
            }
            page = result.page + 1
            pageSize = result.pageSize
            hasMore = result.items.count >= result.pageSize
            errorText = nil
        } catch {
            if notifications.isEmpty {
                errorText = error.localizedDescription
            }
        }
    }
}

private struct NotificationRoute: Identifiable {
    let id: String
}

private struct NotificationDetailView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    let notificationID: String

    @State private var detail: AppNotificationDetail?
    @State private var isLoading = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 12) {
                        if isLoading {
                            GlassCard {
                                HStack(spacing: 8) {
                                    ProgressView()
                                    Text("notifications.detail.loading")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                }
                            }
                        } else if let detail {
                            detailContent(detail)
                        } else {
                            GlassCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(errorText ?? String(localized: "notifications.detail.empty"))
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Button("notifications.retry") {
                                        Task { await loadDetail() }
                                    }
                                    .font(.subheadline.weight(.semibold))
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("notifications.detail.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") { dismiss() }
                }
            }
            .task(id: notificationID) {
                await loadDetail()
            }
        }
    }

    private func detailContent(_ detail: AppNotificationDetail) -> some View {
        VStack(spacing: 12) {
            GlassCard {
                VStack(alignment: .leading, spacing: 10) {
                    Text(verbatim: detail.title)
                        .font(.title3.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .leading)

                    HStack {
                        Text(verbatim: detail.timeText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(verbatim: detail.source)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }
            }

            if let cover = detail.coverURL, let url = URL(string: cover), !cover.isEmpty {
                GlassCard {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.secondary.opacity(0.12)
                        }
                    }
                    .frame(height: 190)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }

            GlassCard {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(Array(detail.blocks.enumerated()), id: \.offset) { entry in
                        renderBlock(entry.element)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    @ViewBuilder
    private func renderBlock(_ block: AppNotificationBlock) -> some View {
        switch block {
        case let .heading(text):
            Text(verbatim: text)
                .font(.headline)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
        case let .paragraph(text):
            Text(verbatim: text)
                .font(.body)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
        case let .quote(text):
            Text(verbatim: text)
                .font(.body.italic())
                .foregroundStyle(.secondary)
                .padding(.leading, 10)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Color.indigo.opacity(0.45))
                        .frame(width: 3)
                }
        case let .bulletList(items):
            VStack(alignment: .leading, spacing: 5) {
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .top, spacing: 6) {
                        Text("•")
                            .font(.body.weight(.bold))
                        Text(verbatim: item)
                            .font(.body)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case let .image(urlText, caption):
            VStack(alignment: .leading, spacing: 6) {
                if let url = URL(string: urlText) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.secondary.opacity(0.12)
                        }
                    }
                    .frame(height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                if let caption, !caption.isEmpty {
                    Text(verbatim: caption)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    private func loadDetail() async {
        isLoading = true
        defer { isLoading = false }
        do {
            detail = try await env.notificationService.fetchNotificationDetail(id: notificationID)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }
}
