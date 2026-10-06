const header = document.querySelector("[data-site-header]");
const toggle = header?.querySelector(".nav-toggle");
const nav = header?.querySelector("[data-site-nav]");
if (header && toggle && nav) {
 const measureHeader = () => document.documentElement.style.setProperty("--header-offset", `${header.getBoundingClientRect().height}px`);
 measureHeader();
 if ("ResizeObserver" in window) new ResizeObserver(measureHeader).observe(header);
 else window.addEventListener("resize", measureHeader, { passive: true });
 const homeLink = nav.querySelector('a[href="index.html"]');
 const membershipLink = nav.querySelector('a[href="index.html#mitgliedschaft"]');
 const updateHomeLocation = () => {
  if (document.body.dataset.page !== "index" || !homeLink || !membershipLink) return;
  if (location.hash === "#mitgliedschaft") {
   homeLink.removeAttribute("aria-current");
   membershipLink.setAttribute("aria-current", "location");
  } else {
   homeLink.setAttribute("aria-current", "page");
   membershipLink.removeAttribute("aria-current");
  }
 };
 updateHomeLocation();
 window.addEventListener("hashchange", updateHomeLocation);
 const updateHeaderState = () => header.classList.toggle("is-scrolled", window.scrollY > 16);
 updateHeaderState();
 window.addEventListener("scroll", updateHeaderState, { passive: true });
 const mobile = window.matchMedia("(max-width: 900px)");
 function setNavigationOpen(open, restoreFocus = false) {
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Men\u00fc schlie\u00dfen" : "Men\u00fc \u00f6ffnen");
  nav.classList.toggle("open", open);
  document.body.classList.toggle("navigation-open", open && mobile.matches);
  if (restoreFocus) toggle.focus();
  else if (open && mobile.matches) nav.querySelector("a")?.focus();
 }
 header.classList.add("nav-enhanced");
 toggle.addEventListener("click", () => {
  setNavigationOpen(toggle.getAttribute("aria-expanded") !== "true");
 });
 nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => setNavigationOpen(false));
 });
 document.addEventListener("keydown", event => {
  if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
   setNavigationOpen(false, true);
   return;
  }
  if (event.key === "Tab" && mobile.matches && toggle.getAttribute("aria-expanded") === "true") {
   const focusable = [toggle, ...nav.querySelectorAll("a[href]:not([tabindex='-1'])")];
   const first = focusable[0];
   const last = focusable[focusable.length - 1];
   if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
   } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
   }
  }
 });
 document.addEventListener("click", event => {
  if (!header.contains(event.target) && toggle.getAttribute("aria-expanded") === "true") {
   setNavigationOpen(false, nav.contains(document.activeElement));
  }
 });
 document.addEventListener("focusin", event => {
  if (!header.contains(event.target)) setNavigationOpen(false);
 });
 mobile.addEventListener("change", () => {
  const focusWasInNav = nav.contains(document.activeElement);
  setNavigationOpen(false);
  if (mobile.matches && focusWasInNav) toggle.focus();
 });
}
const courseTabs=document.querySelectorAll("[data-course-tab]");
const courseItems=document.querySelectorAll("[data-course-category]");
function showCourseCategory(category){
 courseTabs.forEach(b=>b.classList.toggle("active",b.dataset.courseTab===category));
 courseItems.forEach(el=>{el.hidden=el.dataset.courseCategory!==category;});
}
if(courseTabs.length){courseTabs.forEach(b=>b.addEventListener("click",()=>showCourseCategory(b.dataset.courseTab)));showCourseCategory("kraft");}

