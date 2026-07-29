from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "schema" / "titan.schema.json").read_text(encoding="utf-8"))


def validate_data(data: dict) -> None:
    validator = Draft202012Validator(SCHEMA, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errors:
        details = "\n".join(f"- {'/'.join(map(str,e.path)) or '<root>'}: {e.message}" for e in errors)
        raise ValueError("Titan Schema validation failed:\n" + details)

    sleep = data["sleep"]
    stage_sum = sleep["deep_minutes"] + sleep["light_minutes"] + sleep["rem_minutes"]
    if abs(stage_sum - sleep["sleep_minutes"]) > 5:
        raise ValueError(f"Sleep stages ({stage_sum} min) do not match total sleep ({sleep['sleep_minutes']} min).")

    sh, sm = map(int, data["training"]["start_time"].split(":"))
    eh, em = map(int, data["training"]["end_time"].split(":"))
    if eh * 60 + em <= sh * 60 + sm:
        raise ValueError("Training end_time must be after start_time on the same day.")

    for meal_name, items in data["meals"].items():
        if not items:
            raise ValueError(f"Meal '{meal_name}' is empty.")


def load_and_validate(path: str | Path) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    validate_data(data)
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate PROJECT TITAN daily JSON data")
    parser.add_argument("data", type=Path)
    args = parser.parse_args()

    try:
        load_and_validate(args.data)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc

    print(f"OK: {args.data}")
