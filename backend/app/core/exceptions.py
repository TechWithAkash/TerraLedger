from fastapi import HTTPException, status


class GeometryOverlapException(HTTPException):
    def __init__(self, conflicts: list, detail: str = "Site boundary overlaps an existing site"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": detail,
                "conflicts": conflicts,
                "why_this_matters": "Overlapping boundaries can cause double counting of carbon and biodiversity claims across projects.",
            },
        )
