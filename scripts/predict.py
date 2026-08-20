#!/usr/bin/env python3
"""JSON-lines bridge for the frozen Phase 12 raw-input pipeline."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import joblib
import pandas as pd

ARTIFACT = ROOT / "ml_artifacts" / "inference_pipeline.joblib"


def main() -> int:
    payload = json.load(sys.stdin)
    if not isinstance(payload, dict):
        raise ValueError("Input must be a JSON object")
    frame = pd.DataFrame([payload])
    pipeline = joblib.load(ARTIFACT)
    prediction = float(pipeline.predict(frame)[0])
    return_payload = {
        "predictionDays": round(prediction, 4),
        "modelEstimate": True,
        "artifact": "inference_pipeline.joblib",
    }
    json.dump(return_payload, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # bridge errors are returned as a structured process failure
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        raise
