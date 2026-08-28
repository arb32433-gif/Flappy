"""
Faby's Flight - SQLite Database Module
Stores gameplay records for persistence across sessions.
"""

import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "flappy_scores.db")


@contextmanager
def db_session():
    """
    Context manager for database sessions.
    Handles connection setup, transaction lifecycle, error rollback,
    and guarantees connection closure.
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        yield conn
        conn.commit()
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        print(f"[Database Error] {e}")
        raise e
    finally:
        if conn:
            conn.close()


def init_db():
    with db_session() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                score INTEGER NOT NULL,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                is_high INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER,
                score INTEGER NOT NULL,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                is_high INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                archived_at TEXT NOT NULL
            )
        """)


def add_score(score, difficulty="medium"):
    with db_session() as conn:
        high = get_high_score_internal(conn, difficulty)
        is_high = 1 if score > high else 0
        if is_high:
            conn.execute("UPDATE scores SET is_high = 0 WHERE difficulty = ? AND is_high = 1", (difficulty,))
        conn.execute(
            "INSERT INTO scores (score, difficulty, is_high, created_at) VALUES (?, ?, ?, ?)",
            (score, difficulty, is_high, datetime.now().isoformat())
        )
        return is_high


def get_high_score_internal(conn, difficulty="medium"):
    """Internal helper to retrieve high score within an active connection."""
    row = conn.execute(
        "SELECT MAX(score) as high FROM scores WHERE difficulty = ?", (difficulty,)
    ).fetchone()
    return row["high"] if row and row["high"] else 0


def get_high_score(difficulty="medium"):
    with db_session() as conn:
        return get_high_score_internal(conn, difficulty)


def get_recent_scores(limit=20, difficulty=None):
    with db_session() as conn:
        if difficulty:
            rows = conn.execute(
                "SELECT * FROM scores WHERE difficulty = ? ORDER BY created_at DESC LIMIT ?",
                (difficulty, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM scores ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return _with_archive_flag(conn, rows)


def get_all_scores(difficulty=None):
    with db_session() as conn:
        if difficulty:
            rows = conn.execute(
                "SELECT * FROM scores WHERE difficulty = ? ORDER BY created_at DESC",
                (difficulty,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM scores ORDER BY created_at DESC"
            ).fetchall()
        return _with_archive_flag(conn, rows)


def _with_archive_flag(conn, rows):
    """Attach an 'archived' flag to each score row from the archives table."""
    result = []
    for r in rows:
        item = dict(r)
        archived = conn.execute(
            "SELECT id FROM archives WHERE source_id = ?", (item["id"],)
        ).fetchone()
        item["archived"] = 1 if archived else 0
        result.append(item)
    return result


def delete_score(score_id):
    with db_session() as conn:
        conn.execute("DELETE FROM scores WHERE id = ?", (score_id,))


def add_archive(score_id):
    """Copy a score record into the archives table (keeps original in scores)."""
    with db_session() as conn:
        row = conn.execute("SELECT * FROM scores WHERE id = ?", (score_id,)).fetchone()
        if not row:
            return {'ok': False, 'reason': 'not found'}

        existing = conn.execute(
            "SELECT id FROM archives WHERE source_id = ?", (score_id,)
        ).fetchone()
        if existing:
            return {'ok': False, 'reason': 'exists'}

        conn.execute(
            """INSERT INTO archives (source_id, score, difficulty, is_high, created_at, archived_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (row["id"], row["score"], row["difficulty"], row["is_high"],
             row["created_at"], datetime.now().isoformat())
        )
        return {'ok': True, 'archived_at': datetime.now().isoformat()}


def get_archives(limit=50, difficulty=None):
    with db_session() as conn:
        if difficulty:
            rows = conn.execute(
                "SELECT * FROM archives WHERE difficulty = ? ORDER BY archived_at DESC LIMIT ?",
                (difficulty, limit)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM archives ORDER BY archived_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]


def get_archive_count():
    with db_session() as conn:
        row = conn.execute("SELECT COUNT(*) as count FROM archives").fetchone()
        return row["count"] if row else 0


def delete_archive(archive_id):
    with db_session() as conn:
        conn.execute("DELETE FROM archives WHERE id = ?", (archive_id,))


def get_stats(difficulty=None):
    with db_session() as conn:
        if difficulty:
            row = conn.execute(
                """SELECT COUNT(*) as total_games,
                          COALESCE(MAX(score), 0) as high_score,
                          COALESCE(AVG(score), 0) as avg_score
                   FROM scores WHERE difficulty = ?""",
                (difficulty,)
            ).fetchone()
        else:
            row = conn.execute(
                """SELECT COUNT(*) as total_games,
                          COALESCE(MAX(score), 0) as high_score,
                          COALESCE(AVG(score), 0) as avg_score
                   FROM scores"""
            ).fetchone()
        return dict(row) if row else {"total_games": 0, "high_score": 0, "avg_score": 0}


init_db()

