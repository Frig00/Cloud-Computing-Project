import "./Bench.css";

export function parseVTT(text: string) {
  const cues = [];
  const lines = text.split("\n");
  let currentCue = null;

  for (const line of lines) {
    if (line.trim() === "") {
      if (currentCue) {
        cues.push(currentCue);
        currentCue = null;
      }
      continue;
    }

    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    const timestampToSeconds = (timestamp: string): number => {
      const [hours, minutes, seconds] = timestamp.split(":").map(Number);
      return hours * 3600 + minutes * 60 + seconds;
    };

    if (line.includes("-->")) {
      const [start, end] = line.split("-->").map((t) => t.trim());
      currentCue = {
        start: timestampToSeconds(start),
        end: timestampToSeconds(end),
        formattedStart: formatTime(timestampToSeconds(start)),
        text: "",
      };
    } else if (currentCue) {
      currentCue.text += `${line.trim()} `;
    }
  }

  return cues.map((cue) => ({
    ...cue,
    text: cue.text.trim(),
  }));
}
