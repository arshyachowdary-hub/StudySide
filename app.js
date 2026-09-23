/* StudySide app logic.
   Everything here runs in the browser. localStorage makes the demo
   persistent without needing a server. A real app needs secure backend storage. */

const TASK_KEY="studyside_tasks_v2", SUPPORT_KEY="studyside_support_v2", CHECKIN_KEY="studyside_checkin_v2", REFLECTION_KEY="studyside_reflection_v2";
let tasks=JSON.parse(localStorage.getItem(TASK_KEY)||"[]");
let supportPeople=JSON.parse(localStorage.getItem(SUPPORT_KEY)||"[]");
let checkin=JSON.parse(localStorage.getItem(CHECKIN_KEY)||"null");
let badDay=false;
const $=id=>document.getElementById(id);

function saveAll(){
  localStorage.setItem(TASK_KEY,JSON.stringify(tasks));
  localStorage.setItem(SUPPORT_KEY,JSON.stringify(supportPeople));
  if(checkin)localStorage.setItem(CHECKIN_KEY,JSON.stringify(checkin));
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function toast(msg){
  const el=$("toast"); if(!el)return;
  el.textContent=msg; el.classList.remove("hidden");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add("hidden"),2500);
}

/* Render planner cards. Bad Day Mode changes the sorting so shorter,
   higher-priority tasks appear first. */
function renderTasks(){
  const list=$("taskList");
  $("taskCount").textContent=`${tasks.length} task${tasks.length===1?"":"s"}`;
  if(!tasks.length){list.innerHTML='<p class="rounded-xl bg-slate-50 p-4 text-slate-600">No tasks yet. Add your first assignment above.</p>';return;}
  const sorted=[...tasks].sort((a,b)=>badDay?((b.priority-a.priority)||(a.minutes-b.minutes)||a.date.localeCompare(b.date)):(a.date.localeCompare(b.date)||(b.priority-a.priority)));
  list.innerHTML=sorted.map(t=>{
    const p=t.priority===3?"High":t.priority===2?"Medium":"Low";
    return `<article class="rounded-xl border border-slate-200 p-4"><div class="flex items-start justify-between gap-4">
      <div class="min-w-0"><h3 class="font-bold text-[#17324d] break-words">${esc(t.name)}</h3><p class="text-sm text-slate-600 mt-1">${esc(t.type)} · ${p} priority · Due ${esc(t.date)} · ${t.minutes} min</p></div>
      <button type="button" class="delete-task shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-100" data-id="${t.id}" aria-label="Delete ${esc(t.name)}">Delete</button></div>
      ${t.steps?.length?`<details class="mt-4"><summary class="cursor-pointer font-semibold text-[#05636d]">Smaller steps (${t.steps.length})</summary><ul class="mt-3 space-y-2">${t.steps.map((s,i)=>`<li class="flex items-start gap-2 text-sm"><input type="checkbox" class="mt-1"><span>${esc(s)}</span></li>`).join("")}</ul></details>`:""}</article>`;
  }).join("");
  document.querySelectorAll(".delete-task").forEach(btn=>btn.addEventListener("click",()=>{tasks=tasks.filter(t=>t.id!==btn.dataset.id);saveAll();renderTasks();toast("Task removed.");}));
}

$("taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  const steps=$("taskSteps").value.split(",").map(s=>s.trim()).filter(Boolean);
  tasks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:$("taskName").value.trim(),type:$("taskType").value,priority:Number($("taskPriority").value),date:$("taskDate").value,minutes:Number($("taskMinutes").value),steps});
  saveAll();renderTasks();e.target.reset();$("taskMinutes").value=30;$("taskName").focus();toast("Added to your planner.");
});

/* Bad Day Mode is intentionally simple: it does not remove work.
   It changes the order to make smaller/high-priority tasks easier to see. */
$("badDayBtn").addEventListener("click",()=>{
  badDay=!badDay;
  $("badDayBtn").textContent=badDay?"Turn off Bad Day Mode":"Turn on Bad Day Mode";
  $("badDayBtn").setAttribute("aria-pressed",String(badDay));
  $("badDayBanner").classList.toggle("hidden",!badDay);
  renderTasks();toast(badDay?"Bad Day Mode is on.":"Bad Day Mode is off.");
});

