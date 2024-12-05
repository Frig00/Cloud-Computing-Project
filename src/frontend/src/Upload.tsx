import React, {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Container, Stack, styled, useTheme } from "@mui/system";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { UploadApi } from "./api";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import usePreventDefaultDrop from "./components/usePreventDefaultDrop";
import Confetti from "react-confetti-boom";
import { API_BASE_PATH, uploadSseEndpointUrl } from "./lib/consts";

const DropZone = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  transition: "background-color 0.3s, border-color 0.3s",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface VideoProgress {
  videoId: string;
  progress: {
    [key: string]: number
  };
}

export default function Component() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  usePreventDefaultDrop();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDeterminate, setUploadDeterminate] = useState(true);

  const [transcodeProgress, setTranscodeProgress] = useState<VideoProgress | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget != e.target) return;
    setIsDragging(false);
    console.log("drop");

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFile(droppedFiles[0]);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFile(selectedFiles[0]);
  };

  useEffect(() => {
    if (!file) return;
    setTitle(file.name.substring(0, file.name.lastIndexOf('.')));
  }, [file]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setFile(null);
  };


  const onUpload = async () => {
    if (!file) return;
    setUploadDeterminate(false);
    const uploadApi = new UploadApi();
    var { url, videoId } = await uploadApi.uploadUploadUrlGet();
    
    url = url.replace("minio:9000", "localhost:9005"); //TEMPORARY, just for local testing

    

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        redirect: "follow",
      }).then((response) => console.log(response));


      const upload = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type);
  
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadDeterminate(true);
            setUploadProgress(percentComplete);
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
      

      await uploadApi.uploadTranscodeVideoPost({uploadTranscodeVideoPostRequest: {videoID: videoId}});

      fetchEventSource(uploadSseEndpointUrl(videoId), {
        onmessage(ev) {
            setTranscodeProgress(JSON.parse(ev.data));
        }
    });


  }


  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          bgcolor: "background.default",
          marginTop: "2rem",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "80%" }}>
          {file
            ? (
              <>
               <Confetti mode='boom' particleCount={250} effectInterval={3000} colors={['#ff577f', '#ff884b', '#ffd384', '#fff9b0']} launchSpeed={1.8} spreadDeg={60}/>
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

                  <Stack
                    spacing={{ xs: 1, sm: 2 }}
                    direction="row"
                    useFlexGap
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={onUpload}
                      disabled={file == null}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!file}
                      onClick={handleCancel}
                    >
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
            )
            : (
              <DropZone
                
                sx={{backgroundColor: isDragging ? 'rgb(59 130 246 / 0.5)' : "inherit", position: 'relative'}}
              >
                <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 1000000,
            }} 
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}>

                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />
                <CloudUploadIcon
                  sx={{ fontSize: 48, color: "textSecondary", mb: 2 }}
                />
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  Drag and drop video here, or click to select video
                </Typography>
              </DropZone>
            )}
        </Paper>
      </Box>
    </Container>
  );
}

