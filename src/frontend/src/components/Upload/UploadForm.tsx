import React, { ChangeEvent, useState } from 'react';
import { Box, Button, LinearProgress, TextField, Typography } from "@mui/material";
import { Stack } from "@mui/system";
import Confetti from "react-confetti-boom";
import { UploadApi } from "../../api";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { uploadSseEndpointUrl } from "../../lib/consts";

export interface VideoProgress {
    videoId: string;
    progress: {
        [key: string]: number
    };
}

interface UploadFormProps {
    file: File;
    onCancel: () => void;
}


class UploadService {
    static async uploadVideo(file: File, onProgress: (progress: number) => void): Promise<{ videoId: string }> {
        const uploadApi = new UploadApi();
        var { url, videoId } = await uploadApi.uploadUploadUrlGet();

        url = url.replace("minio:9000", "localhost:9005"); //TEMPORARY, just for local testing

        const upload = new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", url);
            xhr.setRequestHeader("Content-Type", file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    onProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(true);
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error("XHR request failed"));
            };

            xhr.send(file);
        });

        await upload;
        await uploadApi.uploadTranscodeVideoPost({ uploadTranscodeVideoPostRequest: { videoID: videoId } });
        return { videoId };
    }

    static async getTranscodeProgress(videoId: string, onProgress: (progress: VideoProgress) => void) {
        fetchEventSource(uploadSseEndpointUrl(videoId), {
            onmessage(ev) {
                onProgress(JSON.parse(ev.data));
            }
        });
    }
}


export default function UploadForm({ file, onCancel }: UploadFormProps) {
    const [title, setTitle] = useState(file.name.substring(0, file.name.lastIndexOf('.')));
    const [description, setDescription] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadDeterminate, setUploadDeterminate] = useState(true);
    const [transcodeProgress, setTranscodeProgress] = useState<VideoProgress | null>(null);

    const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value);
    const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value);

    const onUpload = async () => {
        setUploadDeterminate(false);


        const { videoId } = await UploadService.uploadVideo(file, (progress) => {
            setUploadProgress(progress);
            setUploadDeterminate(true);
        });


        UploadService.getTranscodeProgress(videoId, (progress) => {
            setTranscodeProgress(progress);
        });

    };

    return (
        <>
            <Confetti mode='boom' particleCount={250} effectInterval={3000} colors={['#ff577f', '#ff884b', '#ffd384', '#fff9b0']} launchSpeed={1.8} spreadDeg={60} />
            <Typography variant="h4" gutterBottom>
                Upload Video
            </Typography>
            <Box component="form" noValidate autoComplete="off">
                <TextField
                    fullWidth
                    label="Video Title"
                    variant="outlined"
                    margin="normal"
                    value={title}
                    onChange={handleTitleChange}
                />
                <TextField
                    fullWidth
                    label="Video Description"
                    variant="outlined"
                    margin="normal"
                    multiline
                    rows={4}
                    value={description}
                    onChange={handleDescriptionChange}
                />

                <Stack spacing={{ xs: 1, sm: 2 }} direction="row" useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Button variant="contained" color="primary" onClick={onUpload}>
                        Upload
                    </Button>
                    <Button variant="contained" color="primary" onClick={onCancel}>
                        Cancel
                    </Button>
                </Stack>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        Upload Progress
                    </Typography>
                    <LinearProgress
                        variant={uploadDeterminate ? "determinate" : "indeterminate"}
                        value={uploadProgress}
                    />
                </Box>

                {transcodeProgress ? Object.entries(transcodeProgress.progress).map(([resolution, progress]) => (
                    <Box sx={{ mt: 2 }} key={resolution}>
                        <Typography variant="body2" gutterBottom>
                            Processing {resolution}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                        />
                    </Box>
                )) : null}
            </Box>
        </>
    );
}