from enum import Enum

class VideoQuality(Enum):
    # Keep qualities in descending order!
    UHD = ("2160p", 3840, 2160, "10000k")  # 4K
    QHD = ("1440p", 2560, 1440, "8000k")  # 2K
    FULL_HD = ("1080p", 1920, 1080, "5000k")
    HD = ("720p", 1280, 720, "2500k")
    SD = ("480p", 854, 480, "1200k")
    LOW = ("360p", 640, 360, "800k")

    def __init__(self, label: str, width: int, height: int, bitrate: str):
        self.label = label
        self.width = width
        self.height = height
        self.bitrate = bitrate

    @classmethod
    def from_height(cls, height: int):
        """Determine the appropriate VideoQuality based on video height."""
        return next((size for size in cls if height >= size.height), None)

    @classmethod
    def qualities_below(cls, quality):
        """Return all qualities equal to or below the given quality."""
        qualities = list(cls)
        return qualities[qualities.index(quality):]
