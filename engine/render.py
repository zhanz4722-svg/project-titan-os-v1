from __future__ import annotations
import argparse, json, sys
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import load_and_validate


def build_html(data: dict) -> str:
    html = (ROOT / "dashboard" / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "dashboard" / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "dashboard" / "dashboard.js").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="style.css" />', f'<style>{css}</style>')
    html = html.replace('<script src="dashboard.js"></script>', f'<script>window.__TITAN_DATA__={json.dumps(data, ensure_ascii=False)};</script><script>{js}</script>')
    return html


def render(data_path: Path) -> tuple[Path, Path]:
    data = load_and_validate(data_path)
    date = data["meta"]["date"]
    png = ROOT / "output" / "png" / f"PROJECT_TITAN_{date}.png"
    pdf = ROOT / "output" / "pdf" / f"PROJECT_TITAN_{date}.pdf"
    png.parent.mkdir(parents=True, exist_ok=True)
    pdf.parent.mkdir(parents=True, exist_ok=True)
    html = build_html(data)

    with sync_playwright() as p:
        launch_options = {
            "headless": True,
            "args": ["--no-sandbox", "--disable-web-security"],
        }
        chromium_executable = os.environ.get("CHROMIUM_EXECUTABLE_PATH")
        if chromium_executable:
            launch_options["executable_path"] = chromium_executable

        browser = p.chromium.launch(**launch_options)
        page = browser.new_page(viewport={"width": 1200, "height": 1200}, device_scale_factor=1)
        page.set_content(html, wait_until="load")
        page.wait_for_timeout(300)
        height = page.evaluate("document.documentElement.scrollHeight")
        page.set_viewport_size({"width": 1200, "height": height})
        page.screenshot(path=str(png), full_page=True)
        page.pdf(path=str(pdf), width="1200px", height=f"{height}px", print_background=True, margin={"top":"0","right":"0","bottom":"0","left":"0"})
        browser.close()
    return png, pdf


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Render PROJECT TITAN Daily Database to PNG and PDF")
    ap.add_argument("data", type=Path)
    args = ap.parse_args()
    png, pdf = render(args.data)
    print(png)
    print(pdf)
