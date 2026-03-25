import SwiftUI

struct MessageConversationView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    let conversation: ConversationSummary

    @State private var messages: [ChatMessage] = []
    @State private var draft = ""
    @State private var isLoading = false
    @State private var isSending = false
    @State private var errorText: String?

    private var senderId: String {
        env.session.userId ?? env.session.userPhone ?? ""
    }

    private var senderName: String {
        env.session.userName ?? String(localized: "messages.me.default")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                VStack(spacing: 10) {
                    conversationMetaCard
                    content
                    composer
                }
                .padding(.horizontal, AppleTheme.pagePadding)
                .padding(.top, 10)
                .padding(.bottom, 14)
            }
            .navigationTitle(conversation.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task { await loadHistory() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("messages.chat.refresh")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") {
                        dismiss()
                    }
                }
            }
            .task(id: conversation.chatId) {
                await loadHistory()
            }
        }
    }

    private var conversationMetaCard: some View {
        GlassCard {
            HStack(spacing: 10) {
                Circle()
                    .fill(roleColor.opacity(0.18))
                    .frame(width: 34, height: 34)
                    .overlay(
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                            .font(.subheadline)
                            .foregroundStyle(roleColor)
                    )

                VStack(alignment: .leading, spacing: 3) {
                    Text(verbatim: conversation.name)
                        .font(.subheadline.weight(.semibold))
                    Text(verbatim: roleLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if conversation.unread > 0 {
                    Text("\(conversation.unread) \(String(localized: "messages.unread"))")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red)
                        .clipShape(Capsule())
                }
            }
        }
    }

    private var content: some View {
        Group {
            if isLoading && messages.isEmpty {
                GlassCard {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("messages.chat.loading")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }
            } else if messages.isEmpty {
                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(errorText ?? String(localized: "messages.chat.empty"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Button("messages.chat.retry") {
                            Task { await loadHistory() }
                        }
                        .font(.subheadline.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(messages) { message in
                                bubble(message)
                                    .id(message.id)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    .onAppear {
                        scrollToBottom(proxy: proxy)
                    }
                    .onChange(of: messages.count) { _ in
                        scrollToBottom(proxy: proxy)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var composer: some View {
        GlassCard {
            VStack(spacing: 10) {
                if let errorText {
                    Text(errorText)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                HStack(alignment: .bottom, spacing: 10) {
                    TextField("messages.chat.placeholder", text: $draft, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1 ... 4)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.78))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                    Button(isSending ? String(localized: "messages.chat.sending") : String(localized: "messages.chat.send")) {
                        Task { await sendMessage() }
                    }
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.blue.opacity(0.12))
                    .foregroundStyle(.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .disabled(isSending || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func bubble(_ message: ChatMessage) -> some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.isSelf {
                Spacer(minLength: 50)
            }

            VStack(alignment: message.isSelf ? .trailing : .leading, spacing: 4) {
                if !message.isSelf {
                    Text(verbatim: message.senderName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                bubbleContent(message)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(message.isSelf ? Color.blue : Color.white.opacity(0.82))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                Text(verbatim: message.timeText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if !message.isSelf {
                Spacer(minLength: 50)
            }
        }
    }

    @ViewBuilder
    private func bubbleContent(_ message: ChatMessage) -> some View {
        switch message.type {
        case .text, .unknown:
            Text(verbatim: message.content)
                .font(.subheadline)
                .foregroundStyle(message.isSelf ? .white : .primary)
        case .image:
            imageBubble(message)
        case .order:
            orderBubble(message)
        }
    }

    private func imageBubble(_ message: ChatMessage) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            if let imageURL = message.imageURL, let url = URL(string: imageURL), !imageURL.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        placeholderImage
                    default:
                        ZStack {
                            Color.black.opacity(0.08)
                            ProgressView()
                        }
                    }
                }
                .frame(width: 172, height: 132)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            } else {
                placeholderImage
                    .frame(width: 172, height: 132)
            }

            if !message.content.isEmpty {
                Text(verbatim: message.content)
                    .font(.caption)
                    .foregroundStyle(message.isSelf ? .white.opacity(0.9) : .secondary)
            }
        }
    }

    private var placeholderImage: some View {
        ZStack {
            Color.black.opacity(0.08)
            VStack(spacing: 6) {
                Image(systemName: "photo.on.rectangle.angled")
                Text("messages.chat.image.placeholder")
                    .font(.caption2)
            }
            .foregroundStyle(.secondary)
        }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func orderBubble(_ message: ChatMessage) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 6) {
                Image(systemName: "bag.fill")
                    .font(.caption)
                Text("messages.chat.order.label")
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(message.isSelf ? .white : .blue)

            Text(verbatim: message.content)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(message.isSelf ? .white : .primary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var roleLabel: String {
        switch conversation.role {
        case .rider:
            return String(localized: "messages.chat.role.rider")
        case .shop:
            return String(localized: "messages.chat.role.shop")
        case .cs:
            return String(localized: "messages.chat.role.cs")
        case .user:
            return String(localized: "messages.chat.role.user")
        case .unknown:
            return String(localized: "messages.chat.role.unknown")
        }
    }

    private var roleColor: Color {
        switch conversation.role {
        case .rider:
            return .green
        case .shop:
            return .orange
        case .cs:
            return .blue
        case .user:
            return .teal
        case .unknown:
            return .secondary
        }
    }

    private func loadHistory() async {
        isLoading = true
        defer { isLoading = false }

        do {
            messages = try await env.messageService.fetchHistory(roomId: conversation.chatId)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func sendMessage() async {
        let content = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        guard !senderId.isEmpty else {
            errorText = String(localized: "messages.chat.send.failed")
            return
        }

        isSending = true
        defer { isSending = false }

        let temporary = ChatMessage(
            id: UUID().uuidString,
            chatId: conversation.chatId,
            senderId: senderId,
            senderRole: .user,
            senderName: senderName,
            content: content,
            type: .text,
            imageURL: nil,
            timeText: currentClockText(),
            isSelf: true
        )
        messages.append(temporary)
        draft = ""

        do {
            let sent = try await env.messageService.sendMessage(
                roomId: conversation.chatId,
                senderId: senderId,
                senderName: senderName,
                content: content
            )
            if let index = messages.firstIndex(where: { $0.id == temporary.id }) {
                messages[index] = sent
            } else {
                messages.append(sent)
            }
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func currentClockText() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: Date())
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let last = messages.last else { return }
        withAnimation(.easeOut(duration: 0.25)) {
            proxy.scrollTo(last.id, anchor: .bottom)
        }
    }
}
