#$readyTimes = @{ "elasticsearch" = $null; "dsp-server" = $null }

# ==========================================================
# STAGE 1: ELASTICSEARCH
# ==========================================================
$startTime1 = Get-Date
Write-Host "Thời điểm khởi động elastic container: $($startTime1.ToString('HH:mm:ss'))"

# Khởi chạy cụm Elastic
docker compose -f ./local/docker-compose.yml up -d elasticsearch extraction-service

Write-Host "Đang theo dõi trạng thái healthy của elasticsearch..." -NoNewline
while ($null -eq $readyTimes["elasticsearch"]) {
    $containerId = docker compose -f ./local/docker-compose.yml ps -q elasticsearch
    if ($containerId) {
        $status = docker inspect --format='{{.State.Health.Status}}' $containerId
        if ($status -eq "healthy") {
            $readyTimes["elasticsearch"] = Get-Date
            Write-Host "`n[ OK ] elasticsearch đã Healthy lúc: $($readyTimes['elasticsearch'].ToString('HH:mm:ss'))" -ForegroundColor Green
        }
    }
    
    if ($null -eq $readyTimes["elasticsearch"]) {
        Write-Host "." -NoNewline
        Start-Sleep -Milliseconds 500
    }
}

# ==========================================================
# STAGE 2: DSP SERVER
# ==========================================================
$startTime2 = Get-Date
Write-Host "`nThời điểm khởi động dsp container: $($startTime2.ToString('HH:mm:ss'))"

# Khởi chạy cụm DSP (chỉ sau khi ES đã healthy)
docker compose -f docker-compose.yml up -d mongodb dsp-model dsp-server dsp-dashboard

Write-Host "Đang theo dõi trạng thái healthy của dsp-server..." -NoNewline
while ($null -eq $readyTimes["dsp-server"]) {
    $containerId = docker compose -f docker-compose.yml ps -q dsp-server
    if ($containerId) {
        $status = docker inspect --format='{{.State.Health.Status}}' $containerId
        if ($status -eq "healthy") {
            $readyTimes["dsp-server"] = Get-Date
            Write-Host "`n[ OK ] dsp-server đã Healthy lúc: $($readyTimes['dsp-server'].ToString('HH:mm:ss'))" -ForegroundColor Green
        }
    }

    if ($null -eq $readyTimes["dsp-server"]) {
        Write-Host "." -NoNewline
        Start-Sleep -Milliseconds 500
    }
}

# ==========================================================
# STAGE 3: TÍNH TOÁN KẾT QUẢ
# ==========================================================
$dspElapsedSec = [Math]::Round(($readyTimes["dsp-server"] - $startTime2).TotalSeconds, 2)
$esElapsedSec  = [Math]::Round(($readyTimes["elasticsearch"] - $startTime1).TotalSeconds, 2)

# Tổng thời gian hệ thống từ lúc bấm máy lần đầu đến khi mọi thứ sẵn sàng
$totalElapsedSec = [Math]::Round(($readyTimes["dsp-server"] - $startTime1).TotalSeconds, 2)

Write-Host "`n" + ("="*40)
Write-Host "THỜI GIAN PHẢN HỒI:" -ForegroundColor Yellow
Write-Host "1. elasticsearch: $esElapsedSec s (từ lúc bắt đầu)"
Write-Host "2. dsp-server   : $dspElapsedSec s (từ lúc ES xong)"
Write-Host "----------------------------------------"
Write-Host "TỔNG THỜI GIAN HỆ THỐNG SẴN SÀNG: $totalElapsedSec s" -ForegroundColor Magenta
Write-Host ("="*40)