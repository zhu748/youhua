#!/usr/bin/env python3
"""Verify all preset proxy sources."""
import subprocess
import hashlib

SOURCES = [
    ("proxyscrape-all", "https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt"),
    ("TheSpeedX-http", "https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/http.txt"),
    ("TheSpeedX-socks4", "https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks4.txt"),
    ("TheSpeedX-socks5", "https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks5.txt"),
    ("proxifly-http", "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/http/data.txt"),
    ("proxifly-https", "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/https/data.txt"),
    ("proxifly-socks4", "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks4/data.txt"),
    ("proxifly-socks5", "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt"),
    ("monosans-http", "https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/http.txt"),
    ("monosans-socks4", "https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks4.txt"),
    ("monosans-socks5", "https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks5.txt"),
    ("MuRongPIG-http", "https://cdn.jsdelivr.net/gh/MuRongPIG/Proxy-master@main/http.txt"),
    ("MuRongPIG-socks4", "https://cdn.jsdelivr.net/gh/MuRongPIG/Proxy-master@main/socks4.txt"),
    ("MuRongPIG-socks5", "https://cdn.jsdelivr.net/gh/MuRongPIG/Proxy-master@main/socks5.txt"),
    ("hookzof-socks5", "https://cdn.jsdelivr.net/gh/hookzof/socks5_list@master/proxy.txt"),
    ("clarketm-http", "https://cdn.jsdelivr.net/gh/clarketm/proxy-list@master/proxy-list-raw.txt"),
    ("roosterkid-https", "https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/HTTPS_RAW.txt"),
    ("shiftyproxy-http", "https://cdn.jsdelivr.net/gh/ShiftyTR/Proxy-List@master/http.txt"),
    ("shiftyproxy-socks5", "https://cdn.jsdelivr.net/gh/ShiftyTR/Proxy-List@master/socks5.txt"),
]

print(f"{'ID':<22} {'Status':<7} {'Lines':>7} {'Hash':<12} {'Format':<25}")
print("-" * 80)
for sid, url in SOURCES:
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "15", "-o", "-", "-w", "\\n%{http_code}", url],
            capture_output=True, text=True, timeout=20,
        )
        output = result.stdout
        lines = output.rsplit("\n", 1)
        if len(lines) == 2:
            body, code = lines[0], lines[1].strip()
        else:
            body, code = output, "???"
        
        if code == "200":
            body_lines = [l for l in body.split("\n") if l.strip()]
            count = len(body_lines)
            h = hashlib.md5(body.encode()).hexdigest()[:10]
            sample = body_lines[0] if body_lines else ""
            if "://" in sample:
                fmt = "protocol://ip:port"
            elif sample.count(":") == 1:
                fmt = "ip:port"
            elif sample.count(":") == 2:
                fmt = "ip:port:type"
            else:
                fmt = f"unknown: {sample[:30]}"
            print(f"{sid:<22} {code:<7} {count:>7} {h:<12} {fmt:<25}")
        else:
            print(f"{sid:<22} {code:<7} {'-':>7} {'-':<12} {'-':<25}")
    except Exception as e:
        print(f"{sid:<22} ERROR   {'-':>7} {'-':<12} {str(e)[:25]}")
