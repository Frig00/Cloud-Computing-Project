import { Link } from "@mui/material";

interface Quality {
  height: number;
  width: number;
  bitrate: number;
  name: string;
  index: number;
}

interface QualitySelectorProps {
  qualities: Quality[];
  currentQuality: Quality | null;
  onQualityChange: (index: number) => void;
}

export function QualitySelector({ qualities, currentQuality, onQualityChange }: QualitySelectorProps) {
  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000000).toFixed(2)} Mbps`;
  };

  return (
    <table style={{ width: "100%" }} className="quality-grid">
      <thead>
        <tr>
          <th>Quality</th>
          <th>Resolution</th>
          <th>Bitrate</th>
        </tr>
      </thead>
      <tbody>
        {qualities.map((quality) => (
          <tr
            key={quality.index}
            style={{
              backgroundColor: currentQuality?.index === quality.index ? "#e0e0e0" : "transparent",
            }}
          >
            <td>
              <Link href="#" onClick={() => onQualityChange(quality.index)}>
                {quality.name}
              </Link>
            </td>
            <td>
              {quality.width}x{quality.height}
            </td>
            <td>{formatBitrate(quality.bitrate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