document.querySelectorAll("[data-review-carousel]").forEach(carousel => {
 const viewport = carousel.querySelector("[data-review-viewport]");
 const track = carousel.querySelector("[data-review-track]");
 const controls = carousel.querySelector("[data-review-controls]");
 const dotsContainer = carousel.querySelector("[data-review-dots]");
 const position = carousel.querySelector("[data-review-position]");
 const previous = carousel.querySelector("[data-review-previous]");
 const next = carousel.querySelector("[data-review-next]");
 const slides = [...(track?.querySelectorAll(".review-quote") || [])];
 if (!viewport || !track || !controls || !dotsContainer || !position || !previous || !next || !slides.length) return;

 let currentIndex = 0;
 let visibleCount = 0;
 let pages = [];
 let scrollFrame = 0;
 const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
 const pageOffset = index => pages[index].offsetLeft - pages[0].offsetLeft;

 function buildPages() {
  pages = [];
  for (let start = 0; start < slides.length; start += visibleCount) {
   const page = document.createElement("div");
   page.className = "review-page";
   page.setAttribute("role", "group");
   page.setAttribute("aria-roledescription", "Karussellseite");
   page.setAttribute("aria-label", `Bewertungen ${start + 1} bis ${Math.min(start + visibleCount, slides.length)} von ${slides.length}`);
   page.append(...slides.slice(start, start + visibleCount));
   pages.push(page);
  }
  track.replaceChildren(...pages);
 }

 function renderDots() {
  dotsContainer.replaceChildren(...pages.map((_, index) => {
   const dot = document.createElement("button");
   dot.className = "review-dot";
   dot.type = "button";
   dot.setAttribute("aria-label", `Bewertungen ab ${slides[index * visibleCount].querySelector("cite").textContent} anzeigen`);
   dot.addEventListener("click", () => moveTo(index));
   return dot;
  }));
 }

 function setActivePageHeight() {
  if (!pages[currentIndex]) return;
  const height = `${Math.ceil(pages[currentIndex].getBoundingClientRect().height + 14)}px`;
  viewport.style.height = height;
  track.style.height = height;
 }

 function updateState(announce = true) {
  const previousIndex = currentIndex;
  const nearest = pages.reduce((best, page, index) => {
   const distance = Math.abs(viewport.scrollLeft - pageOffset(index));
   return distance < best.distance ? { index, distance } : best;
  }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;
  currentIndex = nearest;
  previous.disabled = currentIndex === 0;
  next.disabled = currentIndex === pages.length - 1;
  [...dotsContainer.children].forEach((dot, index) => {
   if (index === currentIndex) dot.setAttribute("aria-current", "true");
   else dot.removeAttribute("aria-current");
  });
  if (announce && currentIndex !== previousIndex) {
   const start = currentIndex * visibleCount;
   position.textContent = `Bewertungen ${start + 1} bis ${Math.min(start + visibleCount, slides.length)} von ${slides.length}`;
  }
  setActivePageHeight();
 }

 function moveTo(index) {
  currentIndex = Math.max(0, Math.min(index, pages.length - 1));
  viewport.scrollTo({
   left: pageOffset(currentIndex),
   behavior: reducedMotion.matches ? "auto" : "smooth"
  });
  updateState(false);
  const start = currentIndex * visibleCount;
  position.textContent = `Bewertungen ${start + 1} bis ${Math.min(start + visibleCount, slides.length)} von ${slides.length}`;
 }

 function measure() {
  const configuredVisible = Number.parseInt(getComputedStyle(carousel).getPropertyValue("--review-visible"), 10);
  const nextVisibleCount = Math.max(1, Math.min(configuredVisible || 1, slides.length));
  if (nextVisibleCount === visibleCount) {
   setActivePageHeight();
   return;
  }
  const firstVisibleSlide = currentIndex * visibleCount;
  visibleCount = nextVisibleCount;
  buildPages();
  currentIndex = Math.min(Math.floor(firstVisibleSlide / visibleCount), pages.length - 1);
  renderDots();
  moveTo(currentIndex);
  updateState(false);
 }

 previous.addEventListener("click", () => moveTo(currentIndex - 1));
 next.addEventListener("click", () => moveTo(currentIndex + 1));
 viewport.addEventListener("keydown", event => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  moveTo(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
 });
 viewport.addEventListener("scroll", () => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(() => {
   scrollFrame = 0;
   updateState();
  });
 }, { passive: true });
 carousel.dataset.enhanced = "true";
 controls.hidden = false;
 measure();
 if ("ResizeObserver" in window) new ResizeObserver(measure).observe(viewport);
 else window.addEventListener("resize", measure, { passive: true });
});

