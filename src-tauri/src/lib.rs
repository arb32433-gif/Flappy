use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Resolve the single SQLite database path.
///
/// Priority:
///  1. `FLAPPY_DB_PATH` env var (runtime override).
///  2. Project workspace root baked in at compile time — lets the installed
///     desktop app share the exact database that the Python dev server uses.
///  3. The app's data directory (fallback when the project root doesn't exist).
fn resolve_db_path(app: &AppHandle) -> PathBuf {
    // 1. Runtime override
    if let Ok(p) = std::env::var("FLAPPY_DB_PATH") {
        if !p.trim().is_empty() {
            return PathBuf::from(p);
        }
    }
    // 2. Compile-time project root (set by build.rs via CARGO_MANIFEST_DIR)
    let project_root = PathBuf::from(env!("FLAPPY_PROJECT_ROOT"));
    let project_db = project_root.join("flappy_scores.db");
    if project_root.exists() {
        // The project root exists on this machine — use (or create) the shared DB.
        return project_db;
    }
    // 3. Portable AppData fallback for installed builds on machines without the project
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    fs::create_dir_all(&dir).expect("failed to create app data dir");
    dir.join("flappy_scores.db")
}

fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS scores (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             score INTEGER NOT NULL,
             difficulty TEXT NOT NULL DEFAULT 'medium',
             is_high INTEGER NOT NULL DEFAULT 0,
             created_at TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS archives (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             source_id INTEGER,
             score INTEGER NOT NULL,
             difficulty TEXT NOT NULL DEFAULT 'medium',
             is_high INTEGER NOT NULL DEFAULT 0,
             created_at TEXT NOT NULL,
             archived_at TEXT NOT NULL
         );",
    )
}

fn open_conn(app: &AppHandle) -> rusqlite::Result<Connection> {
    let conn = Connection::open(resolve_db_path(app))?;
    init_schema(&conn)?;
    Ok(conn)
}

fn now_iso() -> String {
    // Dates written by db.py use datetime.now().isoformat() with microseconds.
    // Rust's chrono-free approach: reuse std by fetching UTC time as RFC3339.
    // To stay compatible with SQLite TEXT ordering we produce ISO 8601 local-ish.
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    // Format as ISO-like with microseconds (UTC). Ordering stays consistent.
    let secs = now.as_secs();
    let micros = now.subsec_micros();
    // Convert unix time to a readable UTC datetime without external crates.
    format_utc(secs, micros)
}

// Minimal civil-from-days / time conversion (no chrono dependency).
fn format_utc(secs: u64, micros: u32) -> String {
    fn civil_from_days(z: i64) -> (i64, u32, u32) {
        let z = z + 719468;
        let era = if z >= 0 { z } else { z - 146096 } / 146097;
        let doe = (z - era * 146097) as u64;
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        let y = yoe as i64 + era * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
        let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
        (if m <= 2 { y + 1 } else { y }, m, d)
    }

    let days = (secs / 86400) as i64;
    let rem = secs % 86400;
    let (y, mo, d) = civil_from_days(days);
    let h = rem / 3600;
    let mi = (rem % 3600) / 60;
    let s = rem % 60;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:06}",
        y, mo, d, h, mi, s, micros
    )
}

#[derive(Serialize)]
struct ScoreRow {
    id: i64,
    score: i64,
    difficulty: String,
    is_high: i64,
    created_at: String,
    archived: i64,
}

#[derive(Serialize)]
struct ArchiveRow {
    id: i64,
    source_id: Option<i64>,
    score: i64,
    difficulty: String,
    is_high: i64,
    created_at: String,
    archived_at: String,
}

#[derive(Serialize)]
struct Stats {
    total_games: i64,
    high_score: i64,
    avg_score: i64,
}

const MEDIUM: &str = "medium";

// ===================== COMMANDS =====================

