from core.timezone_utils import get_clinic_day_range, normalize_date_to_clinic_midnight


def test_day_range_order():
    start, end = get_clinic_day_range("2026-03-08")
    assert end > start


def test_normalize_midnight():
    dt = normalize_date_to_clinic_midnight("2026-03-08")
    assert dt is not None
