"""Leakage-safe feature engineering for dispatch-duration prediction."""
from __future__ import annotations

from typing import Iterable, Optional
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class FeatureEngineer(BaseEstimator, TransformerMixin):
    """Create only target-independent features available at inward time.

    Fit-time learned quantities (price bands, product/brand price medians and
    frequencies) are learned from the training frame and reused unchanged.
    Dispatch fields and target columns are never read.
    """

    def __init__(self, include_price_features=True, include_interactions=True):
        self.include_price_features = include_price_features
        self.include_interactions = include_interactions

    def fit(self, X, y=None):
        X = pd.DataFrame(X).copy()
        self._validate_input(X)
        price = pd.to_numeric(X["Price"], errors="coerce")
        self.price_median_ = float(price.median())
        self.price_quantiles_ = np.unique(price.dropna().quantile([0.2, 0.4, 0.6, 0.8]).to_numpy())
        self.product_price_medians_ = X.assign(_price=price).groupby("Product")['_price'].median().to_dict()
        self.brand_price_medians_ = X.assign(_price=price).groupby("Brand")['_price'].median().to_dict()
        self.product_counts_ = X["Product"].value_counts(dropna=False).to_dict()
        self.brand_counts_ = X["Brand"].value_counts(dropna=False).to_dict()
        return self

    @staticmethod
    def _validate_input(X):
        required = {"Product", "Brand", "Price", "Inward Date"}
        missing = required - set(X.columns)
        if missing:
            raise ValueError("Missing feature-engineering columns: " + ", ".join(sorted(missing)))
        forbidden = {"Dispatch Date", "Dispatch Duration"} & set(X.columns)
        if forbidden:
            raise ValueError("Leakage-prone columns supplied to feature engineering: " + ", ".join(sorted(forbidden)))

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        self._validate_input(X)
        inward = pd.to_datetime(X["Inward Date"], errors="coerce")
        if inward.isna().any():
            raise ValueError("Inward Date contains invalid or missing values")
        price = pd.to_numeric(X["Price"], errors="coerce")
        out = X.copy()
        out["inward_year"] = inward.dt.year.astype(int)
        out["inward_month"] = inward.dt.month.astype(int)
        out["inward_quarter"] = inward.dt.quarter.astype(int)
        out["inward_day"] = inward.dt.day.astype(int)
        out["inward_dayofweek"] = inward.dt.dayofweek.astype(int)
        out["inward_weekofyear"] = inward.dt.isocalendar().week.astype(int)
        out["inward_month_sin"] = np.sin(2 * np.pi * inward.dt.month / 12.0)
        out["inward_month_cos"] = np.cos(2 * np.pi * inward.dt.month / 12.0)
        out["inward_dow_sin"] = np.sin(2 * np.pi * inward.dt.dayofweek / 7.0)
        out["inward_dow_cos"] = np.cos(2 * np.pi * inward.dt.dayofweek / 7.0)
        if self.include_price_features:
            out["log_price"] = np.log1p(price)
            out["price_band"] = np.searchsorted(self.price_quantiles_, price.fillna(self.price_median_), side="right").astype(str)
            out["price_vs_product_median"] = price / out["Product"].map(self.product_price_medians_).fillna(self.price_median_)
            out["price_vs_brand_median"] = price / out["Brand"].map(self.brand_price_medians_).fillna(self.price_median_)
            out["product_frequency_train"] = out["Product"].map(self.product_counts_).fillna(0).astype(float)
            out["brand_frequency_train"] = out["Brand"].map(self.brand_counts_).fillna(0).astype(float)
        if self.include_interactions:
            out["product_brand"] = out["Product"].astype("string").fillna("__MISSING__") + "__" + out["Brand"].astype("string").fillna("__MISSING__")
            out["product_region"] = out["Product"].astype("string").fillna("__MISSING__") + "__" + out["Region"].astype("string").fillna("__MISSING__") if "Region" in out else "__MISSING__"
            out["processor_ram"] = out["Processor Specification"].astype("string").fillna("__MISSING__") + "__" + out["RAM"].astype("string").fillna("__MISSING__") if {"Processor Specification", "RAM"}.issubset(out.columns) else "__MISSING__"
        # Raw date is no longer needed after deterministic extraction.
        out = out.drop(columns=["Inward Date"], errors="ignore")
        return out

    def get_feature_names_out(self, input_features=None):
        return np.array([], dtype=object)


class AsOfEntityCounter(BaseEstimator, TransformerMixin):
    """Compute prior-event counts using strict timestamp ordering.

    This optional transformer uses only entity identity and event timestamp. It
    never reads the current or future target. It is not enabled by default for
    customer fields because governance and event availability remain unresolved.
    """

    def __init__(self, entity_column: str, time_column: str = "Inward Date"):
        self.entity_column = entity_column
        self.time_column = time_column

    def fit(self, X, y=None):
        X = pd.DataFrame(X).copy()
        self._validate(X)
        self.history_ = {}
        ordered = X.sort_values(self.time_column, kind="mergesort")
        running = {}
        for entity, ts in zip(ordered[self.entity_column].astype("string"), ordered[self.time_column]):
            key = str(entity)
            self.history_.setdefault(key, []).append(pd.Timestamp(ts))
            running[key] = running.get(key, 0) + 1
        self.max_time_ = pd.Timestamp(ordered[self.time_column].max())
        return self

    def _validate(self, X):
        required = {self.entity_column, self.time_column}
        missing = required - set(X.columns)
        if missing:
            raise ValueError("Missing as-of counter columns: " + ", ".join(sorted(missing)))

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        self._validate(X)
        out = []
        for entity, ts in zip(X[self.entity_column].astype("string"), pd.to_datetime(X[self.time_column])):
            dates = self.history_.get(str(entity), [])
            # Strictly earlier events only; same-timestamp events are excluded.
            out.append(int(np.searchsorted(np.array(dates, dtype="datetime64[ns]"), np.datetime64(ts), side="left")))
        return pd.DataFrame({f"{self.entity_column}__prior_count": out}, index=X.index)
