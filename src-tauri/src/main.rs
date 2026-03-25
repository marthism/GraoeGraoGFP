// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_autostart::MacosLauncher;
use log::{info, error, LevelFilter};
use simplelog::{CombinedLogger, WriteLogger, Config};
use std::fs;
use std::path::PathBuf;

/// Returns the log directory path: Documents/Grao e Grao GFP/logs
fn get_log_dir() -> Option<PathBuf> {
    dirs::document_dir().map(|docs| docs.join("Grao e Grao GFP").join("logs"))
}

/// Cleans up log files older than 7 days
fn cleanup_old_logs(log_dir: &PathBuf) {
    if let Ok(entries) = fs::read_dir(log_dir) {
        let now = std::time::SystemTime::now();
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(age) = now.duration_since(modified) {
                        // Remove logs older than 7 days
                        if age.as_secs() > 7 * 24 * 60 * 60 {
                            let _ = fs::remove_file(entry.path());
                        }
                    }
                }
            }
        }
    }
}

/// Initialize the logging system
fn init_logging() {
    if let Some(log_dir) = get_log_dir() {
        // Create the directory structure if it doesn't exist
        if let Err(e) = fs::create_dir_all(&log_dir) {
            eprintln!("Failed to create log directory: {}", e);
            return;
        }

        // Clean up old logs
        cleanup_old_logs(&log_dir);

        // Create log file with date in the name
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let log_file_path = log_dir.join(format!("grao-grao-{}.log", today));

        match fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_path)
        {
            Ok(log_file) => {
                let _ = CombinedLogger::init(vec![
                    WriteLogger::new(LevelFilter::Info, Config::default(), log_file),
                ]);
                info!("=== Grão&Grão iniciado ===");
                info!("Versão: {}", env!("CARGO_PKG_VERSION"));
                info!("Diretório de logs: {}", log_dir.display());
            }
            Err(e) => {
                eprintln!("Failed to open log file: {}", e);
            }
        }
    }
}

fn main() {
    init_logging();
    info!("Inicializando aplicação Tauri...");

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|_app| {
            info!("Aplicação configurada com sucesso");
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            error!("Erro ao executar aplicação Tauri: {}", e);
            panic!("error while running tauri application: {}", e);
        });
}
