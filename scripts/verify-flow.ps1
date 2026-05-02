# 串行验收：注册随机用户 → 登录 → /me → logout → /me 应 401
# 使用 curl.exe（与 bash 脚本行为一致）。服务需已启动。
# 用法：pwsh -File scripts/verify-flow.ps1
#       或设置 $env:BASE_URL = 'http://127.0.0.1:3000'
$ErrorActionPreference = 'Stop'

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd('/') } else { 'http://127.0.0.1:3000' }
$CookieJar = Join-Path ([System.IO.Path]::GetTempPath()) ("verify-flow-cookies-" + [Guid]::NewGuid().ToString('N') + ".txt")
$CurlOut = Join-Path ([System.IO.Path]::GetTempPath()) ("verify-flow-curl-out-" + [Guid]::NewGuid().ToString('N') + ".bin")
$Username = "verify_{0}_{1}" -f [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(), (Get-Random)
$Password = 'VerifyPass1'

function Assert-HttpCode {
    param([string]$Step, [int]$Want, [int]$Got)
    if ($Got -ne $Want) {
        Write-Error ("verify-flow: 失败 — {0} 期望 HTTP {1}，实际 {2}" -f $Step, $Want, $Got)
        exit 1
    }
}

try {
    # 1) 注册
    $body = (@{ username = $Username; password = $Password } | ConvertTo-Json -Compress)
    $code = [int](& curl.exe -sS -o $CurlOut -w '%{http_code}' -H 'Content-Type: application/json' -d $body "$BaseUrl/register")
    Assert-HttpCode 'POST /register' 201 $code

    # 2) 登录
    $code = [int](& curl.exe -sS -o $CurlOut -w '%{http_code}' -c $CookieJar -H 'Content-Type: application/json' -d $body "$BaseUrl/login")
    Assert-HttpCode 'POST /login' 200 $code

    # 3) /me
    $code = [int](& curl.exe -sS -o $CurlOut -w '%{http_code}' -b $CookieJar "$BaseUrl/me")
    Assert-HttpCode 'GET /me（已登录）' 200 $code

    # 4) 登出
    $code = [int](& curl.exe -sS -o $CurlOut -w '%{http_code}' -b $CookieJar -c $CookieJar -X POST "$BaseUrl/logout")
    Assert-HttpCode 'POST /logout' 200 $code

    # 5) /me 应 401
    $code = [int](& curl.exe -sS -o $CurlOut -w '%{http_code}' -b $CookieJar "$BaseUrl/me")
    Assert-HttpCode 'GET /me（登出后）' 401 $code

    Write-Host ("verify-flow: 通过（用户 {0}）" -f $Username)
}
finally {
    if (Test-Path -LiteralPath $CookieJar) { Remove-Item -LiteralPath $CookieJar -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $CurlOut) { Remove-Item -LiteralPath $CurlOut -Force -ErrorAction SilentlyContinue }
}
