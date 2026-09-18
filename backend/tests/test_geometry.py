import pytest
from shapely.geometry import Polygon

from app.services.geometry import GeometryService


def test_polygon_validation_valid():
    valid_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.74, 18.98],
                [75.75, 18.98],
                [75.75, 18.99],
                [75.74, 18.99],
                [75.74, 18.98],
            ]
        ],
    }
    polygon = GeometryService.validate_and_parse_polygon(valid_geojson)
    assert isinstance(polygon, Polygon)
    assert polygon.is_valid


def test_polygon_validation_self_intersecting_rejected():
    # Bow-tie self intersecting polygon
    invalid_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [0, 0],
                [2, 2],
                [2, 0],
                [0, 2],
                [0, 0],
            ]
        ],
    }
    with pytest.raises(ValueError, match="invalid or self-intersecting"):
        GeometryService.validate_and_parse_polygon(invalid_geojson)


def test_area_hectares_calculation(sample_polygon):
    area_ha = GeometryService.calculate_area_hectares(sample_polygon)
    # A ~0.01 deg x 0.01 deg square near 19°N is ~1.1 km x 1.05 km ≈ 115–125 hectares
    assert 110.0 < area_ha < 130.0


def test_adjacent_border_sharing_no_overlap(sample_polygon, adjacent_border_sharing_polygon):
    """
    Parcels sharing a boundary edge must NOT be flagged as overlapping.
    Their intersection is a LineString or empty, resulting in 0 hectare overlap area.
    """
    intersection = sample_polygon.intersection(adjacent_border_sharing_polygon)
    # The intersection is a 1-dimensional boundary LineString, not an area
    assert intersection.geom_type in ("LineString", "MultiLineString", "GeometryCollection")
    if isinstance(intersection, Polygon):
        overlap_ha = GeometryService.calculate_area_hectares(intersection)
        assert overlap_ha < 0.01
