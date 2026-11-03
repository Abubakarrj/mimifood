# Starts Mimi Food locally using the keys already set in your PowerShell session.
# Example (type these yourself, they are not stored anywhere):
#   $env:ADMIN_KEY = "<a long random value>"
#   $env:SQUARE_ENVIRONMENT = "sandbox"
#   $env:SQUARE_ACCESS_TOKEN = "<from Square>"
#   $env:SQUARE_APPLICATION_ID = "<from Square>"
#   $env:SQUARE_LOCATION_ID = "<from Square>"
if (-not $env:ADMIN_KEY) { Write-Host "Set ADMIN_KEY first (any long random value)."; exit 1 }
if (-not $env:PORT) { $env:PORT = "3000" }
$checks = [ordered]@{
  "Square (card payments)" = ($env:SQUARE_ACCESS_TOKEN -and $env:SQUARE_APPLICATION_ID -and $env:SQUARE_LOCATION_ID)
  "Resend (email)"         = ($env:RESEND_API_KEY -and $env:EMAIL_FROM)
  "Shippo (shipping)"      = [bool]$env:SHIPPO_API_TOKEN
}
foreach ($k in $checks.Keys) { Write-Host ("{0,-24} {1}" -f $k, $(if ($checks[$k]) { "connected" } else { "not set" })) }
npm start
