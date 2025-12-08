<#
update-vercel-env.ps1
PowerShell helper to update a Vercel environment variable and trigger a deploy.

Notes:
- This script calls the Vercel CLI (`npx vercel ...`) and uses the provided VERCEL token.
- It attempts a non-interactive add using `--value` and falls back to piping the value if needed.
- Provide the token via `-Token` or set `VERCEL_TOKEN` in your environment.

Usage examples:
  # Run from project root (FrontEnd) or pass -ProjectDir
  pwsh .\scripts\update-vercel-env.ps1 -Token "<your-token>" -Value "https://your-ngrok.ngrok-free.app" -Target production -Deploy

  # Use environment token
  $env:VERCEL_TOKEN = '<your-token>'
  pwsh .\scripts\update-vercel-env.ps1 -Value 'https://your-ngrok.ngrok-free.app' -Target production -Deploy

Parameters:
  -Token      Vercel token (optional if VERCEL_TOKEN env var set)
  -Project    Vercel project name (optional). If omitted, the local folder should already be linked.
  -ProjectDir Path to the FrontEnd project (default: script parent/..)
  -Name       Environment variable name (default: VITE_API_URL)
  -Value      Value to set for the env var (required)
  -Target     One of: production|preview|development (default: production)
  -Deploy     Switch. If present, triggers `npx vercel --prod --yes` after env change.
#>

param(
    [string]$Token = $env:VERCEL_TOKEN,
    [string]$Project = '',
    [string]$ProjectDir = '',
    [string]$Name = "VITE_API_URL",
    [Parameter(Mandatory = $true)][string]$Value,
    [ValidateSet('production','preview','development')][string]$Target = 'production',
    [switch]$Deploy
)

# If ProjectDir not provided, derive from script location or current working directory
if (-not $ProjectDir -or $ProjectDir.Trim().Length -eq 0) {
    if ($PSScriptRoot) { $ProjectDir = (Join-Path $PSScriptRoot "..") }
    else { $ProjectDir = (Get-Location).Path }
}

function Write-Log {
    param([string]$m)
    Write-Host "[update-vercel-env] $m"
}

if (-not $Token) {
    Write-Host "VERCEL token not provided via -Token and VERCEL_TOKEN is not set." -ForegroundColor Yellow
    $Token = Read-Host -Prompt "Enter VERCEL token (input hidden)" -AsSecureString
    $Token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token))
}

$fullProjectDir = Resolve-Path -Path $ProjectDir
Set-Location $fullProjectDir
Write-Log "Working in $fullProjectDir"

# Set token in env for CLI usage
$env:VERCEL_TOKEN = $Token

# Optionally link project non-interactively (safe when project name provided)
if ($Project -and $Project.Trim().Length -gt 0) {
    Write-Log "Linking to project: $Project"
    cmd /c "npx vercel link --project $Project --yes --token $Token" | Out-Null
}

# Remove existing variable (ignore errors)
Write-Log "Removing any existing $Name for target $Target (if present)"
cmd /c "npx vercel env rm $Name $Target --yes --token $Token" 2> $null

# Try non-interactive add using --value (works when CLI version supports it)
# Build command via concatenation to avoid embedded-quote parsing issues in PowerShell.
$addCmd = 'npx vercel env add ' + $Name + ' ' + $Target + ' --token ' + $Token + ' --yes --value "' + $Value + '"'
Write-Log ("Attempting: " + $addCmd)
cmd /c $addCmd
if ($LASTEXITCODE -eq 0) {
    Write-Log "Added env via --value successfully."
} else {
    Write-Log "--value not supported or failed; falling back to piping value to interactive prompt."
    # Provide the value then 'y' to mark sensitive. Build the pipe command safely.
    $pipeCmd = '(echo ' + $Value + ' & echo y) | npx vercel env add ' + $Name + ' ' + $Target + ' --token ' + $Token
    Write-Log ("Running fallback: " + $pipeCmd)
    cmd /c $pipeCmd
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Fallback add returned non-zero exit code. Check CLI output for details.";
        exit 1
    }
}

# Pull the production env file to verify (optional)
Write-Log "Pulling production env to .env.production for verification"
cmd /c "npx vercel env pull .env.production --environment production --yes --token $Token"

# Print the VITE value from the pulled file if present
if (Test-Path .env.production) {
    $envContent = Get-Content .env.production -Raw
    # Find the first line that defines the variable and extract the value robustly
    $matchLine = ($envContent -split "`n" | Where-Object { $_ -match "^\s*" + [regex]::Escape($Name) + "\s*=" } | Select-Object -First 1)
    if ($matchLine) {
        # Remove leading 'NAME=' and any surrounding quotes/spaces
        $val = $matchLine -replace ('^\s*' + [regex]::Escape($Name) + '\s*=\s*"?'), ''
        $val = $val -replace ('"?\s*$'), ''
        Write-Log ("Pulled " + $Name + ": '" + $val + "'")
    } else {
        Write-Log "Could not find $Name in .env.production"
    }
} else {
    Write-Log ".env.production not found after pull"
}

if ($Deploy.IsPresent) {
    Write-Log "Triggering production deploy"
    # Use --yes to skip prompts, and pass token
    cmd /c "npx vercel --prod --yes --token $Token"
}

Write-Log "Done."
