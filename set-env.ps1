# Path to the .env file
$envFilePath = ".\.env"

# Read the .env file line by line
Get-Content $envFilePath | ForEach-Object {
    # Skip empty lines and comments
    if ($_ -and $_ -notmatch '^\s*#') {
        # Split the line into key and value
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()

            # Remove surrounding quotes from the value if present
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            # Set the environment variable
            [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

Write-Output "Environment variables set from .env file."