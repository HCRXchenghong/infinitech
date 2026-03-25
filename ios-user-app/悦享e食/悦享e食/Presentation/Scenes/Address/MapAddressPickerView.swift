import SwiftUI
import CoreLocation

struct MapAddressPickerView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    @State private var keyword = ""
    @State private var results: [MapSearchResult] = []
    @State private var manualAddress = ""
    @State private var savedAddresses: [String] = []
    @State private var selectedAddress: String?
    @State private var errorText: String?
    @State private var isSearching = false

    private let defaultCenter = CLLocationCoordinate2D(latitude: 31.2304, longitude: 121.4737)
    private var canUseAddress: Bool {
        !effectiveAddress.isEmpty
    }
    private var effectiveAddress: String {
        let typed = manualAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        if !typed.isEmpty {
            return typed
        }
        return selectedAddress ?? ""
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppleBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 14) {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                OSMMapView(center: defaultCenter)
                                    .frame(height: 210)
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                Text("address.map.hint")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        GlassCard {
                            VStack(spacing: 10) {
                                HStack(spacing: 10) {
                                    AppleTextField(
                                        title: "address.search.placeholder",
                                        text: $keyword
                                    )
                                    Button("common.search") {
                                        Task { await runSearch() }
                                    }
                                    .font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 11)
                                    .background(Color.blue.opacity(0.15))
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }

                                if isSearching {
                                    HStack(spacing: 8) {
                                        ProgressView()
                                        Text("address.searching")
                                            .font(.footnote)
                                            .foregroundStyle(.secondary)
                                        Spacer()
                                    }
                                } else if let errorText {
                                    Text(errorText)
                                        .font(.footnote)
                                        .foregroundStyle(.red)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }

                        if !results.isEmpty {
                            GlassCard {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("address.search.results")
                                        .font(.headline)

                                    ForEach(results) { item in
                                        Button {
                                            selectedAddress = item.displayName
                                            manualAddress = item.displayName
                                        } label: {
                                            VStack(alignment: .leading, spacing: 3) {
                                                Text(item.name)
                                                    .font(.subheadline.weight(.semibold))
                                                    .foregroundStyle(.primary)
                                                Text(item.displayName)
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                                    .multilineTextAlignment(.leading)
                                            }
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                        .buttonStyle(.plain)
                                        Divider()
                                    }
                                }
                            }
                        }

                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("address.manual.input")
                                    .font(.headline)

                                AppleTextField(title: "address.manual.placeholder", text: $manualAddress)

                                if !savedAddresses.isEmpty {
                                    Text("address.saved.list")
                                        .font(.subheadline.weight(.semibold))

                                    ForEach(savedAddresses, id: \.self) { value in
                                        Button(value) {
                                            selectedAddress = value
                                            manualAddress = value
                                        }
                                        .buttonStyle(.plain)
                                        .padding(.vertical, 4)
                                    }
                                } else {
                                    Text("address.saved.empty")
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        if canUseAddress {
                            GlassCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("address.selected.preview")
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                    Text(effectiveAddress)
                                        .font(.subheadline.weight(.semibold))
                                }
                            }
                        }

                        Button("address.use") {
                            let value = effectiveAddress
                            if !value.isEmpty && !savedAddresses.contains(value) {
                                savedAddresses.insert(value, at: 0)
                            }
                            dismiss()
                        }
                        .buttonStyle(PrimaryActionButtonStyle())
                        .disabled(!canUseAddress)
                    }
                    .padding(.horizontal, AppleTheme.pagePadding)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("address.picker.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.done") { dismiss() }
                }
            }
        }
        .task {
            savedAddresses = [
                String(localized: "address.saved.sample.1"),
                String(localized: "address.saved.sample.2")
            ]
        }
    }

    @MainActor
    private func runSearch() async {
        errorText = nil
        let value = keyword.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else {
            return
        }
        isSearching = true
        defer { isSearching = false }

        do {
            let response = try await env.mapService.search(keyword: value, city: nil, page: 1, pageSize: 20)
            results = response.list
        } catch {
            // Fallback mode: user can still type manually or pick saved addresses.
            errorText = String(localized: "address.search.failed.fallback")
            results = []
        }
    }
}
