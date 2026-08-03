#!/usr/bin/env python3
"""
DSE Group daily blog publisher.

Usage:
  ANTHROPIC_API_KEY=... python3 automation/generate_post.py "topic of the day"

What it does:
  1. Sends automation/blog-prompt.md + the topic to the model
  2. Renders the returned JSON into a full post page (schema, OG tags, canonical)
  3. Inserts a card at the POSTS:START marker in blog/index.html
  4. Appends the URL to sitemap.xml
Then commit and push; the deploy takes it live.
"""
import json, os, re, sys, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://dsegroup.ai"

def existing_posts():
    return sorted(p.stem for p in (ROOT / "blog" / "posts").glob("*.html"))

def call_model(topic: str, retry_note: str = "") -> dict:
    system = (ROOT / "automation" / "blog-prompt.md").read_text()
    from datetime import date as _d
    today = _d.today()
    user = (
        f"Today is {today.strftime('%A, %B %d, %Y')}.\n"
        f"Topic guidance: {topic}\n"
        f"Already published slugs (NEVER reuse these topics or slugs, pick something new): "
        f"{', '.join(existing_posts())}\n{retry_note}"
    )
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        data=json.dumps({
            "model": "claude-sonnet-4-6",
            "max_tokens": 4000,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }).encode(),
    )
    with urllib.request.urlopen(req) as r:
        text = "".join(b.get("text", "") for b in json.load(r)["content"])
    post = {}
    for field in ("slug", "title", "meta_description", "category", "excerpt", "body"):
        m = re.search(rf"<{field}>(.*?)</{field}>", text, re.S)
        assert m, f"model output missing <{field}> tag"
        post[field] = m.group(1).strip()
    post["body_html"] = post.pop("body")
    joined = json.dumps(post)
    assert "\u2014" not in joined and "\u2013" not in joined, "dash rule violated"
    assert re.fullmatch(r"[a-z0-9-]+", post["slug"]), f"bad slug: {post['slug']}"
    return post

def ping_indexnow(urls) -> None:
    """Best-effort instant-index ping (Bing & friends). Never blocks publishing."""
    try:
        key = (ROOT / "automation" / "indexnow-key.txt").read_text().strip()
        req = urllib.request.Request(
            "https://api.indexnow.org/indexnow",
            headers={"Content-Type": "application/json; charset=utf-8"},
            data=json.dumps({
                "host": "dsegroup.ai",
                "key": key,
                "keyLocation": f"{SITE}/{key}.txt",
                "urlList": urls,
            }).encode(),
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            print(f"indexnow ping: HTTP {r.status}")
    except Exception as e:
        print(f"indexnow ping skipped: {e}")

def render(post: dict, today: str) -> str:
    tpl = (ROOT / "blog" / "posts" / "what-is-an-ai-operating-system.html").read_text()
    # strip the template's article body, keep the page chrome
    tpl = re.sub(r'(<p class="article-meta">.*?</p>).*?(</article>)',
                 r"\1\n\n      BODY_HERE\n    \2", tpl, flags=re.S)
    url = f"{SITE}/blog/posts/{post['slug']}.html"
    swaps = {
        "What is an AI Operating System? | DSE Group Insights": f"{post['title']} | DSE Group Insights",
        "What is an AI Operating System, and why every company will need one": post["title"],
        f"{SITE}/blog/posts/what-is-an-ai-operating-system.html": url,
        "2026-07-17": today,
        "July 17, 2026": date.fromisoformat(today).strftime("%B %-d, %Y"),
        "AI Operating Systems</span>": f"{post['category']}</span>",
        "BODY_HERE": post["body_html"],
    }
    tpl = re.sub(r'<meta name="description" content="[^"]*"',
                 f'<meta name="description" content="{post["meta_description"]}"', tpl)
    tpl = re.sub(r'(<meta property="og:description" content=")[^"]*',
                 r"\g<1>" + post["excerpt"].replace('"', "'"), tpl)
    for a, b in swaps.items():
        tpl = tpl.replace(a, b)
    return tpl

def publish(post: dict) -> None:
    today = date.today().isoformat()
    out = ROOT / "blog" / "posts" / f"{post['slug']}.html"
    assert not out.exists(), f"slug already used: {post['slug']}"
    out.write_text(render(post, today))

    # blog index card
    idx = ROOT / "blog" / "index.html"
    s = idx.read_text()
    card = (f'''<div class="post-grid">
          <a class="card post-card reveal" href="posts/{post['slug']}.html">
            <time datetime="{today}">{date.fromisoformat(today).strftime("%B %-d, %Y")}</time>
            <h3>{post['title']}</h3>
            <p>{post['excerpt']}</p>
          </a>''')
    s = s.replace('<div class="post-grid">', card, 1)
    idx.write_text(s)

    # sitemap
    sm = ROOT / "sitemap.xml"
    entry = f"  <url><loc>{SITE}/blog/posts/{post['slug']}.html</loc><changefreq>yearly</changefreq><priority>0.6</priority></url>\n"
    sm.write_text(sm.read_text().replace("</urlset>", entry + "</urlset>"))
    print(f"published: blog/posts/{post['slug']}.html")
    ping_indexnow([f"{SITE}/blog/posts/{post['slug']}.html", f"{SITE}/blog/"])

if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "pick the next topic from the rotation"
    post = call_model(topic)
    if (ROOT / "blog" / "posts" / f"{post['slug']}.html").exists():
        post = call_model(topic, f"IMPORTANT: your slug '{post['slug']}' is already published. Choose a COMPLETELY DIFFERENT topic and slug.")
    if (ROOT / "blog" / "posts" / f"{post['slug']}.html").exists():
        from datetime import date as _d
        post["slug"] = f"{post['slug']}-{_d.today().strftime('%Y%m%d')}"
    publish(post)
