const header = document.querySelector("[data-site-header]");
const toggle = header?.querySelector(".nav-toggle");
const nav = header?.querySelector("[data-site-nav]");
if (header && toggle && nav) {
 const mobile = window.matchMedia("(max-width: 760px)");
 function setNavigationOpen(open, restoreFocus = false) {
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Men\u00fc schlie\u00dfen" : "Men\u00fc \u00f6ffnen");
  nav.classList.toggle("open", open);
  if (restoreFocus) toggle.focus();
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
  if (!mobile.matches && document.activeElement === toggle) {
   nav.querySelector('[aria-current="page"], a')?.focus();
  }
 });
}
const courseTabs=document.querySelectorAll("[data-course-tab]");
const courseItems=document.querySelectorAll("[data-course-category]");
function showCourseCategory(category){
 courseTabs.forEach(b=>b.classList.toggle("active",b.dataset.courseTab===category));
 courseItems.forEach(el=>{el.hidden=el.dataset.courseCategory!==category;});
}
if(courseTabs.length){courseTabs.forEach(b=>b.addEventListener("click",()=>showCourseCategory(b.dataset.courseTab)));showCourseCategory("kraft");}