#[tauri::command]
fn db_init(app: AppHandle) -> Result<(), String> {
    open_conn(&app).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_add_score(app: AppHandle, score: i64, difficulty: Option<String>) -> Result<i64, String> {
    let diff = difficulty.unwrap_or_else(|| MEDIUM.to_string());
    let conn = open_conn(&app).map_err(|e| e.to_string())?;

    let high: i64 = conn
        .query_row(
            "SELECT MAX(score) FROM scores WHERE difficulty = ?1",
            params![diff],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let is_high = if score > high { 1 } else { 0 };
    if is_high == 1 {
        conn.execute(
            "UPDATE scores SET is_high = 0 WHERE difficulty = ?1 AND is_high = 1",
            params![diff],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "INSERT INTO scores (score, difficulty, is_high, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![score, diff, is_high, now_iso()],
    )
    .map_err(|e| e.to_string())?;

    Ok(is_high)
}

#[tauri::command]
fn db_get_scores(app: AppHandle, difficulty: Option<String>) -> Result<JsonList, String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    let diff_ref = difficulty.as_deref();
    let scores = match diff_ref {
        Some(diff) => {
            let mut stmt = conn
                .prepare(
                    "SELECT s.id, s.score, s.difficulty, s.is_high, s.created_at,
                            CASE WHEN a.id IS NULL THEN 0 ELSE 1 END AS archived
                     FROM scores s LEFT JOIN archives a ON a.source_id = s.id
                     WHERE s.difficulty = ?1
                     ORDER BY s.created_at DESC",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![diff], |r| {
                    Ok(ScoreRow {
                        id: r.get(0)?,
                        score: r.get(1)?,
                        difficulty: r.get(2)?,
                        is_high: r.get(3)?,
                        created_at: r.get(4)?,
                        archived: r.get(5)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            let collected = rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
            collected
        }
        None => {
            let mut stmt = conn
                .prepare(
                    "SELECT s.id, s.score, s.difficulty, s.is_high, s.created_at,
                            CASE WHEN a.id IS NULL THEN 0 ELSE 1 END AS archived
                     FROM scores s LEFT JOIN archives a ON a.source_id = s.id
                     ORDER BY s.created_at DESC",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |r| {
                    Ok(ScoreRow {
                        id: r.get(0)?,
                        score: r.get(1)?,
                        difficulty: r.get(2)?,
                        is_high: r.get(3)?,
                        created_at: r.get(4)?,
                        archived: r.get(5)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            let collected = rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
            collected
        }
    };
    let total = scores.len() as i64;
    let high_score = high_score_for(&conn, diff_ref.unwrap_or(MEDIUM));
    Ok(JsonList {
        scores,
        total,
        high_score,
    })
}

fn high_score_for(conn: &Connection, difficulty: &str) -> i64 {
    conn.query_row(
        "SELECT MAX(score) FROM scores WHERE difficulty = ?1",
        params![difficulty],
        |r| r.get(0),
    )
    .optional()
    .ok()
    .flatten()
    .unwrap_or(0)
}

#[tauri::command]
fn db_get_high_score(app: AppHandle, difficulty: Option<String>) -> Result<i64, String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    Ok(high_score_for(&conn, difficulty.as_deref().unwrap_or(MEDIUM)))
}

#[tauri::command]
fn db_get_stats(app: AppHandle, difficulty: Option<String>) -> Result<Stats, String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    let (total, high, avg): (i64, i64, i64) = match difficulty {
        Some(diff) => conn
            .query_row(
                "SELECT COUNT(*), COALESCE(MAX(score),0), COALESCE(ROUND(AVG(score)),0)
                 FROM scores WHERE difficulty = ?1",
                params![diff],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|e| e.to_string())?,
        None => conn
            .query_row(
                "SELECT COUNT(*), COALESCE(MAX(score),0), COALESCE(ROUND(AVG(score)),0) FROM scores",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|e| e.to_string())?,
    };
    Ok(Stats {
        total_games: total,
        high_score: high,
        avg_score: avg,
    })
}

#[tauri::command]
fn db_delete_score(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM scores WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn db_archive_score(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM archives WHERE source_id = ?1",
            params![id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if existing.is_some() {
        return Ok(());
    }
    let row: Option<(i64, i64, String, i64, String)> = conn
        .query_row(
            "SELECT score, difficulty, is_high, created_at, id FROM scores WHERE id = ?1",
            params![id],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                ))
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if let Some((score, diff, is_high, created_at, _source)) = row {
        conn.execute(
            "INSERT INTO archives (source_id, score, difficulty, is_high, created_at, archived_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, score, diff, is_high, created_at, now_iso()],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn db_get_archives(app: AppHandle, difficulty: Option<String>) -> Result<ArchiveList, String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    let archives = match difficulty {
        Some(diff) => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, source_id, score, difficulty, is_high, created_at, archived_at
                     FROM archives WHERE difficulty = ?1 ORDER BY archived_at DESC",
                )
                .map_err(|e| e.to_string())?;
            let x = stmt
                .query_map(params![diff], row_to_archive)
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            x
        }
        None => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, source_id, score, difficulty, is_high, created_at, archived_at
                     FROM archives ORDER BY archived_at DESC",
                )
                .map_err(|e| e.to_string())?;
            let x = stmt
                .query_map([], row_to_archive)
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
            x
        }
    };
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM archives", [], |r| r.get(0))
        .unwrap_or(0);
    Ok(ArchiveList { archives, count })
}

fn row_to_archive(r: &rusqlite::Row) -> rusqlite::Result<ArchiveRow> {
    Ok(ArchiveRow {
        id: r.get(0)?,
        source_id: r.get(1)?,
        score: r.get(2)?,
        difficulty: r.get(3)?,
        is_high: r.get(4)?,
        created_at: r.get(5)?,
        archived_at: r.get(6)?,
    })
}

#[tauri::command]
fn db_get_archive_count(app: AppHandle) -> Result<i64, String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    Ok(conn
        .query_row("SELECT COUNT(*) FROM archives", [], |r| r.get(0))
        .unwrap_or(0))
}

#[tauri::command]
fn db_delete_archive(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&app).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM archives WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
struct JsonList {
    scores: Vec<ScoreRow>,
    total: i64,
    high_score: i64,
}

#[derive(Serialize)]
struct ArchiveList {
    archives: Vec<ArchiveRow>,
    count: i64,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            db_init,
            db_add_score,
            db_get_scores,
            db_get_high_score,
            db_get_stats,
            db_delete_score,
            db_archive_score,
            db_get_archives,
            db_get_archive_count,
            db_delete_archive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running flappyflight");
}
