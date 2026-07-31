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
    stage_values = [sleep.get("deep_minutes"), sleep.get("light_minutes"), sleep.get("rem_minutes")]
    if all(v is not None for v in stage_values):
        stage_sum = sum(stage_values)
        if abs(stage_sum - sleep["sleep_minutes"]) > 5:
            raise ValueError(f"Sleep stages ({stage_sum} min) do not match total sleep ({sleep['sleep_minutes']} min).")

    training = data["training"]
    if training.get("performed") is not False:
        sh, sm = map(int, training["start_time"].split(":"))
        eh, em = map(int, training["end_time"].split(":"))
        if eh * 60 + em <= sh * 60 + sm:
            raise ValueError("Training end_time must be after start_time on the same day.")
        if not training.get("exercises"):
            raise ValueError("Training day must include at least one exercise.")

        for exercise in training["exercises"]:
            if not exercise.get("sets"):
                raise ValueError(f"Exercise '{exercise['name']}' has no sets.")
            for index, set_data in enumerate(exercise["sets"], start=1):
                has_reps = any(set_data.get(key) is not None for key in ("reps", "left_reps", "right_reps"))
                if not has_reps:
                    raise ValueError(f"Exercise '{exercise['name']}' set {index} has no reps recorded.")

    meal_notes = data.get("meal_notes", {})
    for meal_name, items in data["meals"].items():
        if not items and not meal_notes.get(meal_name):
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
