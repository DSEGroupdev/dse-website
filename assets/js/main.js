/* DSE Group — shared behavior */
(function () {
  // Mobile navigation
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Scroll reveal
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && items.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }
})();

/* GA4: form submission conversion events */
(function () {
  document.querySelectorAll("form.form").forEach(function (form) {
    form.addEventListener("submit", function () {
      if (typeof gtag !== "function") return;
      var subj = form.querySelector('input[name="_subject"]');
      var isDemo = subj && /voice/i.test(subj.value);
      gtag("event", "generate_lead", {
        form_type: isDemo ? "voice_demo" : "contact",
      });
    });
  });
})();
