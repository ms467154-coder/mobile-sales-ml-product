"""Frozen Phase 12 raw-input inference pipeline."""
from __future__ import annotations
from dataclasses import dataclass
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from src.preprocessing.pipeline import build_feature_frame, build_preprocessor

VALID_FEATURES = ["Product", "Brand", "Region", "Price", "Inward Date"]
OPTIONAL_STRUCTURAL_FIELDS = ["Core Specification", "Processor Specification", "RAM", "ROM", "SSD"]
FORBIDDEN_FEATURES = [
    "Dispatch Date", "Dispatch Duration", "Quantity Sold", "Product Code",
    "Product Specification", "Customer Name", "Customer Location",
]

class FrozenRawInputValidator(BaseEstimator, TransformerMixin):
    """Validate and canonicalize the frozen prediction-time input schema."""
    def fit(self, X, y=None):
        self.feature_names_in_ = list(VALID_FEATURES)
        return self

    def transform(self, X):
        frame = pd.DataFrame(X).copy()
        forbidden = sorted(set(frame.columns) & set(FORBIDDEN_FEATURES))
        if forbidden:
            raise ValueError("Prediction-time contract violation: " + ", ".join(forbidden))
        missing = sorted(set(VALID_FEATURES) - set(frame.columns))
        if missing:
            raise ValueError("Missing required prediction features: " + ", ".join(missing))
        frame = frame[VALID_FEATURES].copy()
        # The frozen candidate contract excludes hardware fields, but the shared
        # Phase 5 transformer expects their structural-missingness columns.
        for field in OPTIONAL_STRUCTURAL_FIELDS:
            frame[field] = None
        frame["Inward Date"] = pd.to_datetime(frame["Inward Date"], errors="raise")
        if frame["Inward Date"].isna().any():
            raise ValueError("Inward Date contains missing values")
        return frame

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_


def build_frozen_pipeline():
    """Return the frozen Phase 12 pipeline components.

    The final operational benchmark is the training-period median. The
    preprocessing stage remains in the artifact so the raw-input contract is
    explicit and can be replaced only through a new, separately approved phase.
    """
    from sklearn.dummy import DummyRegressor
    return FrozenRawInputValidator(), build_preprocessor(model_family="tree"), DummyRegressor(strategy="median")
