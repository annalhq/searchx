$FILE = "progress_log.txt"

# Start from 30 days ago
$startDate = (Get-Date).AddDays(-30)

for ($i = 0; $i -lt 30; $i++) {
    $day = $startDate.AddDays($i).ToString("yyyy-MM-dd")

    # Random commits per day (1 to 3)
    $numCommits = Get-Random -Minimum 1 -Maximum 4

    for ($j = 0; $j -lt $numCommits; $j++) {

        $messages = @(
            "feat(ui): add homepage layout",
            "style(ui): improve UI styling",
            "feat(ui): add search bar",
            "fix(ui): fix responsiveness",
            "feat(search): integrate SearxNG",
            "feat(api): connect frontend to backend",
            "fix(api): handle errors",
            "perf(search): optimize performance",
            "feat(search): add filters",
            "refactor: clean code"
        )

        $msg = Get-Random $messages

        Add-Content $FILE "$msg on $day"

        git add .
        $env:GIT_AUTHOR_DATE="$day 12:00:00"
        $env:GIT_COMMITTER_DATE="$day 12:00:00"
        git commit -m $msg
    }
}

Write-Host "✅ 30 days commits created!"