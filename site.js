/* Shared behaviour for every page. Everything here is an enhancement: the
   Products menu is a <details> element and the section links are plain
   anchors, so the nav works with this file missing. */

// Products menu: close on an outside click or Escape.
const menu = document.querySelector("details.nav-drop");
if (menu) {
  document.addEventListener("click", (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
}

// Cards carry a soft light that follows the pointer (CSS reads --mx / --my).
if (matchMedia("(hover: hover)").matches) {
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".feature, .step, .price-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
}

// Section links in the nav light up as their section passes under the bar.
const sectionLinks = [...document.querySelectorAll('.snav-links > a[href^="#"]')];
const targets = sectionLinks
  .map((link) => [link, document.getElementById(link.getAttribute("href").slice(1))])
  .filter(([, el]) => el);
if (targets.length > 1 && "IntersectionObserver" in window) {
  const visible = new Set();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    const current = targets.find(([, el]) => visible.has(el));
    targets.forEach(([link]) => {
      if (current && link === current[0]) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-20% 0px -65% 0px" });
  targets.forEach(([, el]) => spy.observe(el));
}
