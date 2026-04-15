fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run admin-mac tauri app");
}
