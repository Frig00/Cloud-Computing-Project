# Variables
$BucketName = "sunomi-tfstate"
# Get the current directory
$CurrentDir = (Get-Location).Path

# Upload .tfstate and .tfvars files to S3
aws s3 cp $CurrentDir "s3://$BucketName/" --recursive --exclude "*" --include "*.tfstate" --include "*.tfvars"

# Check for success
if ($LASTEXITCODE -eq 0) {
    Write-Host "Terraform files (.tfstate and .tfvars) uploaded successfully to s3://$BucketName/$DestDir"
} else {
    Write-Error "Error uploading Terraform files to S3."
}