const courseJumps = document.querySelector(".course-jumps");
if (courseJumps && "IntersectionObserver" in window) {
 const links = [...courseJumps.querySelectorAll('a[href^="#"]')];
 const targets = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
 const updateCurrentCourse = entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
  if (!visible.length) return;
  const currentId = visible[0].target.id;
  links.forEach(link => {
   if (link.hash === `#${currentId}`) link.setAttribute("aria-current", "location");
   else link.removeAttribute("aria-current");
  });
 };
 const courseObserver = new IntersectionObserver(updateCurrentCourse, {
  rootMargin: "-112px 0px -68% 0px",
  threshold: 0
 });
 targets.forEach(target => courseObserver.observe(target));
}

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
 const submit = contactForm.querySelector('button[type="submit"]');
 const status = contactForm.querySelector(".contact-status");
 const fields = [...contactForm.querySelectorAll("[required]")];
 const pages = { "index.html": "Home", "fitness.html": "Fitness", "wellness.html": "Wellness", "health.html": "Health", "kurse.html": "Kurse", "kontakt.html": "Kontakt" };
 let sourcePage = "Kontakt";
 if (document.referrer) {
  const referrer = new URL(document.referrer);
  if (referrer.origin === location.origin) {
   const filename = referrer.pathname.split("/").pop() || "index.html";
   sourcePage = pages[filename.endsWith(".html") ? filename : filename + ".html"] || "Kontakt";
  }
 }
 const contextUrl = new URL(location.href);
 const cleanPageUrl = value => {
  if (!value) return null;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) return null;
  return url.origin + url.pathname;
 };
 const attribution = {
  leadSource: null, leadSourceDetail: null,
  utmSource: contextUrl.searchParams.get("utm_source"),
  utmMedium: contextUrl.searchParams.get("utm_medium"),
  utmCampaign: contextUrl.searchParams.get("utm_campaign"),
  utmContent: contextUrl.searchParams.get("utm_content"),
  utmTerm: contextUrl.searchParams.get("utm_term"),
  landingPage: cleanPageUrl(location.href), referrer: cleanPageUrl(document.referrer),
  gclid: contextUrl.searchParams.get("gclid"), fbclid: contextUrl.searchParams.get("fbclid")
 };
 let pendingSubmission = null;
 const setStatus = message => {
  status.textContent = message;
  status.hidden = false;
  status.focus();
 };
 const validateField = field => {
  field.setCustomValidity("");
  field.removeAttribute("aria-invalid");
  if (!field.value.trim()) field.setCustomValidity("Bitte f\u00fclle dieses Pflichtfeld aus.");
  else if (field.name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
   field.setCustomValidity("Bitte gib eine g\u00fcltige E-Mail-Adresse ein.");
  } else if (field.name === "phone") {
   const digits = field.value.replace(/\D/g, "");
   const value = field.value.trim();
   const normalized = value.startsWith("+") ? digits : value.startsWith("00") ? digits.slice(2) : "49" + digits.replace(/^0/, "");
   if (!/^\+?[0-9 ()/.\-]+$/.test(value) || digits.length < 6 || normalized.length > 15) {
    field.setCustomValidity("Bitte gib eine g\u00fcltige Telefonnummer ein.");
   }
  }
 };
 fields.forEach(field => field.addEventListener("input", () => validateField(field)));
 contactForm.noValidate = true;
 contactForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (submit.disabled) return;
  fields.forEach(validateField);
  if (!contactForm.reportValidity()) {
   const invalid = fields.find(field => !field.validity.valid);
   invalid.setAttribute("aria-invalid", "true");
   status.textContent = "Bitte \u00fcberpr\u00fcfe die markierten Pflichtfelder.";
   status.hidden = false;
   invalid.focus();
   return;
  }
  const data = new FormData(contactForm);
  const payload = {
   firstName: data.get("firstName").trim(), lastName: data.get("lastName").trim(),
   email: data.get("email").trim(), phone: data.get("phone").trim(), message: data.get("message"),
   interests: data.getAll("interests"), callbackRequested: data.get("callbackRequested") === "true",
   sourcePage, website: data.get("website"), ...attribution
  };
  const fingerprint = JSON.stringify(payload);
  if (!pendingSubmission || pendingSubmission.fingerprint !== fingerprint) {
   pendingSubmission = { fingerprint, id: crypto.randomUUID() };
  }
  payload.submissionId = pendingSubmission.id;
  submit.disabled = true;
  contactForm.setAttribute("aria-busy", "true");
  status.textContent = "Deine Anfrage wird gepr\u00fcft.";
  status.hidden = false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
   const response = await fetch(contactForm.action, {
    method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload), signal: controller.signal
   });
   const result = await response.json();
   if (typeof result?.success !== "boolean" || typeof result.message !== "string" || !result.message.trim()) {
    throw new Error("Invalid contact response");
   }
   if (result.success && !response.ok) throw new Error("Inconsistent contact response");
   if (response.ok && result.success) {
    contactForm.reset();
    pendingSubmission = null;
    fields.forEach(field => { field.setCustomValidity(""); field.removeAttribute("aria-invalid"); });
    setStatus(result.message);
   } else {
    setStatus(result.message);
    if (result.errors && typeof result.errors === "object") {
     const invalid = fields.find(field => typeof result.errors[field.name] === "string");
     if (invalid) {
      invalid.setCustomValidity(result.errors[invalid.name]);
      invalid.setAttribute("aria-invalid", "true");
      invalid.focus();
     }
    }
   }
  } catch (error) {
   console.error("Contact request failed:", error.name);
   setStatus("Deine Nachricht konnte nicht gesendet werden. Bitte versuche es erneut oder nutze die Telefonnummer oder den E-Mail-Link auf dieser Seite.");
  } finally {
   clearTimeout(timeout);
   submit.disabled = false;
   contactForm.removeAttribute("aria-busy");
  }
 });
 submit.disabled = false;
}
