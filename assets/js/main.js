(function () {
  function setupIcons() {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          "stroke-width": 2,
          "aria-hidden": "true"
        }
      });
    }
  }

  function setupAboutDialog() {
    var dialog = document.getElementById("about-dialog");
    if (!dialog) return;

    var panel = dialog.querySelector(".about-panel");
    var openers = document.querySelectorAll("[data-about-open]");
    var closers = dialog.querySelectorAll("[data-about-close]");
    var lastFocused = null;

    function openDialog() {
      lastFocused = document.activeElement;
      dialog.hidden = false;
      document.body.classList.add("modal-open");
      if (panel) panel.focus();
    }

    function closeDialog() {
      dialog.hidden = true;
      document.body.classList.remove("modal-open");
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    openers.forEach(function (button) {
      button.addEventListener("click", openDialog);
    });

    closers.forEach(function (button) {
      button.addEventListener("click", closeDialog);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !dialog.hidden) {
        closeDialog();
      }
    });
  }

  function setupPostSearch() {
    var inputs = document.querySelectorAll("[data-post-search]");
    if (!inputs.length) return;

    inputs.forEach(function (input) {
      var scope = input.closest("[data-search-scope]") || input.closest(".home-layout") || input.closest(".page-wrap") || document;
      var items = Array.prototype.slice.call(scope.querySelectorAll("[data-search-item]"));
      var counter = scope.querySelector("[data-search-count]");
      var empty = scope.querySelector("[data-search-empty]");

      if (!items.length) return;

      function setCounter(visible, query) {
        if (!counter) return;

        var label = visible === 1 ? "post" : "posts";
        counter.textContent = query ? visible + " matching " + label : visible + " " + label + " available";
      }

      function runSearch() {
        var query = input.value.trim().toLowerCase();
        var terms = query ? query.split(/\s+/).filter(Boolean) : [];
        var visible = 0;

        items.forEach(function (item) {
          var haystack = ((item.dataset.searchText || "") + " " + item.textContent).toLowerCase();
          var matches = !terms.length || terms.every(function (term) {
            return haystack.indexOf(term) !== -1;
          });

          item.hidden = !matches;
          item.classList.toggle("is-search-hidden", !matches);
          if (matches) visible += 1;
        });

        if (empty) {
          empty.hidden = !query || visible > 0;
        }

        setCounter(visible, query);
      }

      input.addEventListener("input", runSearch);
      input.addEventListener("search", runSearch);

      if (window.location.hash.indexOf("#tag-") === 0 && input.id === "archive-post-search") {
        input.value = decodeURIComponent(window.location.hash.replace("#tag-", ""));
      }

      runSearch();
    });
  }

  function setupSectionNav() {
    var navs = document.querySelectorAll("[data-section-nav]");
    if (!navs.length) return;

    function slugify(value) {
      return value
        .toLowerCase()
        .trim()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";
    }

    navs.forEach(function (nav) {
      var article = nav.parentElement ? nav.parentElement.querySelector(".article-prose") : document.querySelector(".article-prose");
      var linkWrap = nav.querySelector("[data-section-links]");
      if (!article || !linkWrap) return;

      var headings = Array.prototype.slice.call(article.querySelectorAll("h2, h3"));
      if (!headings.length) return;

      headings.forEach(function (heading) {
        if (!heading.id) {
          var base = slugify(heading.textContent);
          var id = base;
          var index = 2;

          while (document.getElementById(id)) {
            id = base + "-" + index;
            index += 1;
          }

          heading.id = id;
        }

        var link = document.createElement("a");
        link.href = "#" + heading.id;
        link.textContent = heading.textContent;
        link.className = heading.tagName === "H3" ? "section-link depth-3" : "section-link";
        linkWrap.appendChild(link);
      });

      nav.hidden = false;

      var links = Array.prototype.slice.call(linkWrap.querySelectorAll("a"));
      var ticking = false;

      function setActive(id) {
        links.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
        });
      }

      function currentHeadingId() {
        var marker = window.scrollY + Math.max(120, window.innerHeight * 0.2);
        var current = headings[0].id;

        headings.forEach(function (heading) {
          if (heading.offsetTop <= marker) {
            current = heading.id;
          }
        });

        return current;
      }

      function updateActive() {
        setActive(currentHeadingId());
        ticking = false;
      }

      function requestActiveUpdate() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateActive);
      }

      function scrollToHashSection() {
        if (!window.location.hash) return false;

        var id = decodeURIComponent(window.location.hash.slice(1));
        var target = headings.find(function (heading) {
          return heading.id === id;
        });

        if (!target) return false;

        target.scrollIntoView();
        setActive(id);
        return true;
      }

      links.forEach(function (link) {
        link.addEventListener("click", function () {
          var id = link.getAttribute("href").slice(1);
          setActive(id);
        });
      });

      window.addEventListener("scroll", requestActiveUpdate, { passive: true });
      window.addEventListener("resize", requestActiveUpdate);
      window.addEventListener("hashchange", function () {
        if (!scrollToHashSection()) {
          requestActiveUpdate();
        }
      });

      if (!scrollToHashSection()) {
        setActive(currentHeadingId());
      }
    });
  }

  function init() {
    setupIcons();
    setupAboutDialog();
    setupPostSearch();
    setupSectionNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
