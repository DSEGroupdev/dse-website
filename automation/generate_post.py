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

def call_model(topic: str) -> dict:
    system = (ROOT / "automation" / "blog-prompt.md").read_text()
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
            "messages": [{"role": "user", "content": f"Today's topic: {topic}"}],
        }).encode(),
    )
    with urllib.request.urlopen(req) as r:
        text = "".join(b.get("text", "") for b in json.load(r)["content"])
    text = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.M).strip()
    post = json.loads(text)
    for field in ("slug", "title", "meta_description", "category", "excerpt", "body_html"):
        assert post.get(field), f"model output missing {field}"
    assert "\u2014" not in json.dumps(post) and "\u2013" not in json.dumps(post), "dash rule violated"
    return post

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

if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "pick the next topic from the rotation"
    publish(call_model(topic))
