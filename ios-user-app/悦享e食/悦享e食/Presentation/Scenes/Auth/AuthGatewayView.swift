import SwiftUI
import Combine
#if os(iOS)
import UIKit
#endif

@MainActor
final class AuthViewModel: ObservableObject {
    enum Mode {
        case code
        case password
    }

    @Published var phone = ""
    @Published var code = ""
    @Published var password = ""
    @Published var nickname = ""
    @Published var mode: Mode = .password
    @Published var isLoading = false
    @Published var errorText: String?
    @Published var cooldown = 0
    @Published var showRegister = false

    private let authService: AuthRemoteService
    private let session: AppSessionStore
    private var timer: Timer?

    init(authService: AuthRemoteService, session: AppSessionStore) {
        self.authService = authService
        self.session = session
    }

    deinit {
        timer?.invalidate()
    }

    func sendCode() async {
        if cooldown > 0 || isLoading { return }
        guard validPhone(phone) else {
            errorText = String(localized: "auth.phone.invalid")
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            _ = try await authService.requestSMSCode(phone: phone, scene: "login")
            errorText = nil
            beginCooldown()
        } catch {
            errorText = error.localizedDescription
        }
    }

    func login() async {
        guard validPhone(phone) else {
            errorText = String(localized: "auth.phone.invalid")
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let response: AuthLoginResponse
            switch mode {
            case .code:
                guard !code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    errorText = String(localized: "auth.code.required")
                    return
                }
                response = try await authService.loginWithCode(phone: phone, code: code)
            case .password:
                guard !password.isEmpty else {
                    errorText = String(localized: "auth.password.required")
                    return
                }
                response = try await authService.loginWithPassword(phone: phone, password: password)
            }

            guard response.success != false,
                  let token = response.token,
                  let refresh = response.refreshToken,
                  let user = response.user,
                  let userId = user.effectiveID else {
                errorText = response.error ?? response.message ?? String(localized: "auth.login.failed")
                return
            }

            session.saveLogin(
                accessToken: token,
                refreshToken: refresh,
                expiresIn: response.expiresIn,
                userId: userId,
                userPhone: user.phone,
                userType: "customer",
                userName: user.displayName
            )
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }

    func register() async {
        guard validPhone(phone) else {
            errorText = String(localized: "auth.phone.invalid")
            return
        }
        guard nickname.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 else {
            errorText = String(localized: "auth.nickname.invalid")
            return
        }
        guard password.count >= 6 else {
            errorText = String(localized: "auth.password.invalid")
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await authService.register(phone: phone, nickname: nickname, password: password)
            guard response.success != false else {
                errorText = response.error ?? response.message ?? String(localized: "auth.register.failed")
                return
            }
            showRegister = false
            errorText = String(localized: "auth.register.success")
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func validPhone(_ value: String) -> Bool {
        let text = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return text.count == 11 && text.allSatisfy(\.isNumber)
    }

    private func beginCooldown() {
        cooldown = 60
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            if self.cooldown > 0 {
                self.cooldown -= 1
            } else {
                self.timer?.invalidate()
                self.timer = nil
            }
        }
    }
}

struct AuthGatewayView: View {
    @EnvironmentObject private var env: AppEnvironment
    @StateObject private var vm: AuthViewModel

    init(environment: AppEnvironment) {
        _vm = StateObject(wrappedValue: AuthViewModel(authService: environment.authService, session: environment.session))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        header
                        loginCard
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 36)
                    .padding(.bottom, 24)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $vm.showRegister) {
                registerSheet
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("auth.welcome")
                .font(.system(size: 34, weight: .bold, design: .rounded))
            Text("auth.subtitle")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var loginCard: some View {
        GlassCard {
            VStack(spacing: 14) {
                Picker("", selection: $vm.mode) {
                    Text("auth.mode.code").tag(AuthViewModel.Mode.code)
                    Text("auth.mode.password").tag(AuthViewModel.Mode.password)
                }
                .pickerStyle(.segmented)

                AppleTextField(title: "auth.phone.placeholder", text: $vm.phone, keyboardType: .numberPad)

                if vm.mode == .code {
                    HStack(spacing: 10) {
                        AppleTextField(title: "auth.code.placeholder", text: $vm.code, keyboardType: .numberPad)
                        Button(vm.cooldown > 0 ? "\(vm.cooldown)s" : String(localized: "auth.send.code")) {
                            tapFeedback()
                            Task { await vm.sendCode() }
                        }
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 11)
                        .background(Color.blue.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .disabled(vm.cooldown > 0 || vm.isLoading)
                    }
                } else {
                    AppleTextField(title: "auth.password.placeholder", text: $vm.password, isSecure: true)
                }

                if let errorText = vm.errorText {
                    Text(errorText)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    tapFeedback()
                    Task { await vm.login() }
                }
                label: {
                    HStack(spacing: 8) {
                        if vm.isLoading {
                            ProgressView()
                                .tint(.white)
                                .controlSize(.small)
                        }
                        Text(vm.isLoading ? String(localized: "common.loading") : String(localized: "auth.login"))
                    }
                }
                .buttonStyle(PrimaryActionButtonStyle())
                .disabled(vm.isLoading)

                Button("auth.register.entry") {
                    vm.showRegister = true
                }
                .font(.subheadline.weight(.medium))
            }
        }
    }

    private var registerSheet: some View {
        NavigationStack {
            ZStack {
                AppleBackground()
                VStack(spacing: 14) {
                    AppleTextField(title: "auth.nickname.placeholder", text: $vm.nickname)
                    AppleTextField(title: "auth.phone.placeholder", text: $vm.phone, keyboardType: .numberPad)
                    AppleTextField(title: "auth.password.placeholder", text: $vm.password, isSecure: true)

                    Button {
                        tapFeedback()
                        Task { await vm.register() }
                    }
                    label: {
                        HStack(spacing: 8) {
                            if vm.isLoading {
                                ProgressView()
                                    .tint(.white)
                                    .controlSize(.small)
                            }
                            Text(vm.isLoading ? String(localized: "common.loading") : String(localized: "auth.register"))
                        }
                    }
                    .buttonStyle(PrimaryActionButtonStyle())
                    .disabled(vm.isLoading)

                    if let errorText = vm.errorText {
                        Text(errorText)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(AppleTheme.pagePadding)
            }
            .navigationTitle("auth.register")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") {
                        vm.showRegister = false
                    }
                }
            }
        }
    }

    private func tapFeedback() {
        #if os(iOS)
        let feedback = UIImpactFeedbackGenerator(style: .light)
        feedback.prepare()
        feedback.impactOccurred()
        #endif
    }
}
