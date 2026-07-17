#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // saves window size/position on close, restores on launch
        .plugin(tauri_plugin_window_state::Builder::default().build())
        // charts.json in the app data dir — the saved-charts vault
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