/* Daily check-in */
document.querySelectorAll(".mood-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".mood-btn").forEach(b=>{b.classList.remove("border-[#087f8c]","bg-[#dff5f4]");b.setAttribute("aria-pressed","false");});
  btn.classList.add("border-[#087f8c]","bg-[#dff5f4]");btn.setAttribute("aria-pressed","true");
  checkin={mood:btn.dataset.mood,factors:[...document.querySelectorAll(".factor-check:checked")].map(x=>x.value),date:new Date().toISOString().slice(0,10)};
  saveAll();updateCheckinText();
}));
document.querySelectorAll(".factor-check").forEach(box=>box.addEventListener("change",()=>{
  if(!checkin)return;
  checkin.factors=[...document.querySelectorAll(".factor-check:checked")].map(x=>x.value);
  saveAll();updateCheckinText();
}));
function updateCheckinText(){
  $("moodStatus").textContent=`Check-in saved: ${checkin.mood}. Factors: ${checkin.factors.length?checkin.factors.join(", "):"none"}.`;
}
function restoreCheckin(){
  if(!checkin)return;
  const b=[...document.querySelectorAll(".mood-btn")].find(x=>x.dataset.mood===checkin.mood);
  if(b){b.classList.add("border-[#087f8c]","bg-[#dff5f4]");b.setAttribute("aria-pressed","true");}
  document.querySelectorAll(".factor-check").forEach(x=>x.checked=checkin.factors?.includes(x.value)||false);
  updateCheckinText();
}

/* Prototype AI assistant.
   It is rule-based so the website works by opening app.html directly.
   A real AI API must be called through a secure backend, not with a
   private API key embedded in browser JavaScript. */
$("breakDownBtn").addEventListener("click",()=>{
  const input=$("assistantTask").value.trim(),out=$("assistantOutput");out.classList.remove("hidden");
  if(!input){out.innerHTML="<p>Please describe the assignment or workload first.</p>";return;}
  out.innerHTML=`<p class="font-bold text-[#17324d]">Suggested plan for:</p><p class="mt-1">${esc(input)}</p>
  <ol class="list-decimal ml-5 mt-3 space-y-1"><li>Write down exactly what the final task needs.</li><li>Break it into 20–30 minute chunks.</li><li>Choose the smallest useful first step.</li><li>Put each step into the planner.</li><li>Leave buffer time before the deadline.</li><li>If it feels unmanageable, consider talking to a trusted adult or teacher.</li></ol>
  <p class="mt-3 text-xs text-slate-600">Planning guidance only; this assistant does not diagnose or treat mental-health conditions.</p>`;
});
$("messageBtn").addEventListener("click",()=>{
  const out=$("assistantOutput");out.classList.remove("hidden");
  out.innerHTML=`<p class="font-bold text-[#17324d]">Draft message</p><div class="mt-3 rounded-lg bg-white p-3 border border-slate-200">Hi, I wanted to let you know that I'm having a difficult time managing my workload right now. Could we talk about what I should prioritize and what I can realistically complete?</div><p class="mt-3 text-xs text-slate-600">Edit this before sending it to a trusted adult or teacher.</p>`;
});

/* Trusted people */
function renderSupport(){
  const list=$("supportList");
  if(!supportPeople.length){list.innerHTML='<p class="text-sm text-slate-500">No trusted people added yet.</p>';return;}
  list.innerHTML=supportPeople.map((p,i)=>`<div class="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span class="text-sm font-semibold break-words">${esc(p)}</span><button type="button" class="delete-support text-sm underline font-semibold" data-index="${i}" aria-label="Remove ${esc(p)}">Remove</button></div>`).join("");
  document.querySelectorAll(".delete-support").forEach(b=>b.addEventListener("click",()=>{supportPeople.splice(Number(b.dataset.index),1);saveAll();renderSupport();toast("Trusted person removed.");}));
}
$("supportForm").addEventListener("submit",e=>{e.preventDefault();const n=$("supportName").value.trim();if(!n)return;supportPeople.push(n);saveAll();renderSupport();e.target.reset();$("supportName").focus();toast("Trusted person added.");});

/* Weekly reflection */
$("reflectionForm").addEventListener("submit",e=>{
  e.preventDefault();
  localStorage.setItem(REFLECTION_KEY,JSON.stringify({stress:$("reflectionStress").value.trim(),helped:$("reflectionHelped").value.trim(),improve:$("reflectionImprove").value.trim(),date:new Date().toISOString().slice(0,10)}));
  $("reflectionStatus").textContent="Your reflection was saved on this device.";toast("Weekly reflection saved.");
});

renderTasks();renderSupport();restoreCheckin();
$("taskDate").min=new Date().toISOString().slice(0,10);
