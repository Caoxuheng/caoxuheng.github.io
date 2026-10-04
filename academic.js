(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".nav");
  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  const buttons = [...document.querySelectorAll(".filter-button")];
  const publications = [...document.querySelectorAll(".publication")];
  const count = document.querySelector(".publication-count");
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      let visible = 0;
      publications.forEach(item => {
        const show = filter === "all" || item.dataset.year === filter;
        item.hidden = !show;
        if (show) visible += 1;
      });
      if (count) count.textContent = `${visible} record${visible === 1 ? "" : "s"}`;
    });
  });

  const navLinks = [...document.querySelectorAll(".nav a[href^='#']")];
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      const active = entries
        .filter(entry => entry.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      navLinks.forEach(link => {
        if (link.getAttribute("href") === `#${active.target.id}`) {
          link.setAttribute("aria-current","page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }, {rootMargin:"-25% 0px -65%", threshold:[0,.2,.5]});
    sections.forEach(section => observer.observe(section));
  }
})();