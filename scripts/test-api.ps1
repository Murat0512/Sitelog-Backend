# Set these before running
$BaseUrl = $env:API_BASE_URL
if (-not $BaseUrl) { $BaseUrl = "https://YOUR_BACKEND_DOMAIN" }
$Email = $env:API_TEST_EMAIL
$Password = $env:API_TEST_PASSWORD

if (-not $Email -or -not $Password) {
  Write-Error "Set API_TEST_EMAIL and API_TEST_PASSWORD environment variables."
  exit 1
}

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType 'application/json' -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
$token = $login.token

$headers = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/health"
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/projects" -Headers $headers
