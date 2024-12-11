import { useCallback, useEffect, useRef, useState } from "react";
import HLS from "hls.js";

interface VideoPreviewProps {
    src: string;
    thumbnail: string;
}

export default function VideoPreview({ src, thumbnail }: VideoPreviewProps) {
    const [hover, setHover] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const hlsRef = useRef<HLS | null>(null);

    const cleanupHls = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        setIsReady(false);
    }, []);

    const refCallback = useCallback((element: HTMLVideoElement) => {
        if (!element || !hover) return;
        
        if (HLS.isSupported()) {
            hlsRef.current = new HLS({
                debug: false,
                capLevelToPlayerSize: true,
            });

            hlsRef.current.loadSource(src);
            hlsRef.current.attachMedia(element);
            hlsRef.current.on(HLS.Events.MANIFEST_PARSED, () => {
                element.play()
                    .then(() => setIsReady(true))
                    .catch((error) => console.log("Error playing video:", error));
            });
        } else if (element.canPlayType("application/vnd.apple.mpegurl")) {
            element.src = src;
            element.addEventListener("loadedmetadata", () => {
                element.play()
                    .then(() => setIsReady(true))
                    .catch((error) => console.log("Error playing video:", error));
            });
        }
    }, [hover, src]);

    useEffect(() => {
        if (!hover) {
            cleanupHls();
        }
    }, [hover, cleanupHls]);

    return (
        <div 
            onMouseEnter={() => setHover(true)} 
            onMouseLeave={() => setHover(false)}
        >
            {(!hover || !isReady) && <img src={thumbnail} />}
            {hover && (
                <video 
                    ref={refCallback}
                    autoPlay 
                    muted 
                    playsInline 
                    style={{ display: isReady ? 'block' : 'none' }}
                />
            )}
        </div>
    );
}