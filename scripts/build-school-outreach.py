"""
Build EMS school outreach drafts + one-click Gmail/mailto send page.
Cannot deliver mail without Resend (verified domain) or the user's mail client.
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import http.cookiejar
from pathlib import Path

SITE = "https://prince-george-transport.pages.dev"
PIN = "7429"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
OUT = Path(r"C:\Users\User\Downloads\pgt-school-outreach")


def api(jar, method, path, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        SITE + path,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": UA},
        method=method,
    )
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    with opener.open(req, timeout=120) as res:
        return json.loads(res.read().decode("utf-8"))


def parse_template(text: str):
    subject = ""
    body = text
    m = re.match(r"Subject:\s*(.+)\n\n([\s\S]*)", text)
    if m:
        subject = m.group(1).strip()
        body = m.group(2).strip()
    return subject, body


def mailto_url(to: str, subject: str, body: str) -> str:
    return "mailto:" + urllib.parse.quote(to, safe="@") + "?" + urllib.parse.urlencode(
        {"subject": subject, "body": body}, quote_via=urllib.parse.quote
    )


def gmail_url(to: str, subject: str, body: str) -> str:
    return "https://mail.google.com/mail/?view=cm&fs=1&" + urllib.parse.urlencode(
        {"to": to, "su": subject, "body": body}
    )


def write_eml(path: Path, to: str, subject: str, body: str):
    # Simple ASCII-safe .eml for double-click open
    content = (
        f"To: {to}\r\n"
        f"Subject: {subject}\r\n"
        f"MIME-Version: 1.0\r\n"
        f"Content-Type: text/plain; charset=utf-8\r\n"
        f"\r\n"
        f"{body}\r\n"
    )
    path.write_text(content, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jar = http.cookiejar.CookieJar()
    api(jar, "POST", "/api/admin/login", {"pin": PIN})
    # Deploy may lag — build drafts from marketing API after deploy; fallback generate locally
    try:
        data = api(jar, "GET", "/api/admin/marketing")
        leads = data["leads"]
    except Exception:
        # Use live inventory + local lead logic won't work easily — require deploy
        raise

    sent_ready = []
    call_only = []

    cards = []
    for lead in sorted(leads, key=lambda x: x.get("priority") or 99):
        emails = [e for e in [lead.get("email"), lead.get("altEmail")] if e]
        subject, body = parse_template(lead["emailTemplate"])
        if not emails:
            call_only.append(lead)
            continue

        primary = emails[0]
        cc = emails[1] if len(emails) > 1 else ""
        safe = re.sub(r"[^a-z0-9]+", "-", lead["id"])
        eml_path = OUT / f"{safe}.eml"
        write_eml(eml_path, primary if not cc else f"{primary}, {cc}", subject, body)
        (OUT / f"{safe}.txt").write_text(f"To: {', '.join(emails)}\nSubject: {subject}\n\n{body}\n", encoding="utf-8")

        gmail = gmail_url(primary, subject, body)
        mailto = mailto_url(primary, subject, body)
        sent_ready.append({"lead": lead, "gmail": gmail, "mailto": mailto, "eml": str(eml_path)})

        cards.append(
            f"""
            <div class="card">
              <h2>{esc(lead['name'])}</h2>
              <p class="meta">{esc(lead.get('city',''))} · {esc(lead.get('distance',''))} · Priority {lead.get('priority','—')}</p>
              <p><strong>To:</strong> {esc(', '.join(emails))}</p>
              <p><strong>Subject:</strong> {esc(subject)}</p>
              <pre>{esc(body)}</pre>
              <p class="actions">
                <a class="btn" href="{esc(gmail)}" target="_blank" rel="noopener">Open in Gmail → Send</a>
                <a class="btn secondary" href="{esc(mailto)}">Open in mail app</a>
              </p>
            </div>"""
        )

    call_html = "".join(
        f"<li><strong>{esc(l['name'])}</strong> — call {esc(l.get('phone') or 'n/a')} "
        f"(<a href=\"{esc(l.get('url') or '#')}\" target=\"_blank\">website</a>)</li>"
        for l in call_only
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PGT School Outreach — Send Emails</title>
  <style>
    body {{ font-family: Georgia, serif; max-width: 880px; margin: 2rem auto; padding: 0 1rem; background:#f7f5f0; color:#1a1a1a; }}
    h1 {{ font-size: 1.75rem; }}
    .note {{ background:#fff3cd; border:1px solid #e6d89c; padding:1rem; border-radius:8px; margin:1rem 0; }}
    .card {{ background:white; border:1px solid #ddd; border-radius:10px; padding:1.25rem; margin:1.25rem 0; }}
    pre {{ white-space:pre-wrap; background:#f4f4f4; padding:1rem; border-radius:6px; font-size:0.9rem; }}
    .btn {{ display:inline-block; background:#1c3d5a; color:white !important; text-decoration:none; padding:0.6rem 1rem; border-radius:6px; margin-right:0.5rem; }}
    .btn.secondary {{ background:#555; }}
    .meta {{ color:#666; font-size:0.9rem; }}
  </style>
</head>
<body>
  <h1>EMS school outreach — ready to send</h1>
  <p>Prince George Transport surplus inventory:<br>
  <a href="https://prince-george-transport.pages.dev/supplies">https://prince-george-transport.pages.dev/supplies</a></p>
  <div class="note">
    <strong>How to send:</strong> Click <em>Open in Gmail → Send</em> for each school (you must click Send in Gmail).
    Or open the <code>.eml</code> files in <code>{OUT}</code> with Outlook/Mail.
    Automated sending needs a Resend API key + verified sending domain.
  </div>
  <p><strong>{len(sent_ready)}</strong> emails ready · <strong>{len(call_only)}</strong> call-only (no public email)</p>
  {''.join(cards)}
  <h2>Call these (no public email)</h2>
  <ul>{call_html or '<li>None</li>'}</ul>
</body>
</html>"""
    index = OUT / "SEND-THESE.html"
    index.write_text(html, encoding="utf-8")
    manifest = {
        "ready": len(sent_ready),
        "callOnly": len(call_only),
        "folder": str(OUT),
        "index": str(index),
        "recipients": [
            {"name": x["lead"]["name"], "email": x["lead"].get("email"), "gmail": x["gmail"]}
            for x in sent_ready
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


if __name__ == "__main__":
    main()
