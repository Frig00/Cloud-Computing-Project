import { Box, LinearProgress, Typography } from "@mui/material";

interface ProgressBarProps {
  label: string;
  progress: number;
  indeterminate?: boolean;
}

export function ProgressBar({ label, progress, indeterminate = false }: ProgressBarProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" gutterBottom>
        {label}
      </Typography>
      <LinearProgress variant={indeterminate ? "indeterminate" : "determinate"} value={progress} />
    </Box>
  );
}
