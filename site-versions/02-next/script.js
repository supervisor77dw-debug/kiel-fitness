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
 const position = carousel.querySelector("[data-review-position]");
 const counter = carousel.querySelector("[data-review-counter]");
 const progress = carousel.querySelector("[data-review-progress-fill]");
 const previous = carousel.querySelector("[data-review-previous]");
 const next = carousel.querySelector("[data-review-next]");
 const autoplayButton = carousel.querySelector("[data-review-autoplay]");
 const slides = [...(track?.querySelectorAll(".review-quote") || [])];
 const dialog = carousel.closest(".review-carousel-section")?.querySelector("[data-review-dialog]");
 const dialogAuthor = dialog?.querySelector("[data-review-dialog-author]");
 const dialogText = dialog?.querySelector("[data-review-dialog-text]");
 const dialogClose = dialog?.querySelector("[data-review-dialog-close]");
 if (!viewport || !track || !controls || !position || !counter || !progress || !previous || !next || !autoplayButton || !dialog || !dialogAuthor || !dialogText || !dialogClose || !slides.length) return;

 const interval = 8000;
 let currentIndex = 0;
 let visibleCount = 0;
 let clones = [];
 let autoplayTimer = 0;
 let manualPauseTimer = 0;
 let manualPauseUntil = 0;
 let settleTimer = 0;
 let hovered = false;
 let focused = false;
 let touched = false;
 let userPaused = false;
 let transitioning = false;
 let touchStartX = null;
 let dialogOpener = null;
 const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
 const realIndex = () => ((currentIndex - visibleCount) % slides.length + slides.length) % slides.length;
 const offsetFor = index => track.children[index].getBoundingClientRect().left - track.getBoundingClientRect().left;

 function setTrackPosition(animated) {
  track.style.transition = animated && !reducedMotion.matches ? "transform 700ms cubic-bezier(.22,.61,.36,1)" : "none";
  track.style.transform = `translate3d(${-offsetFor(currentIndex)}px,0,0)`;
 }

 function updateStatus() {
  const index = realIndex();
  counter.textContent = `${index + 1} / ${slides.length}`;
  progress.style.transform = `scaleX(${(index + 1) / slides.length})`;
  position.textContent = `Bewertung ${index + 1} von ${slides.length}`;
  slides.forEach((slide, slideIndex) => {
   const visible = (slideIndex - index + slides.length) % slides.length < visibleCount;
   slide.setAttribute("aria-label", `${slideIndex + 1} von ${slides.length}`);
   slide.setAttribute("aria-hidden", String(!visible));
   slide.inert = !visible;
   if (slideIndex === index) slide.setAttribute("aria-current", "true");
   else slide.removeAttribute("aria-current");
  });
 }

 function settleLoop() {
  if (currentIndex >= visibleCount + slides.length) {
   currentIndex -= slides.length;
   setTrackPosition(false);
  } else if (currentIndex < visibleCount) {
   currentIndex += slides.length;
   setTrackPosition(false);
  }
  transitioning = false;
  updateStatus();
 }

 function moveTo(index, animated = true) {
  currentIndex = index;
  transitioning = animated && !reducedMotion.matches;
  setTrackPosition(transitioning);
  updateStatus();
  if (transitioning) {
   window.clearTimeout(settleTimer);
   settleTimer = window.setTimeout(settleLoop, 850);
  } else settleLoop();
 }

 function addManualPause() {
  manualPauseUntil = Date.now() + interval;
  window.clearTimeout(manualPauseTimer);
  manualPauseTimer = window.setTimeout(() => {
   manualPauseUntil = 0;
   if (!autoplayBlocked()) moveTo(currentIndex + 1);
   scheduleAutoplay();
  }, interval);
  scheduleAutoplay();
 }

 function autoplayBlocked() {
  return userPaused || hovered || focused || touched || dialog.open || document.hidden || reducedMotion.matches || Date.now() < manualPauseUntil;
 }

 function scheduleAutoplay() {
  window.clearTimeout(autoplayTimer);
  autoplayTimer = 0;
  if (autoplayBlocked()) return;
  autoplayTimer = window.setTimeout(() => {
   autoplayTimer = 0;
   moveTo(currentIndex + 1);
   scheduleAutoplay();
  }, interval);
 }

 function buildLoop(nextVisibleCount) {
  const previousRealIndex = realIndex();
  visibleCount = nextVisibleCount;
  clones.forEach(clone => clone.remove());
  clones = [];
  for (let index = slides.length - visibleCount; index < slides.length; index++) {
   const clone = slides[index].cloneNode(true);
   clone.setAttribute("aria-hidden", "true");
   clone.inert = true;
   clones.push(clone);
   track.prepend(clone);
  }
  for (let index = 0; index < visibleCount; index++) {
   const clone = slides[index].cloneNode(true);
   clone.setAttribute("aria-hidden", "true");
   clone.inert = true;
   clones.push(clone);
   track.append(clone);
  }
  currentIndex = visibleCount + previousRealIndex;
  setTrackPosition(false);
  updateStatus();
 }

 function measure() {
  const configured = Number.parseInt(getComputedStyle(carousel).getPropertyValue("--review-visible"), 10);
  const nextVisibleCount = Math.max(1, Math.min(configured || 1, slides.length));
  if (nextVisibleCount !== visibleCount) buildLoop(nextVisibleCount);
  else setTrackPosition(false);
 }

 function openReview(button) {
  const card = button.closest(".review-quote");
  const fullText = card?.querySelector(".review-excerpt")?.textContent;
  const author = card?.querySelector("cite")?.textContent;
  if (!fullText || !author || dialog.open) return;
  dialogOpener = button;
  dialogAuthor.textContent = author;
  dialogText.textContent = fullText;
  dialog.showModal();
  dialogClose.focus();
  scheduleAutoplay();
 }

 previous.addEventListener("click", () => { addManualPause(); moveTo(currentIndex - 1); });
 next.addEventListener("click", () => { addManualPause(); moveTo(currentIndex + 1); });
 autoplayButton.addEventListener("click", () => {
  userPaused = !userPaused;
  autoplayButton.textContent = userPaused ? "▶" : "Ⅱ";
  autoplayButton.setAttribute("aria-label", userPaused ? "Automatischen Wechsel fortsetzen" : "Automatischen Wechsel pausieren");
  scheduleAutoplay();
 });
 carousel.querySelectorAll("[data-review-read-full]").forEach(button => button.addEventListener("click", () => openReview(button)));
 dialogClose.addEventListener("click", () => dialog.close());
 dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
 });
 dialog.addEventListener("keydown", event => {
  if (event.key === "Escape") {
   event.preventDefault();
   dialog.close();
  }
 });
 dialog.addEventListener("close", () => {
  if (dialogOpener?.isConnected) dialogOpener.focus();
  dialogOpener = null;
  addManualPause();
  scheduleAutoplay();
 });
 track.addEventListener("transitionend", event => {
  if (event.target === track && event.propertyName === "transform") settleLoop();
 });
 viewport.addEventListener("keydown", event => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  addManualPause();
  moveTo(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
 });
 carousel.addEventListener("mouseenter", () => { hovered = true; scheduleAutoplay(); });
 carousel.addEventListener("mouseleave", () => { hovered = false; scheduleAutoplay(); });
 carousel.addEventListener("focusin", () => { focused = true; scheduleAutoplay(); });
 carousel.addEventListener("focusout", event => {
  if (!carousel.contains(event.relatedTarget)) {
   focused = false;
   scheduleAutoplay();
  }
 });
 carousel.addEventListener("pointerdown", event => {
  if (event.pointerType === "touch") {
   touched = true;
   touchStartX = event.clientX;
   if (viewport.setPointerCapture) viewport.setPointerCapture(event.pointerId);
   addManualPause();
  }
 });
 ["pointerup", "pointercancel"].forEach(type => carousel.addEventListener(type, event => {
  if (touched) {
   if (type === "pointerup" && touchStartX !== null && Math.abs(event.clientX - touchStartX) > 45) {
    moveTo(currentIndex + (event.clientX < touchStartX ? 1 : -1));
   }
   touchStartX = null;
   touched = false;
   scheduleAutoplay();
  }
 }));
 viewport.addEventListener("touchstart", addManualPause, { passive: true });
 document.addEventListener("visibilitychange", scheduleAutoplay);
 reducedMotion.addEventListener("change", scheduleAutoplay);
 carousel.dataset.enhanced = "true";
 controls.hidden = false;
 measure();
 scheduleAutoplay();
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
const pageIntent = {
 fitness: "trial",
 health: "health",
 kurse: "courses",
 wellness: "wellness"
}[document.body.dataset.page];
document.querySelectorAll('a[href="kontakt.html"]').forEach(link => {
 const label = link.textContent.toLowerCase();
 const interest = label.includes("probetraining")
  ? "trial"
  : label.includes("training persönlich")
    ? "trial"
    : label.includes("betreuung") || label.includes("kurszeiten") || label.includes("programm erfragen")
      ? pageIntent
      : null;
 if (interest) link.href = `kontakt.html?interest=${interest}`;
});
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
 const requestedInterest = contextUrl.searchParams.get("interest");
 const interestInput = requestedInterest
  ? [...contactForm.querySelectorAll('input[name="interests"]')].find(input => input.value === requestedInterest)
  : null;
 if (interestInput) interestInput.checked = true;
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
