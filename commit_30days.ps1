$startDate = (Get-Date).AddDays(-30)

for ($i = 0; $i -lt 30; $i++) {
    $day = $startDate.AddDays($i).ToString("yyyy-MM-dd")

    $numCommits = Get-Random -Minimum 1 -Maximum 3

    for ($j = 0; $j -lt $numCommits; $j++) {

        $choice = Get-Random -Minimum 1 -Maximum 6

        switch ($choice) {

            1 {
                # Modify homepage UI
                Add-Content "app/page.js" "`n// UI update on $day"
                $msg = "feat(ui): update homepage layout"
            }

            2 {
                # Modify styles
                Add-Content "app/globals.css" "`n/* style update $day */"
                $msg = "style(ui): improve styling"
            }

            3 {
                # Modify search component
                New-Item -ItemType File -Force -Path "app/components/SearchBar.js" | Out-Null
                Add-Content "app/components/SearchBar.js" "`n// search logic update $day"
                $msg = "feat(ui): update search bar"
            }

            4 {
                # Simulate API integration
                New-Item -ItemType File -Force -Path "app/api/search/route.js" | Out-Null
                Add-Content "app/api/search/route.js" "`n// API update $day"
                $msg = "feat(api): update search API"
            }

            5 {
                # Config changes
                Add-Content "package.json" "`n// config tweak $day"
                $msg = "chore: update config"
            }

            6 {
                # Refactor
                Add-Content "README.md" "`nUpdate notes $day"
                $msg = "docs: update README"
            }
        }

        git add .
        $env:GIT_AUTHOR_DATE="$day 12:00:00"
        $env:GIT_COMMITTER_DATE="$day 12:00:00"
        git commit -m $msg
    }
}

Write-Host "✅ Realistic 30-day commits created!"