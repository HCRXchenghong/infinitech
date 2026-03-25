import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var env: AppEnvironment
    @EnvironmentObject private var bootstrapper: AppBootstrapper
    @State private var pushEnabled = true
    @State private var biometricEnabled = false
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 14) {
                        accountCard
                        preferencesCard
                        securityCard
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("profile.title")
            .navigationBarTitleDisplayMode(.inline)
            .alert("profile.logout.confirm.title", isPresented: $showLogoutConfirm) {
                Button("common.cancel", role: .cancel) {}
                Button("profile.logout.confirm.action", role: .destructive) {
                    Task { @MainActor in
                        await bootstrapper.pushManager.unregisterCurrentDevice()
                        env.session.logout()
                    }
                }
            } message: {
                Text("profile.logout.confirm.message")
            }
        }
    }

    private var accountCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.blue.opacity(0.9))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(env.session.userName ?? String(localized: "profile.account.guest"))
                            .font(.title3.weight(.semibold))
                        Text("profile.membership.personal")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }

                Divider()

                profileRow(titleKey: "profile.account.id", value: env.session.userId ?? "-")
                profileRow(titleKey: "profile.account.type", value: env.session.userType)
                profileRow(titleKey: "profile.account.locale", value: Locale.current.identifier)
            }
        }
    }

    private var preferencesCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("profile.section.preferences")
                    .font(.headline)

                Toggle(isOn: $pushEnabled) {
                    Label("profile.pref.push", systemImage: "bell.badge.fill")
                }

                Toggle(isOn: $biometricEnabled) {
                    Label("profile.pref.biometric", systemImage: "faceid")
                }

                HStack {
                    Label("profile.pref.language", systemImage: "globe")
                    Spacer()
                    Text(Locale.current.languageCode?.uppercased() ?? "EN")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var securityCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("profile.section.security")
                    .font(.headline)

                Button {
                    showLogoutConfirm = true
                } label: {
                    HStack {
                        Label("profile.security.logout", systemImage: "rectangle.portrait.and.arrow.right")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func profileRow(titleKey: LocalizedStringKey, value: String) -> some View {
        HStack {
            Text(titleKey)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
        }
    }
}
