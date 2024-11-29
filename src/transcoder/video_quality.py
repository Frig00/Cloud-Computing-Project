from enum import Enum

class VideoQuality(Enum):
    LOW = ("360p", "640:360", "800k")
    SD = ("480p", "854:480", "1200k")
    HD = ("720p", "1280:720", "2500k")
    FULL_HD = ("1080p", "1920:1080", "5000k")
    QHD = ("1440p", "2560:1440", "8000k")  # 2K
    UHD = ("2160p", "3840:2160", "10000k")  # 4K

    def __init__(self, label: str, resolution: str, bitrate: str):
        self.label = label
        self.resolution = resolution
        self.bitrate = bitrate

    @classmethod
    def from_height(cls, height: int):
        """Determine the appropriate VideoQuality based on video height."""
        if height >= 2160:
            return cls.UHD
        elif height >= 1440:
            return cls.QHD
        elif height >= 1080:
            return cls.FULL_HD
        elif height >= 720:
            return cls.HD
        elif height >= 480:
            return cls.SD
        elif height >= 360:
            return cls.LOW
        else:
            return None

    @classmethod
    def qualities_below(cls, quality):
        """Return all qualities equal to or below the given quality."""
        qualities = list(cls)
        return qualities[:qualities.index(quality) + 1]
