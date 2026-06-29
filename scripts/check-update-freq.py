#!/usr/bin/env python3
"""
Check actual update frequency of each GitHub repo by reading its workflow files.
We use jsdelivr to fetch the raw .github/workflows/*.yml content.
"""
import subprocess
import re

# Each repo and the expected workflow file path
REPOS = [
    # (repo_id, owner/repo, branch, workflow_path_pattern)
    ("proxyscrape", "proxyscrape/free-proxy-list", "main", ".github/workflows"),
    ("TheSpeedX", "TheSpeedX/PROXY-List", "master", ".github/workflows"),
    ("proxifly", "proxifly/free-proxy-list", "main", ".github/workflows"),
    ("monosans", "monosans/proxy-list", "main", ".github/workflows"),
    ("MuRongPIG", "MuRongPIG/Proxy-master", "main", ".github/workflows"),
    ("hookzof", "hookzof/socks5_list", "master", ".github/workflows"),
    ("clarketm", "clarketm/proxy-list", "master", ".github/workflows"),
    ("roosterkid", "roosterkid/openproxylist", "main", ".github/workflows"),
    ("ShiftyTR", "ShiftyTR/Proxy-List", "master", ".github/workflows"),
]

# Use the GitHub API to list workflow files (via jsdelivr which proxies github)
# Pattern: https://cdn.jsdelivr.net/gh/OWNER/REPO@BRANCH/.github/workflows/
# But jsdelivr doesn't list dirs; we need to query github API directly.
# Alternative: try common workflow filenames.

COMMON_WORKFLOW_NAMES = [
    "update.yml", "update.yaml", "main.yml", "main.yaml",
    "scrape.yml", "scrape.yaml", "fetch.yml", "fetch.yaml",
    "cron.yml", "cron.yaml", "proxy.yml", "proxy.yaml",
    "refresh.yml", "refresh.yaml", "build.yml", "build.yaml",
    "check.yml", "check.yaml", "test.yml", "test.yaml",
    "auto-update.yml", "auto-update.yaml",
]

def fetch_url(url, timeout=10):
    try:
        r = subprocess.run(
            ["curl", "-s", "--max-time", str(timeout), "-w", "\\n%{http_code}", url],
            capture_output=True, text=True, timeout=timeout+5,
        )
        out = r.stdout
        lines = out.rsplit("\n", 1)
        if len(lines) == 2:
            return lines[1].strip(), lines[0]
        return "???", out
    except Exception as e:
        return "ERR", str(e)

def list_workflows_via_api(owner_repo):
    """Use GitHub API to list workflows in .github/workflows/"""
    # First, get the tree
    url = f"https://api.github.com/repos/{owner_repo}/git/trees/HEAD?recursive=1"
    code, body = fetch_url(url, timeout=10)
    if code != "200":
        return None, f"API {code}"
    # Find .github/workflows entries
    import json
    try:
        data = json.loads(body)
        paths = [item["path"] for item in data.get("tree", []) if item.get("type") == "blob"]
        workflows = [p for p in paths if p.startswith(".github/workflows/") and (p.endswith(".yml") or p.endswith(".yaml"))]
        return workflows, None
    except Exception as e:
        return None, f"parse err: {e}"

def get_workflow_content(owner_repo, branch, path):
    url = f"https://cdn.jsdelivr.net/gh/{owner_repo}@{branch}/{path}"
    code, body = fetch_url(url, timeout=10)
    if code != "200":
        return None
    return body

def extract_schedule(content):
    """Find cron schedules in a workflow file."""
    schedules = []
    # Match: schedule: \n - cron: '...'
    # Or: cron: "..." / cron: '...'
    for m in re.finditer(r"cron\s*:\s*['\"]([^'\"]+)['\"]", content):
        schedules.append(m.group(1))
    # Also match schedule strings like '*/10 * * * *'
    return schedules

def describe_cron(cron_expr):
    """Translate a cron expression to a human-readable Chinese description."""
    parts = cron_expr.split()
    if len(parts) != 5:
        return cron_expr
    minute, hour, day, month, weekday = parts
    
    # Every N minutes
    if minute.startswith("*/") and hour == "*":
        n = minute[2:]
        return f"每 {n} 分钟"
    # Every minute
    if minute == "*" and hour == "*":
        return "每分钟"
    # Specific minute every hour
    if hour == "*" and day == "*" and not minute.startswith("*/"):
        try:
            m = int(minute)
            return f"每小时（第 {m} 分钟）"
        except:
            pass
    # Every N hours
    if hour.startswith("*/") and minute != "*":
        n = hour[2:]
        return f"每 {n} 小时"
    # Every day at HH:MM
    if day == "*" and hour != "*" and hour != "0" and not hour.startswith("*/"):
        try:
            h = int(hour)
            m = int(minute) if minute != "*" else 0
            return f"每天 {h:02d}:{m:02d}"
        except:
            pass
    # Every day at 00:XX
    if hour == "0" and day == "*":
        try:
            m = int(minute)
            return f"每天 00:{m:02d}"
        except:
            pass
    return cron_expr

print(f"{'Repo':<14} {'Workflow file':<35} {'Cron':<25} {'Description'}")
print("-" * 110)

for repo_id, owner_repo, branch, _ in REPOS:
    workflows, err = list_workflows_via_api(owner_repo)
    if err:
        print(f"{repo_id:<14} {'(error)':<35} {'-':<25} {err}")
        continue
    
    if not workflows:
        print(f"{repo_id:<14} {'(no workflows found)':<35} {'-':<25} {'-'}")
        continue
    
    found_any = False
    for wf in workflows[:3]:  # limit to first 3 workflows per repo
        content = get_workflow_content(owner_repo, branch, wf)
        if not content:
            continue
        schedules = extract_schedule(content)
        if not schedules:
            continue
        for s in schedules:
            desc = describe_cron(s)
            wf_short = wf.split("/")[-1]
            print(f"{repo_id:<14} {wf_short:<35} {s:<25} {desc}")
            found_any = True
    if not found_any:
        # Show workflow filenames even if no schedule
        for wf in workflows[:2]:
            wf_short = wf.split("/")[-1]
            print(f"{repo_id:<14} {wf_short:<35} {'(no cron)':<25} {'手动触发 / push 触发'}")
