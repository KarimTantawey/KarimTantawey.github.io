(function () {
  function setupThemeToggle() {
    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;

    function applyTheme(theme) {
      document.documentElement.dataset.theme = theme;
      var label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
      document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#1b1e1c" : "#f5f2eb";
    }

    applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      var theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      try {
        localStorage.setItem("theme", theme);
      } catch (error) {
        // Theme switching still works when browser storage is unavailable.
      }
    });
  }

  function setupPostSearch() {
    var scopes = document.querySelectorAll("[data-search-scope]");

    scopes.forEach(function (scope) {
      var input = scope.querySelector("[data-post-search]");
      var items = Array.from(scope.querySelectorAll("[data-search-item]"));
      var counter = scope.querySelector("[data-search-count]");
      var empty = scope.querySelector("[data-search-empty]");

      if (!input || !items.length) return;

      var searchableItems = items.map(function (item) {
        return {
          element: item,
          text: (item.textContent + " " + (item.getAttribute("data-search-text") || "")).toLowerCase()
        };
      });

      function setCounter(visible, query) {
        if (!counter) return;

        var label = visible === 1 ? "post" : "posts";
        counter.textContent = query ? visible + " matching " + label : visible + " " + label + " available";
      }

      function runSearch() {
        var query = input.value.trim().toLowerCase();
        var terms = query ? query.split(/\s+/).filter(Boolean) : [];
        var visible = 0;

        searchableItems.forEach(function (searchableItem) {
          var matches = !terms.length || terms.every(function (term) {
            return searchableItem.text.indexOf(term) !== -1;
          });

          searchableItem.element.hidden = !matches;
          if (matches) visible += 1;
        });

        if (empty) {
          empty.hidden = !query || visible > 0;
        }

        setCounter(visible, query);
      }

      input.addEventListener("input", runSearch);
      input.addEventListener("search", runSearch);

      function tagFromHash(hash) {
        if (hash.indexOf("#tag-") !== 0) return null;

        try {
          return decodeURIComponent(hash.slice(5));
        } catch (error) {
          return undefined;
        }
      }

      function syncArchiveSearch() {
        var tag = tagFromHash(window.location.hash);
        if (tag !== undefined) input.value = tag || "";
        runSearch();
      }

      if (input.id === "archive-post-search") {
        syncArchiveSearch();
        window.addEventListener("hashchange", syncArchiveSearch);
        scope.addEventListener("click", function (event) {
          var tagLink = event.target.closest("a[href*='#tag-']");
          if (tagLink && tagLink.hash === window.location.hash) {
            syncArchiveSearch();
          }
        });
      } else {
        runSearch();
      }
    });
  }

  function setupSectionNav() {
    var navs = document.querySelectorAll("[data-section-nav]");
    navs.forEach(function (nav) {
      var article = nav.parentElement.querySelector(".article-prose");
      var linkWrap = nav.querySelector("[data-section-links]");
      if (!article || !linkWrap) return;

      var headings = Array.from(article.querySelectorAll("h2[id], h3[id]"));
      if (!headings.length) return;

      headings.forEach(function (heading) {
        var link = document.createElement("a");
        link.href = "#" + heading.id;
        link.textContent = heading.textContent;
        link.className = heading.tagName === "H3" ? "section-link depth-3" : "section-link";
        linkWrap.appendChild(link);
      });

      nav.hidden = false;

      var links = Array.from(linkWrap.querySelectorAll("a"));
      var ticking = false;

      function setActive(id) {
        links.forEach(function (link) {
          var active = link.getAttribute("href") === "#" + id;
          if (active) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      }

      function currentHeadingId() {
        var marker = Math.max(96, Math.min(window.innerHeight * 0.3, 220));
        var current = headings[0].id;

        headings.forEach(function (heading) {
          if (heading.getBoundingClientRect().top <= marker) {
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

      window.addEventListener("scroll", requestActiveUpdate, { passive: true });
      window.addEventListener("resize", requestActiveUpdate);
      window.addEventListener("hashchange", requestActiveUpdate);

      setActive(currentHeadingId());
    });
  }

  setupThemeToggle();
  setupPostSearch();
  setupSectionNav();
})();
