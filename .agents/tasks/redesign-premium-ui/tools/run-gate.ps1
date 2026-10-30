# Runs the smoke harness one group at a time, each in its own job with a time
# limit, writing a log per group. Prints a one-line summary per group.
param(
  [string[]]$Groups = @("student", "teacher", "evaluator", "support", "admin", "superAdmin", "dev", "auth"),
  [string]$Out = "..\shots\phase-1-gate",
  [int]$TimeoutSec = 900
)
# "-File" passes "a,b,c" as one string; accept both forms.
$Groups = @($Groups | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$tools = $PSScriptRoot
foreach ($g in $Groups) {
  $dir = Join-Path $Out $g
  $log = Join-Path $tools "gate-$g.log"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $job = Start-Job -ScriptBlock {
    param($tools, $g, $dir, $log)
    Set-Location $tools
    node smoke.mjs --base http://localhost:8543 --groups $g --viewports desktop,mobile --themes dark,light --open-nav --out $dir *> $log
  } -ArgumentList $tools, $g, $dir, $log
  $done = Wait-Job $job -Timeout $TimeoutSec
  if (-not $done) {
    Stop-Job $job
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match "smoke\.mjs.*--groups $g " } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  }
  Remove-Job $job -Force
  $summary = (Get-Content $log -ErrorAction SilentlyContinue | Select-String -Pattern "pages, \d+ errors").Line
  $fails = (Get-Content $log -ErrorAction SilentlyContinue | Select-String -Pattern "^FAIL").Count
  "{0,-11} {1,5:N0}s  {2}  FAIL lines: {3}{4}" -f $g, $sw.Elapsed.TotalSeconds, $(if ($summary) { $summary.Split('.')[0] } else { "no summary (timed out)" }), $fails, $(if ($done) { "" } else { "  [TIMED OUT]" })
}
