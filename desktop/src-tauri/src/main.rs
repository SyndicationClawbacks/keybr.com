#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::File, io::{Read, Write}};
use tauri::{Manager, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;

const MAX_BACKUP_BYTES: u64 = 64 * 1024 * 1024;

fn validate_backup(data: &str) -> Result<(), String> {
    if data.len() as u64 > MAX_BACKUP_BYTES {
        return Err("Backup exceeds the 64 MiB limit".into());
    }
    let value: serde_json::Value = serde_json::from_str(data).map_err(|e| e.to_string())?;
    if value["format"] != "keybr-desktop-backup" || value["version"] != 1 {
        return Err("Not a supported Keybr Desktop backup".into());
    }
    if !value["results"].is_array() || !value["settings"].is_object() {
        return Err("Invalid backup structure".into());
    }
    Ok(())
}

// Paths are chosen in native dialogs. The webview cannot supply an arbitrary file path.
#[tauri::command]
async fn save_backup(app: tauri::AppHandle, data: String) -> Result<bool, String> {
    validate_backup(&data)?;
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file()
            .add_filter("Keybr backup", &["json"])
            .set_file_name("keybr-desktop-backup.json")
            .blocking_save_file();
        let Some(selected) = selected else { return Ok(false); };
        let path = selected.into_path().map_err(|e| e.to_string())?;
        let parent = path.parent().ok_or("Invalid destination")?;
        let mut temporary = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
        temporary.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        temporary.as_file().sync_all().map_err(|e| e.to_string())?;
        temporary.persist(&path).map_err(|e| e.to_string())?;
        Ok(true)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file().add_filter("Keybr backup", &["json"]).blocking_pick_file();
        let Some(selected) = selected else { return Ok(None); };
        let path = selected.into_path().map_err(|e| e.to_string())?;
        let file = File::open(path).map_err(|e| e.to_string())?;
        let mut data = String::new();
        file.take(MAX_BACKUP_BYTES + 1).read_to_string(&mut data).map_err(|e| e.to_string())?;
        validate_backup(&data)?;
        Ok(Some(data))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    let next = !window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(next).map_err(|e| e.to_string())?;
    Ok(next)
}

fn allowed_navigation(url: &tauri::Url) -> bool {
    if !url.username().is_empty() || url.password().is_some() || url.port().is_some() {
        return false;
    }
    matches!((url.scheme(), url.host_str()),
        ("tauri", Some("localhost")) | ("http" | "https", Some("tauri.localhost")))
}

fn binary_asset(path: &str) -> bool {
    path.ends_with(".data") || path.ends_with(".stats")
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_backup, load_backup, toggle_fullscreen])
        .setup(|app| {
            let config = app.config().app.windows.first().ok_or("Missing main window configuration")?;
            WebviewWindowBuilder::from_config(app, config)?
                .on_navigation(allowed_navigation)
                .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                .on_web_resource_request(|request, response| {
                    // Keybr validates the MIME type of models and example histories.
                    // Do not rely on extension guessing for its custom binary formats.
                    if binary_asset(request.uri().path()) {
                        response.headers_mut().insert(
                            tauri::http::header::CONTENT_TYPE,
                            tauri::http::HeaderValue::from_static("application/octet-stream"),
                        );
                    }
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Could not start Keybr Desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn navigation_is_local_only() {
        for value in ["tauri://localhost/index.html", "http://tauri.localhost/", "https://tauri.localhost/#/profile"] {
            assert!(allowed_navigation(&value.parse().unwrap()));
        }
        for value in ["https://keybr.com", "tauri://evil/index.html", "http://tauri.localhost.evil/", "file:///tmp/x", "http://tauri.localhost:8080/"] {
            assert!(!allowed_navigation(&value.parse().unwrap()));
        }
    }

    #[test]
    fn only_our_backup_format_is_accepted() {
        assert!(validate_backup(r#"{"format":"keybr-desktop-backup","version":1,"results":[],"settings":{}}"#).is_ok());
        assert!(validate_backup("{}").is_err());
        assert!(validate_backup("not json").is_err());
    }

    #[test]
    fn binary_mime_override_is_scoped() {
        assert!(binary_asset("/assets/en.abc.data"));
        assert!(binary_asset("/assets/example1.abc.stats"));
        assert!(!binary_asset("/assets/desktop.js"));
        assert!(!binary_asset("/index.html"));
    }
}
