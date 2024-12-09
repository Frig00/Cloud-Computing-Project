import { useState } from "react";
import { Box, Container, Paper } from "@mui/material";
import DropZoneView from "./DropZoneView";
import UploadForm from "./UploadForm";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);

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
          {file ? (
            <UploadForm file={file} onCancel={() => setFile(null)} />
          ) : (
            <DropZoneView onFileSelected={setFile} />
          )}
        </Paper>
      </Box>
    </Container>
  );
}
