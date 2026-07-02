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
      var scope = input.closest(".home-layout") || input.closest(".page-wrap") || document;
      var items = Array.prototype.slice.call(scope.querySelectorAll("[data-search-item]"));
      var counter = scope.querySelector("[data-search-count]");

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
          var matches = terms.every(function (term) {
            return haystack.indexOf(term) !== -1;
          });

          item.hidden = !matches;
          item.classList.toggle("is-search-hidden", !matches);
          if (matches) visible += 1;
        });

        setCounter(visible, query);
      }

      input.addEventListener("input", runSearch);
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

      if ("IntersectionObserver" in window) {
        var links = Array.prototype.slice.call(linkWrap.querySelectorAll("a"));

        function setActive(id) {
          links.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
          });
        }

        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setActive(entry.target.id);
            }
          });
        }, {
          rootMargin: "-12% 0px -72% 0px",
          threshold: 0
        });

        headings.forEach(function (heading) {
          observer.observe(heading);
        });
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
