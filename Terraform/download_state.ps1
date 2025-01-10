# Variables
$BucketName = "sunomi-tfstate"

# Get the current directory
$CurrentDir = (Get-Location).Path

# Download .tfstate and .tfvars files from S3
aws s3 cp "s3://$BucketName/" $CurrentDir --recursive --exclude "*" --include "*.tfstate" --include "*.tfvars"

# Check for success
if ($LASTEXITCODE -eq 0) {
    Write-Host "Terraform files (.tfstate and .tfvars) downloaded successfully to $CurrentDir"
} else {
    Write-Error "Error downloading Terraform files from S3."
}
