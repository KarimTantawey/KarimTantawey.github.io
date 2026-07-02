# Karim Tantawy Blog

A GitHub Pages-ready Jekyll blog with a pixel/Minecraft-inspired security style.

## Local Preview

```bash
bundle install
bundle exec jekyll serve --livereload
```

Then open `http://127.0.0.1:4000`.

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
