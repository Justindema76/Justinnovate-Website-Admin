const views={dashboard:"Wheels",campaigns:"Campaigns",links:"Tracking Links",qr:"QR Codes",referrals:"Referrals",customers:"Customers"};
const nav=[...document.querySelectorAll(".nav-item")];
const panels=[...document.querySelectorAll(".view")];
const title=document.getElementById("viewTitle");
function showView(name){if(!views[name])name="dashboard";nav.forEach(b=>b.classList.toggle("active",b.dataset.view===name));panels.forEach(v=>v.classList.toggle("active",v.id==="view-"+name));title.textContent=views[name];history.replaceState(null,"","#"+name);closeMenu()}
nav.forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
const sidebar=document.getElementById("sidebar"),scrim=document.getElementById("scrim");
function closeMenu(){sidebar.classList.remove("open");scrim.classList.remove("show")}
document.getElementById("mobileMenu").addEventListener("click",()=>{sidebar.classList.add("open");scrim.classList.add("show")});scrim.addEventListener("click",closeMenu);
document.getElementById("dashboardSwitcher").addEventListener("change",e=>{const value=e.target.value;if(value==="wheels")return;e.target.value="wheels";window.dispatchEvent(new CustomEvent("wheels:dashboard-switch",{detail:{target:value}}))});
showView(location.hash.slice(1)||"dashboard");