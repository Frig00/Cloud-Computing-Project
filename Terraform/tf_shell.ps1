# Variables
$BucketName = "sunomi-tfstate"
$DestDir = (Get-Location).Path

# Function to download Terraform files
function Download-TerraformFiles {
    Write-Host "Downloading .tfstate and .tfvars files from S3..."
    aws s3 cp "s3://$BucketName/" $DestDir --recursive --exclude "*" --include "*.tfstate" --include "*.tfvars"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Download completed successfully."
    } else {
        Write-Error "Error downloading Terraform files."
        exit 1
    }
}

# Function to upload Terraform files
function Upload-TerraformFiles {
    Write-Host "Uploading .tfstate and .tfvars files to S3..."
    aws s3 cp $DestDir "s3://$BucketName/" --recursive --exclude "*" --include "*.tfstate" --include "*.tfvars"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Upload completed successfully."
    } else {
        Write-Error "Error uploading Terraform files."
    }
}

# Download files before starting the nested shell
Download-TerraformFiles

# Start a nested PowerShell session
Write-Host "Entering Terraform shell. Press Ctrl+C to exit and upload changes."
try {
    # Nested shell
    powershell -NoLogo
} finally {
    # Ensure upload happens after the nested shell exits
    Write-Host "Exiting Terraform shell..."
    Upload-TerraformFiles
}
