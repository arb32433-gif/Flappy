fn main() {
    // Bake the project workspace root into the binary at compile time.
    // CARGO_MANIFEST_DIR is the src-tauri/ directory, so we go one level up to reach the project root.
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let project_root = std::path::Path::new(&manifest_dir)
        .parent()
        .expect("failed to get project root from CARGO_MANIFEST_DIR")
        .to_str()
        .expect("project root path is not valid UTF-8")
        .to_string();
    println!("cargo:rustc-env=FLAPPY_PROJECT_ROOT={}", project_root);

    tauri_build::build()
}
