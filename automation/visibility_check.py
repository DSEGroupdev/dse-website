#!/usr/bin/env python3
"""
DSE Group LLM visibility check.

Runs the questions real buyers ask through Claude with live web search and
records whether DSE Group / dsegroup.ai shows up in the answer. Writes a
dated report to automation/visibility/ so results compare month over month.

Usage:
  ANTHROPIC_API_KEY=... python3 automation/visibility_check.py
"""
import json, os, re, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "automation" / "visibility"
OUT.mkdir(exist_ok=True)

QUERIES = [
    ("Brand",       "What is DSE Group in Encinitas California and what do they do?"),
    ("Local",       "Best AI consulting companies in San Diego"),
    ("Voice",       "Who builds AI phone agents for dental offices in San Diego?"),
    ("Voice",       "AI voice agent agency for restaurants and home services businesses"),
    ("Sales agent", "AI sales agent for my online store, which company should I hire?"),
    ("CORE",        "Company that optimizes how business teams use ChatGPT and Claude"),
    ("CORE",        "AI enablement consulting San Diego"),
    ("AI OS",       "Who builds AI Operating Systems or digital brains for companies?"),
    ("AI OS",       "AI second brain for founders, who can build one?"),
    ("Employees",   "Digital AI employee provider for small businesses"),
]

def ask(question: str) -> tuple[bool, str]:
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        data=json.dumps({
            "model": "claude-sonnet-4-6",
            "max_tokens": 700,
            "messages": [{"role": "user", "content": question}],
            "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
        }).encode(),
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        raw = r.read().decode()
    data = json.loads(raw)
    text = " ".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    mentioned = bool(re.search(r"dse\s*group|dsegroup\.ai", raw, re.I))
    return mentioned, text[:400]


def email_report(subject: str, body: str) -> None:
    """Email the report via FormSubmit (same relay as the site forms). Best-effort."""
    try:
        req = urllib.request.Request(
            "https://formsubmit.co/ajax/dan@dsegroupae.com",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            data=json.dumps({
                "_subject": subject,
                "name": "DSE Visibility Bot",
                "message": body,
            }).encode(),
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"report emailed to dan@dsegroupae.com: HTTP {r.status}")
    except Exception as e:
        print(f"email failed (report still saved): {e}")

def main():
    today = date.today().isoformat()
    lines = [f"# LLM Visibility Report: {today}", ""]
    hits = 0
    for pillar, q in QUERIES:
        try:
            mentioned, snippet = ask(q)
        except Exception as e:
            lines += [f"## [{pillar}] {q}", f"ERROR: {e}", ""]
            print(f"ERR  [{pillar}] {q} ({e})")
            continue
        hits += mentioned
        mark = "MENTIONED" if mentioned else "absent"
        print(f"{'HIT ' if mentioned else '     '}[{pillar}] {q} -> {mark}")
        lines += [f"## [{pillar}] {q}", f"Result: {mark}", f"Answer excerpt: {snippet}", ""]
    lines.insert(2, f"**Score: {hits}/{len(QUERIES)} answers mention DSE Group**")
    lines.insert(3, "")
    report = "\n".join(lines)
    (OUT / f"{today}.md").write_text(report)
    print(f"\nScore: {hits}/{len(QUERIES)}  |  report: automation/visibility/{today}.md")
    email_report(f"DSE LLM Visibility Report {today}: {hits}/{len(QUERIES)}", report)

if __name__ == "__main__":
    main()
