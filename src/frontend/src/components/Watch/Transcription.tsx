import { Card, CircularProgress, Typography } from "@mui/material";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { parseVTT } from "../Bench/Bench";
import { useQuery } from "@tanstack/react-query";
import AWSTranscribe from "../../assets/aws_transcribe.svg";
import { transcriptionUrl } from "@/lib/consts";

interface TranscriptionProps {
    videoId: string;
    onCueClick?: (startTime: number) => void;
    currentTime?: number;
}

async function fetchVTT(videoId: string) {
    const response = await fetch(transcriptionUrl(videoId));
    if (!response.ok) {
        throw new Error('Failed to fetch VTT file');
    }
    const text = await response.text();
    return parseVTT(text);
}

export default function Transcription({videoId, onCueClick, currentTime}: TranscriptionProps) {
    const [activeCue, setActiveCue] = useState<number | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const activeCueRef = useRef<HTMLDivElement>(null);

    const { data: cues, isLoading, error } = useQuery({
        queryKey: ['transcription', videoId],
        queryFn: () => fetchVTT(videoId),
    });

    useEffect(() => {
        if (!activeCue || !containerRef.current || !activeCueRef.current) return;
        
        const container = containerRef.current;
        const cueElement = activeCueRef.current;
        
        const offsetTop = cueElement.offsetTop - container.offsetTop;
        
        container.scrollTo({
          top: offsetTop,
          behavior: "smooth"
        });
      }, [activeCue]);

      useEffect(() => {
        if (currentTime === undefined || !cues) return;
        const nextCue = cues.find((cue) => cue.start > currentTime);
        if (nextCue) {
            const index = cues.indexOf(nextCue) - 1;
            if (index !== activeCue) {
                setActiveCue(index);
            }
        }
    }, [currentTime, cues]);

      const handleCueClick = (index: number) => {
        setActiveCue(index);
        if (onCueClick && cues) {
            onCueClick(cues[index].start);
        }
      };

    if (isLoading) {
        return (
            <Card variant="outlined" className="subtitle-panel" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <CircularProgress />
            </Card>
        );
    }

    if (error) {
        return (
            <Card variant="outlined" className="subtitle-panel" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Typography>Transcription is currently unavailable, try again later.</Typography>
            </Card>
        );
    }

    if (!cues || cues.length === 0) {
        return (
            <Card variant="outlined" className="subtitle-panel" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Typography>Video has no transcription</Typography>
            </Card>
        );
    }

    return (<Card
        variant="outlined"
        className="subtitle-panel"
        ref={containerRef}
        sx={{ overflowY: "scroll" }}
      >
        <div className="subtitle-container">
          {cues
            ? cues.map((cue, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "8px",
                }}
                className={clsx("subtitle-cue", activeCue == index ? "active" : null)}
                ref={index === activeCue ? activeCueRef : null}
                onClick={() => handleCueClick(index)}
              >
                <div className="cue-time">{cue.formattedStart}</div>
                <div>{cue.text}</div>
              </div>
            ))
            : null}
        </div>
        <div className="subtitle-pb">
          <img
            src={AWSTranscribe}
            alt="AWS Transcribe"
            style={{
              width: "48px",
              borderRadius: "4px",
            }}
          />
          <span>
            Powered by
            <br />
            <b>AWS Transcribe</b>
          </span>
        </div>
      </Card>)
}