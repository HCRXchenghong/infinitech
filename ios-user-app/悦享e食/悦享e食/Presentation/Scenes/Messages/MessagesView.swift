import SwiftUI

struct MessagesView: View {
    @EnvironmentObject private var env: AppEnvironment
    @State private var segment: MessageSegment = .chat
    @State private var highlightedConversation: String?
    @State private var routedNotice: String?
    @State private var routedRoomId: String?
    @State private var routedNotificationId: String?
    @State private var conversations: [ConversationSummary] = []
    @State private var isLoading = false
    @State private var errorText: String?
    @State private var activeConversation: ConversationSummary?
    @State private var showNotificationCenter = false

    private var chatItems: [MessageItem] {
        conversations.map { item in
            MessageItem(
                id: item.chatId,
                title: item.name,
                preview: item.preview,
                time: item.timeText,
                unread: item.unread,
                isOnline: item.role != .cs,
                type: .chat
            )
        }
    }

    private var systemItems: [MessageItem] {
        [
            MessageItem(
                id: "SYSTEM-NOTICE",
                title: String(localized: "messages.sample.official"),
                preview: String(localized: "messages.sample.official.preview"),
                time: String(localized: "messages.system.time"),
                unread: 0,
                isOnline: false,
                type: .system
            )
        ]
    }

    private var filteredConversations: [MessageItem] {
        segment == .chat ? chatItems : systemItems
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 14) {
                        segmentBar

                        if let routedNotice {
                            routeBanner(routedNotice)
                        }

                        if isLoading && filteredConversations.isEmpty {
                            GlassCard {
                                HStack(spacing: 10) {
                                    ProgressView()
                                    Text("messages.loading")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                }
                            }
                        } else if let errorText, filteredConversations.isEmpty {
                            GlassCard {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text(errorText)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Button("messages.retry") {
                                        Task { await loadConversations() }
                                    }
                                    .font(.subheadline.weight(.semibold))
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        } else if filteredConversations.isEmpty {
                            GlassCard {
                                Text("messages.empty")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        } else {
                            ForEach(filteredConversations) { conversation in
                                Button {
                                    openConversation(conversation)
                                } label: {
                                    conversationCard(conversation)
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
            .navigationTitle("messages.title")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                applyPendingRoute()
            }
            .onChange(of: env.coordinator.pendingRoute) { _ in
                applyPendingRoute()
            }
            .sheet(item: $activeConversation) { conversation in
                MessageConversationView(conversation: conversation)
                    .environmentObject(env)
                    .presentationDetents([.large])
            }
            .sheet(isPresented: $showNotificationCenter) {
                NotificationCenterView(initialNotificationID: routedNotificationId)
                    .environmentObject(env)
                    .presentationDetents([.large])
            }
            .task {
                await loadConversations()
            }
            .refreshable {
                await loadConversations()
            }
        }
    }

    private var segmentBar: some View {
        GlassCard {
            Picker("", selection: $segment) {
                Text("messages.segment.chat").tag(MessageSegment.chat)
                Text("messages.segment.system").tag(MessageSegment.system)
            }
            .pickerStyle(.segmented)
        }
    }

    private func routeBanner(_ value: String) -> some View {
        GlassCard {
            HStack(spacing: 10) {
                Image(systemName: "paperplane.circle.fill")
                    .foregroundStyle(.blue)
                Text(value)
                    .font(.subheadline)
                Spacer()
                Button("messages.route.open") {
                    openRoutedConversation()
                }
                .font(.subheadline.weight(.semibold))
            }
        }
    }

    private func conversationCard(_ conversation: MessageItem) -> some View {
        GlassCard {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(conversation.type == .chat ? Color.blue.opacity(0.12) : Color.indigo.opacity(0.12))
                        .frame(width: 42, height: 42)
                    Image(systemName: conversation.type == .chat ? "bubble.left.and.bubble.right.fill" : "megaphone.fill")
                        .foregroundStyle(conversation.type == .chat ? .blue : .indigo)
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(verbatim: conversation.title)
                            .font(.headline)
                            .lineLimit(1)
                        if conversation.isOnline {
                            Text("messages.online")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.green)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green.opacity(0.15))
                                .clipShape(Capsule())
                        }
                        Spacer()
                        Text(verbatim: conversation.time)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text(verbatim: conversation.preview)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)

                    if conversation.unread > 0 {
                        HStack {
                            Spacer()
                            Text("\(conversation.unread) \(String(localized: "messages.unread"))")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.red)
                                .clipShape(Capsule())
                        }
                    } else if highlightedConversation == conversation.id {
                        Text("messages.lastUpdate")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func applyPendingRoute() {
        switch env.coordinator.pendingRoute {
        case let .chat(roomId):
            segment = .chat
            routedNotice = String(localized: "messages.route.chat")
            highlightedConversation = roomId
            routedRoomId = roomId
            openRoutedConversation()
        case let .notification(notificationId):
            segment = .system
            routedNotice = String(localized: "messages.route.notification")
            highlightedConversation = notificationId
            routedNotificationId = notificationId
            routedRoomId = nil
        default:
            break
        }
    }

    private func loadConversations() async {
        isLoading = true
        defer { isLoading = false }

        do {
            conversations = try await env.messageService.fetchConversations()
            applyPendingRoute()
            openRoutedConversation()
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func openConversation(_ item: MessageItem) {
        highlightedConversation = item.id
        guard item.type == .chat else {
            openNotificationCenter()
            return
        }
        guard let target = conversations.first(where: { $0.chatId == item.id }) else { return }
        activeConversation = target
    }

    private func openRoutedConversation() {
        guard segment == .chat else {
            if segment == .system, let first = systemItems.first {
                highlightedConversation = first.id
                if routedNotificationId != nil || routedNotice != nil {
                    openNotificationCenter()
                }
            }
            return
        }
        guard let roomId = routedRoomId, !roomId.isEmpty else {
            return
        }
        if let target = conversations.first(where: { $0.chatId == roomId }) {
            activeConversation = target
            highlightedConversation = roomId
        }
    }

    private func openNotificationCenter() {
        showNotificationCenter = true
    }
}

private enum MessageSegment: Hashable {
    case chat
    case system
}

private enum MessageType {
    case chat
    case system
}

private struct MessageItem: Identifiable {
    let id: String
    let title: String
    let preview: String
    let time: String
    let unread: Int
    let isOnline: Bool
    let type: MessageType
}
