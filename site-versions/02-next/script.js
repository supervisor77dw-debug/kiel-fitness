const header = document.querySelector("[data-site-header]");
const toggle = header?.querySelector(".nav-toggle");
const nav = header?.querySelector("[data-site-nav]");
if (header && toggle && nav) {
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
