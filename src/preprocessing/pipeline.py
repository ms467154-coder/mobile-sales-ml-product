"""Reusable, leakage-safe preprocessing for dispatch-duration regression.

The module deliberately uses an allowlist. Fields that are present in the CSV but
not proven to be available at inward receipt are excluded by default.
"""
from __future__ import annotations

from typing import Iterable
import re

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DEFAULT_NUMERICAL_FEATURES = ["Price"]
DEFAULT_CATEGORICAL_FEATURES = [
    "Product",
    "Brand",
    "Region",
    "Core Specification",
    "Processor Specification",
    "RAM",
    "ROM",
    "SSD",
]
DEFAULT_DATE_FEATURES = ["Inward Date"]

# These columns are never accepted by the default predictor contract.
EXCLUDED_FEATURES = {
    "Dispatch Date",
    "Dispatch Duration",
    "Product Code",
    "Product Specification",
    "Customer Name",
    "Customer Location",
    "Quantity Sold",  # availability at inward receipt is not established
}


def validate_raw_features(
    frame: pd.DataFrame,
    *,
    allow_optional: Iterable[str] = (),
) -> None:
    """Fail closed when excluded or missing columns are passed to preprocessing."""
    optional = set(allow_optional)
    forbidden = (set(frame.columns) & EXCLUDED_FEATURES) - optional
    if forbidden:
        raise ValueError(
            "Prediction-time contract violation; excluded columns supplied: "
            + ", ".join(sorted(forbidden))
        )
    required = set(DEFAULT_NUMERICAL_FEATURES + DEFAULT_CATEGORICAL_FEATURES + DEFAULT_DATE_FEATURES)
    missing = required - set(frame.columns)
    if missing:
        raise ValueError("Missing required raw feature columns: " + ", ".join(sorted(missing)))


class DateFeatureExtractor(BaseEstimator, TransformerMixin):
    """Convert inward dates into deterministic pre-event calendar features."""

    feature_names_out_ = np.array(
        [
            "inward_year",
            "inward_month",
            "inward_day",
            "inward_dayofweek",
            "inward_dayofyear",
            "inward_weekofyear",
            "inward_month_sin",
            "inward_month_cos",
            "inward_dow_sin",
            "inward_dow_cos",
        ],
        dtype=object,
    )

    def fit(self, X, y=None):
        X = self._to_series(X)
        parsed = pd.to_datetime(X, errors="coerce")
        if parsed.isna().any():
            raise ValueError("Inward Date contains missing or invalid dates")
        return self

    @staticmethod
    def _to_series(X) -> pd.Series:
        if isinstance(X, pd.DataFrame):
            if X.shape[1] != 1:
                raise ValueError("DateFeatureExtractor expects exactly one date column")
            return X.iloc[:, 0]
        if isinstance(X, pd.Series):
            return X
        arr = np.asarray(X)
        if arr.ndim == 2:
            if arr.shape[1] != 1:
                raise ValueError("DateFeatureExtractor expects exactly one date column")
            arr = arr[:, 0]
        return pd.Series(arr)

    def transform(self, X):
        s = pd.to_datetime(self._to_series(X), errors="coerce")
        if s.isna().any():
            raise ValueError("Inward Date contains missing or invalid dates")
        month = s.dt.month.astype(float)
        dow = s.dt.dayofweek.astype(float)
        out = np.column_stack(
            [
                s.dt.year.astype(float),
                month,
                s.dt.day.astype(float),
                dow,
                s.dt.dayofyear.astype(float),
                s.dt.isocalendar().week.astype(float),
                np.sin(2 * np.pi * month / 12.0),
                np.cos(2 * np.pi * month / 12.0),
                np.sin(2 * np.pi * dow / 7.0),
                np.cos(2 * np.pi * dow / 7.0),
            ]
        )
        return out

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_out_.copy()


class FrequencyEncoder(BaseEstimator, TransformerMixin):
    """Optional training-only frequency encoding for approved repeated entities.

    It is not used by the default pipeline because the current Product Code,
    Product Specification, Customer Name, and Customer Location fields are not
    approved for use and are too sparse or privacy-sensitive.
    """

    def __init__(self, columns=None, normalize=True):
        self.columns = columns
        self.normalize = normalize

    def fit(self, X, y=None):
        X = pd.DataFrame(X).copy()
        self.columns_ = list(self.columns) if self.columns is not None else list(X.columns)
        self.maps_ = {}
        n = len(X)
        for col in self.columns_:
            counts = X[col].astype("string").fillna("__MISSING__").value_counts(dropna=False)
            self.maps_[col] = (counts / n if self.normalize else counts).to_dict()
        return self

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        missing = set(self.columns_) - set(X.columns)
        if missing:
            raise ValueError("Missing columns for frequency encoding: " + ", ".join(sorted(missing)))
        out = {}
        for col in self.columns_:
            values = X[col].astype("string").fillna("__MISSING__")
            out[f"{col}__frequency"] = values.map(self.maps_[col]).fillna(0.0).astype(float)
        return pd.DataFrame(out, index=X.index)

    def get_feature_names_out(self, input_features=None):
        return np.array([f"{c}__frequency" for c in self.columns_], dtype=object)


def build_preprocessor(*, model_family: str = "tree") -> ColumnTransformer:
    """Build a single fitted-or-fittable transformation graph.

    ``tree`` leaves numeric scale unchanged after median imputation. ``linear``
    additionally standardizes numeric and date-derived features. Categorical
    fields use one-hot encoding with unknown-category handling and an explicit
    missing token, preserving structural not-applicable states.
    """
    if model_family not in {"tree", "linear"}:
        raise ValueError("model_family must be 'tree' or 'linear'")

    numeric_steps = [("imputer", SimpleImputer(strategy="median"))]
    if model_family == "linear":
        numeric_steps.append(("scaler", StandardScaler()))
    numeric = Pipeline(numeric_steps)

    categorical = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="constant", fill_value="__MISSING__")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    date_steps = [("date_features", DateFeatureExtractor())]
    if model_family == "linear":
        date_steps.append(("scaler", StandardScaler()))
    dates = Pipeline(date_steps)

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric, DEFAULT_NUMERICAL_FEATURES),
            ("categorical", categorical, DEFAULT_CATEGORICAL_FEATURES),
            ("date", dates, DEFAULT_DATE_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=True,
    )


def build_feature_frame(raw_frame: pd.DataFrame) -> pd.DataFrame:
    """Validate and return only the raw columns admitted by the default contract."""
    validate_raw_features(raw_frame)
    columns = DEFAULT_NUMERICAL_FEATURES + DEFAULT_CATEGORICAL_FEATURES + DEFAULT_DATE_FEATURES
    return raw_frame.loc[:, columns].copy()
