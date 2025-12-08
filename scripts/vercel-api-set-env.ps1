param(
  [Parameter(Mandatory=$true)][string]$Token,
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$Key,
  [Parameter(Mandatory=$true)][string]$Value,
  [string]$Target = 'production'
)

$headers = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
$body = @{ key = $Key; value = $Value; target = @($Target); type = 'encrypted' }
$json = $body | ConvertTo-Json -Depth 6
Write-Host "Posting env for project $ProjectId key=$Key target=$Target"

$uri = "https://api.vercel.com/v9/projects/$ProjectId/env"
try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $json -ContentType 'application/json'
  Write-Host "Created env: $($resp.id)"
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Error from API:" -ForegroundColor Red
  Write-Host $_.Exception.Response.StatusCode.Value__
  $text = $_.Exception.Response.GetResponseStream() | ForEach-Object { $_ } | Out-String
  Write-Host $text
  exit 1
}
