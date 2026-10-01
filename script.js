const toggle=document.querySelector(".nav-toggle");const nav=document.querySelector(".site-header nav");toggle?.addEventListener("click",()=>nav?.classList.toggle("open"));nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
const courseTabs=document.querySelectorAll("[data-course-tab]");
const courseItems=document.querySelectorAll("[data-course-category]");
function showCourseCategory(category){
 courseTabs.forEach(b=>b.classList.toggle("active",b.dataset.courseTab===category));
 courseItems.forEach(el=>{el.hidden=el.dataset.courseCategory!==category;});
}
if(courseTabs.length){courseTabs.forEach(b=>b.addEventListener("click",()=>showCourseCategory(b.dataset.courseTab)));showCourseCategory("kraft");}
