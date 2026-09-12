# Marco Blog

A GitHub Pages-ready Jekyll blog for security research and CTF writeups, with responsive layouts and client-side post search.

## Local Preview

```bash
bundle install
bundle exec jekyll serve --host 0.0.0.0 --port 34567
```

Then open `http://localhost:34567`. Jekyll watches local changes; refresh the page to see them.

## Saved Designs

The first dark redesign is saved locally on branch `checkpoint/blog-v1`, commit `7bab102`. The paper-and-ink revision is on `redesign/editorial-blog`. These branches have not been pushed.

Search lives in the posts archive. The homepage shows the six most recent posts.

Dark mode is the default. The header toggle switches to light mode and remembers the reader’s choice in their browser.

## Add a Post

Create a new Markdown file in `_posts/` using this format:

```markdown
---
title: "Post Title"
date: 2026-07-02 12:00:00 +0000
tags: [web, pentest]
read_time: "4 min read"
excerpt: "Short summary for the homepage."
---

Write your post here.
```

The filename must start with a date:

```text
_posts/YYYY-MM-DD-post-title.md
```

## Add Images, GIFs, Links, and Code

Put media for each post in its own folder:

```text
assets/posts/my-post/image.png
assets/posts/my-post/demo.gif
```

Use this in a post:

````markdown
![Image alt text]({{ '/assets/posts/my-post/image.png' | relative_url }})

![GIF alt text]({{ '/assets/posts/my-post/demo.gif' | relative_url }})

[Link text](https://example.com)

```js
console.log("code block");
```
````

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Push this folder to the repository.
3. In GitHub, open `Settings > Pages`.
4. Set `Build and deployment` to `GitHub Actions`.
5. Push to `main` or `master`.

If the repository is named `USERNAME.github.io`, the site will be available at:

```text
https://USERNAME.github.io
```

If the repository has another name, for example `blog`, set this in `_config.yml`:

```yaml
baseurl: "/blog"
url: "https://karimtantawey.github.io"
```

Then the site will be available at:

```text
https://USERNAME.github.io/blog
```

## CV

The CV is stored at:

```text
assets/cv/Karim_Tantawy_CV_Pentester.pdf
```
