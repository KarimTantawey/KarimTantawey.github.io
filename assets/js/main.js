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

  function init() {
    setupIcons();
    setupAboutDialog();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
