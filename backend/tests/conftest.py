import pytest
from shapely.geometry import Polygon


@pytest.fixture
def sample_polygon():
    # Roughly a 10-hectare parcel in Maharashtra
    return Polygon(
        [
            [75.7400, 18.9800],
            [75.7500, 18.9800],
            [75.7500, 18.9900],
            [75.7400, 18.9900],
            [75.7400, 18.9800],
        ]
    )


@pytest.fixture
def overlapping_polygon():
    # 50% overlap with sample_polygon
    return Polygon(
        [
            [75.7450, 18.9850],
            [75.7550, 18.9850],
            [75.7550, 18.9950],
            [75.7450, 18.9950],
            [75.7450, 18.9850],
        ]
    )


@pytest.fixture
def adjacent_border_sharing_polygon():
    # Shares the right boundary [75.7500, 18.9800] -> [75.7500, 18.9900]
    return Polygon(
        [
            [75.7500, 18.9800],
            [75.7600, 18.9800],
            [75.7600, 18.9900],
            [75.7500, 18.9900],
            [75.7500, 18.9800],
        ]
    )
