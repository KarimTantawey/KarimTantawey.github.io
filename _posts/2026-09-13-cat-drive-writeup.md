---
title: 'CATF 26: CAT Drive, XSS on another subdomain'
date: 2026-09-13 08:00:00 +0000
tags: [ctf, web, cookie-tossing, xss, waf_bypass]
read_time: "6 min read"
excerpt: "I created CAT Drive for CAT CTF 26. This is the challenge writeup, covering XSS on another subdomain and cookie tossing."
---

I created CAT Drive for CAT CTF 26. This is the challenge writeup, covering XSS on another subdomain and cookie tossing.

## 0. First look

The challenge hands you a single URL and nothing else.
page, no "click here for the flag". Just a clean file-storage product called
Cat Drive with register/login buttons.
It also says `Note: the admin bot doesn't trust you so it checks on it's files to see if you stole them.`

![test]({{ '/assets/posts/cat-drive/challenge.png' | relative_url }}){: width="395" height="468" loading="lazy" decoding="async" }

With zero information, the only move is mapping the
surface. So you register an account and open every page You could reach:
dashboard, upload, submit, vault, vault items, vault history. You shouldn't be looking
for the flag yet.

## 1. Spotting the firewall

While checking the requests in burpsuite something should catch your eye: the firewall in the header



```http
X-WAF: ModSecurity v3.0.16 (Linux); connector=ModSecurity-nginx v1.0.4; ruleset=OWASP_CRS/3.3.10
```

That tells us exactly what's in front of the app: a ModSecurity WAF running
the OWASP Core Rule Set. Not some vague "firewall", the header names the
engine, the connector, and the ruleset version. **Why this matters:** every
request I send, especially uploads, has to survive that layer.

When you try to upload a file you'll see you can only upload .txt and some image filetypes, otherwise the firewall blocks you.


## 2. Getting HTML hosted (the firewall bypass)

The upload page is picky, and it says so right on the tin: *"Add an image or
text document to your workspace."* The file picker only offers images and
`.txt`. And when you try a plain `.html` upload anyway, the WAF answers
loudly:

![test]({{ '/assets/posts/cat-drive/upload-blocked.png' | relative_url }}){: width="860" height="380" loading="lazy" decoding="async" }

```
403 Blocked by upload WAF: only image and text files are allowed
```

So the filter lives in the WAF layer, validating the uploaded filename, and
the app itself will happily store whatever gets past it. I needed a way to
show the WAF one filename while the backend stored another.

I'm not going to detail that part here. The bypass is from my private
research into that WAF's upload handling, it has not been fixed upstream yet,
and I'm not publishing the technique for now. What matters for this writeup:
right after the 403 above, the *same* upload flow returned a stored URL ending
in `.html` on `files.b4nk4.tech`, served back as `text/html`, scripts and all.




**Why HTML specifically:** I needed JavaScript executing on a subdomain of the
app's own domain. Plain file storage is useless to me; a page that runs *my*
code on `*.b4nk4.tech` is everything. That single capability is the foothold
for the whole chain.

## 3. The idea: make the admin betray me (in a good way)

The submit page lets me hand any link to an "admin bot" that will visit it.
Remember from the note at the description the admin checks on his vault after visiting my link And the vault
history page shows me something interesting about the design: **every time a
vault item is opened, the item's title and document link are recorded in the
opening account's history.**



So the question becomes: can I get the admin to open *their* item in a way
that records it into *my* history?

The answer is cookies, specifically, a trick browsers have allowed forever:

```js
document.cookie = "session=<MY_SESSION_ID>; Domain=b4nk4.tech; Path=/vault/open; SameSite=Lax; Secure";
```

A page on `files.b4nk4.tech` is allowed to set a cookie for its parent domain
`b4nk4.tech`. The `Path=/vault/open` part is the trick: that cookie is only
ever sent to URLs under `/vault/open/...`. Everywhere else the admin keeps
their real session and everything looks normal.



**Why the path matters:** if I'd scoped it to `/`, the admin's session would
break everywhere and the bot's routine would collapse. Scoped to
`/vault/open`, the confusion exists on exactly one route, the route where
vault items get opened.

## 4. Why it works: cookie order

When the bot opens `https://catdrive.b4nk4.tech/vault/open/<item-id>`, the
browser sends **both** session cookies. Browsers order cookies by path
specificity, longest path first, so mine goes first:

```
Cookie: session=<attacker, Path=/vault/open>; session=<admin, Path=/>
```

The app reads the raw header and takes the **first** `session` value it sees.
So on this one route, the admin's click is authenticated as *me*. The item
opens fine (it's fetched by its ID, no ownership check), and the open event —
title plus the secret document link — gets written into **my** vault history.


## 5. Collecting the flag

The leaked link looks like this:

```
https://files.b4nk4.tech/files/<uuid-v4>.txt
```

Unguessable filename, brute force was never an option, which is exactly why
the whole chain exists. One GET later:

![test]({{ '/assets/posts/cat-drive/vault-history.png' | relative_url }}){: width="1147" height="309" loading="lazy" decoding="async" }
![test]({{ '/assets/posts/cat-drive/flag.png' | relative_url }}){: width="791" height="186" loading="lazy" decoding="async" }

```
CATF{WH4444444444444447_BU7_7H3_F1L35_W3R3_N0T_0N_7H3_S4M3_D0M4IN}
```

## 6. The full chain, start to finish

1. Register on `catdrive.b4nk4.tech`, log in, copy my `session` cookie value.
2. Write the tossing payload (step 3), smuggle it through the upload WAF, get the `files.b4nk4.tech/uploads/…` URL.
3. Submit that URL to the admin bot.
4. Wait for the job to finish (about 20–40 seconds, watch the step badge).
5. Open my vault history, the "Flag backup" entry with the file link is there.
6. Fetch the link. Get flag.
