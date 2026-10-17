if (typeof USE_SUPABASE === "undefined") { var USE_SUPABASE = true; }
function togglePass(id, btn){ const i=document.getElementById(id); if(!i) return; if(i.type==="password"){ i.type="text"; btn.textContent="Hide"; } else { i.type="password"; btn.textContent="Show"; } }

(function deleteDefaultAdminForever(){
  try{
    let users=JSON.parse(localStorage.getItem("nt_users")||"[]");
    users=users.filter(u=>u.username && u.username.toLowerCase()!=="admin" && u.username.toLowerCase()!=="admin saog");
    localStorage.setItem("nt_users", JSON.stringify(users));
    const curStr=localStorage.getItem("nt_current");
    if(curStr){ const cur=JSON.parse(curStr); if(cur && cur.username && cur.username.toLowerCase()==="admin"){ localStorage.removeItem("nt_current"); } }
    if(!localStorage.getItem("nt_users")) localStorage.setItem("nt_users", JSON.stringify([]));
  }catch(e){}
})();

document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    const form=document.getElementById(t.dataset.tab+"Form");
    if(form) form.classList.add("active");
  });
});

const loginForm=document.getElementById("loginForm");
if(loginForm){
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const u=document.getElementById("loginUser").value.trim();
    const p=document.getElementById("loginPass").value;
    if(USE_SUPABASE && typeof getSupabase==="function" && isSupabaseConfigured()){
      try{
        const supabase=getSupabase();
        const {data,error}=await supabase.from("users").select("*").eq("username",u).eq("password",p).single();
        if(data && !error){ localStorage.setItem("nt_current", JSON.stringify(data)); location.href="dashboard.html"; return; }
      }catch(err){}
    }
    const users=JSON.parse(localStorage.getItem("nt_users")||"[]");
    const found=users.find(x=>x.username===u && x.password===p);
    if(found){ localStorage.setItem("nt_current", JSON.stringify(found)); location.href="dashboard.html"; }
    else alert("Invalid username or password!");
  });
}
const registerForm=document.getElementById("registerForm");
if(registerForm){
  registerForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name=document.getElementById("regName").value.trim();
    const u=document.getElementById("regUser").value.trim();
    const p=document.getElementById("regPass").value;
    const p2=document.getElementById("regPass2").value;
    if(p!==p2) return alert("Passwords do not match!");
    if(USE_SUPABASE && typeof getSupabase==="function" && isSupabaseConfigured()){
      try{
        const supabase=getSupabase();
        const {data:existing}=await supabase.from("users").select("username").eq("username",u).single();
        if(existing) return alert("Username exists!");
        const {error}=await supabase.from("users").insert([{name,username:u,password:p}]).select();
        if(!error){ alert("Registered! Login now."); document.querySelector("[data-tab=login]")?.click(); return; }
      }catch(err){}
    }
    let users=JSON.parse(localStorage.getItem("nt_users")||"[]");
    if(users.find(x=>x.username===u)) return alert("Username exists!");
    users.push({name,username:u,password:p});
    localStorage.setItem("nt_users", JSON.stringify(users));
    alert("Registered! Login now.");
    document.querySelector("[data-tab=login]")?.click();
  });
}

function logout(){ showLogoutModal(); }
function showLogoutModal(){ document.getElementById("logoutModal")?.classList.add("show"); }
function closeLogoutModal(){ document.getElementById("logoutModal")?.classList.remove("show"); }
function confirmLogout(){ localStorage.removeItem("nt_current"); location.href="index.html"; }
function showAccountModal(){ document.getElementById("accountModal")?.classList.add("show"); }
function closeAccountModal(){ document.getElementById("accountModal")?.classList.remove("show"); }
function showDeleteAccountModal(){}
function closeDeleteAccountModal(){}
function confirmDeleteAccount(){}

function getCurrentUserGlobal(){ try{ const s=localStorage.getItem("nt_current"); return s?JSON.parse(s):null;}catch{return null;} }
function getCurrentUsernameGlobal(){ const u=getCurrentUserGlobal(); return u? u.username||u.name||'admin':'admin'; }
function getChildrenStorageKeyGlobal(){ return `nt_children_${getCurrentUsernameGlobal()}`; }

let childrenCache=null;
function getChildrenSync(){
  try{ const shared=localStorage.getItem("nt_children_shared"); if(shared) return JSON.parse(shared); }catch{}
  try{ const key=getChildrenStorageKeyGlobal(); const v=localStorage.getItem(key); if(v) return JSON.parse(v); }catch{}
  try{ const old=localStorage.getItem("nt_children"); if(old) return JSON.parse(old); }catch{}
  return [];
}
function getChildren(){ if(childrenCache) return childrenCache; return getChildrenSync(); }
async function loadChildren(){ const data=getChildrenSync(); childrenCache=data; return data; }
function saveChildren(list){
  childrenCache=list;
  try{
    const key=getChildrenStorageKeyGlobal();
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem("nt_children_shared", JSON.stringify(list));
    localStorage.setItem("nt_children", JSON.stringify(list));
  }catch(e){}
}

// ===== WHO TABLES =====
const WFA_BOYS={0:{su:2.1,uw_from:2.2,uw_to:2.4,n_from:2.5,n_to:4.4,ow:4.5},1:{su:2.9,uw_from:3.0,uw_to:3.3,n_from:3.4,n_to:5.8,ow:5.9},2:{su:3.8,uw_from:3.9,uw_to:4.2,n_from:4.3,n_to:7.1,ow:7.2},3:{su:4.4,uw_from:4.5,uw_to:4.9,n_from:5.0,n_to:8.0,ow:8.1},4:{su:4.9,uw_from:5.0,uw_to:5.5,n_from:5.6,n_to:8.7,ow:8.8},5:{su:5.3,uw_from:5.4,uw_to:5.9,n_from:6.0,n_to:9.3,ow:9.4},6:{su:5.7,uw_from:5.8,uw_to:6.3,n_from:6.4,n_to:9.8,ow:9.9},7:{su:5.9,uw_from:6.0,uw_to:6.6,n_from:6.7,n_to:10.3,ow:10.4},8:{su:6.2,uw_from:6.3,uw_to:6.8,n_from:6.9,n_to:10.7,ow:10.8},9:{su:6.4,uw_from:6.5,uw_to:7.0,n_from:7.1,n_to:11.0,ow:11.1},10:{su:6.6,uw_from:6.7,uw_to:7.3,n_from:7.4,n_to:11.4,ow:11.5},11:{su:6.8,uw_from:6.9,uw_to:7.5,n_from:7.6,n_to:11.7,ow:11.8},12:{su:6.9,uw_from:7.0,uw_to:7.6,n_from:7.7,n_to:12.0,ow:12.1},24:{su:8.6,uw_from:8.7,uw_to:9.6,n_from:9.7,n_to:15.3,ow:15.4},36:{su:10.0,uw_from:10.1,uw_to:11.2,n_from:11.3,n_to:18.3,ow:18.4},48:{su:11.0,uw_from:11.1,uw_to:12.4,n_from:12.5,n_to:20.7,ow:20.8},60:{su:12.4,uw_from:12.5,uw_to:14.0,n_from:14.1,n_to:24.2,ow:24.3},71:{su:13.9,uw_from:14.0,uw_to:15.6,n_from:15.7,n_to:26.8,ow:26.9}};
const WFA_GIRLS={0:{su:2.0,uw_from:2.1,uw_to:2.3,n_from:2.4,n_to:4.2,ow:4.3},1:{su:2.7,uw_from:2.8,uw_to:3.1,n_from:3.2,n_to:5.5,ow:5.6},2:{su:3.4,uw_from:3.5,uw_to:3.8,n_from:3.9,n_to:6.6,ow:6.7},3:{su:4.0,uw_from:4.1,uw_to:4.4,n_from:4.5,n_to:7.5,ow:7.6},12:{su:6.3,uw_from:6.4,uw_to:6.9,n_from:7.0,n_to:11.5,ow:11.6},24:{su:8.1,uw_from:8.2,uw_to:8.9,n_from:9.0,n_to:14.8,ow:14.9},36:{su:9.6,uw_from:9.7,uw_to:10.7,n_from:10.8,n_to:18.1,ow:18.2},48:{su:10.8,uw_from:10.9,uw_to:12.1,n_from:12.2,n_to:21.2,ow:21.3},60:{su:12.1,uw_from:12.2,uw_to:13.6,n_from:13.7,n_to:24.7,ow:24.8},71:{su:13.4,uw_from:13.5,uw_to:15.1,n_from:15.2,n_to:27.6,ow:27.7}};
const HFA_BOYS={0:{ss:44.1,s_from:44.2,s_to:46.0,n_from:46.1,n_to:53.7,tall:53.8},12:{ss:68.5,s_from:68.6,s_to:70.9,n_from:71.0,n_to:80.5,tall:80.6},24:{ss:77.9,s_from:78.0,s_to:80.9,n_from:81.0,n_to:93.2,tall:93.3},36:{ss:84.9,s_from:85.0,s_to:88.1,n_from:88.2,n_to:103.5,tall:103.6},60:{ss:96.0,s_from:96.1,s_to:100.6,n_from:100.7,n_to:119.2,tall:119.3}};
const HFA_GIRLS={0:{ss:43.5,s_from:43.6,s_to:45.2,n_from:45.3,n_to:52.9,tall:53.0},12:{ss:66.2,s_from:66.3,s_to:68.8,n_from:68.9,n_to:79.2,tall:79.3},24:{ss:75.9,s_from:76.0,s_to:79.2,n_from:79.3,n_to:92.2,tall:92.3},60:{ss:95.1,s_from:95.2,s_to:99.8,n_from:99.9,n_to:116.9,tall:117.0}};
const WFH_BOYS={45:{m3:1.9,m2:2.0,m1:2.2,med:2.4,p1:2.6,p2:2.9,p3:3.1},50:{m3:3.0,m2:3.3,m1:3.6,med:3.9,p1:4.2,p2:4.6,p3:5.0},60:{m3:4.9,m2:5.3,m1:5.7,med:6.2,p1:6.7,p2:7.3,p3:7.9},70:{m3:7.0,m2:7.5,m1:8.1,med:8.8,p1:9.5,p2:10.3,p3:11.1},80:{m3:8.6,m2:9.2,m1:10.0,med:10.8,p1:11.7,p2:12.7,p3:13.7},90:{m3:10.2,m2:11.0,m1:11.9,med:12.9,p1:14.0,p2:15.2,p3:16.4},100:{m3:11.8,m2:12.8,m1:14.0,med:15.3,p1:16.7,p2:18.2,p3:19.7},110:{m3:13.6,m2:14.8,m1:16.2,med:17.8,p1:19.5,p2:21.4,p3:23.2}};
const WFH_GIRLS={45:{m3:1.9,m2:2.0,m1:2.2,med:2.3,p1:2.5,p2:2.7,p3:3.0},50:{m3:2.9,m2:3.2,m1:3.5,med:3.8,p1:4.1,p2:4.5,p3:4.9},60:{m3:4.7,m2:5.1,m1:5.5,med:6.0,p1:6.5,p2:7.1,p3:7.7},70:{m3:6.6,m2:7.1,m1:7.7,med:8.3,p1:9.0,p2:9.8,p3:10.6},80:{m3:8.2,m2:8.8,m1:9.5,med:10.2,p1:11.1,p2:12.1,p3:13.1},90:{m3:9.8,m2:10.5,m1:11.4,med:12.3,p1:13.4,p2:14.6,p3:15.8},100:{m3:11.4,m2:12.3,m1:13.3,med:14.5,p1:15.8,p2:17.3,p3:18.7},110:{m3:13.2,m2:14.2,m1:15.5,med:16.9,p1:18.5,p2:20.2,p3:21.9}};

function getClosest(table, key){ let keys=Object.keys(table).map(Number).sort((a,b)=>a-b); let closest=keys[0]; for(let k of keys){ if(Math.abs(k-key)<Math.abs(closest-key)) closest=k; } return table[closest]; }
function computeAgeInMonths(dobStr, measuredStr){ if(!dobStr||!measuredStr) return null; const dob=new Date(dobStr); const meas=new Date(measuredStr); if(isNaN(dob)||isNaN(meas)) return null; let years=meas.getFullYear()-dob.getFullYear(); let months=meas.getMonth()-dob.getMonth(); let total=years*12+months; return total<0?0:total; }
function classifyWFA(ageMonths, weight, sex){
  if(ageMonths==null||weight==null) return 'N';
  let table=(sex&&sex.toString().toUpperCase().startsWith('F'))?WFA_GIRLS:WFA_BOYS;
  let row=table[ageMonths]||getClosest(table, ageMonths);
  if(!row) return 'N';
  if(weight<=row.su) return 'SUW';
  if(weight>=row.uw_from && weight<=row.uw_to) return 'UW';
  if(weight>=row.n_from && weight<=row.n_to) return 'N';
  if(weight>=row.ow) return 'OW';
  return 'N';
}
function classifyHFA(ageMonths, height, sex){
  if(ageMonths==null||height==null) return 'N';
  let table=(sex&&sex.toString().toUpperCase().startsWith('F'))?HFA_GIRLS:HFA_BOYS;
  let row=table[ageMonths]||getClosest(table, ageMonths);
  if(!row) return 'N';
  if(height<row.ss) return 'SS';
  if(height>=row.s_from && height<=row.s_to) return 'S';
  if(height>=row.n_from && height<=row.n_to) return 'N';
  if(height>=row.tall) return 'T';
  return 'N';
}
function classifyWFH(heightCm, weightKg, sex){
  if(!heightCm||!weightKg) return 'N';
  let table=(sex&&sex.toString().toUpperCase().startsWith('F'))?WFH_GIRLS:WFH_BOYS;
  let keys=Object.keys(table).map(Number).sort((a,b)=>a-b);
  let closest=keys[0];
  for(let k of keys){ if(Math.abs(k-heightCm)<=Math.abs(closest-heightCm)) closest=k; }
  let row=table[closest];
  if(!row) return 'N';
  if(weightKg<row.m3) return 'SW';
  if(weightKg>=row.m3 && weightKg<row.m2) return 'W';
  if(weightKg>=row.m2 && weightKg<=row.p2) return 'N';
  if(weightKg>row.p2 && weightKg<=row.p3) return 'OW';
  if(weightKg>row.p3) return 'O';
  return 'N';
}

function autoComputeEOPT(){
  const dob=document.getElementById('cDOB')?.value;
  const measured=document.getElementById('cDate')?.value;
  const w=parseFloat(document.getElementById('cWeight')?.value);
  const h=parseFloat(document.getElementById('cHeight')?.value);
  const sex=document.getElementById('cGender')?.value;
  let age=computeAgeInMonths(dob, measured);
  if(document.getElementById('cAge')) document.getElementById('cAge').value=age!=null?age:'';
  let wfa=age!=null && !isNaN(w)?classifyWFA(age,w,sex):'';
  let hfa=age!=null && !isNaN(h)?classifyHFA(age,h,sex):'';
  let wfh=!isNaN(w)&&!isNaN(h)?classifyWFH(h,w,sex):'';
  if(document.getElementById('cWFA')) document.getElementById('cWFA').value=wfa;
  if(document.getElementById('cHFA')) document.getElementById('cHFA').value=hfa;
  if(document.getElementById('cWFH')) document.getElementById('cWFH').value=wfh;
  const box=document.getElementById('bmiResultBox');
  if(box){
    document.getElementById('bmiValue').textContent=age!=null?age+' months':'--';
    document.getElementById('bmiClass').textContent=`WFA:${wfa} | HFA:${hfa} | WFH:${wfh}`;
    document.getElementById('rangeInfo').innerHTML=`<small>WHO/NNC - WFA/HFA/WFH from WHO Child Growth Standards. Source: nnc.gov.ph & who.int/tools/child-growth-standards</small>`;
    box.style.display='block';
  }
}
function calculateBMI(){ autoComputeEOPT(); }
function calculateUpdateBMI(){
  const dob=document.getElementById('uDOB')?.value;
  const measured=document.getElementById('uDate')?.value;
  const w=parseFloat(document.getElementById('uWeight')?.value);
  const h=parseFloat(document.getElementById('uHeight')?.value);
  const sex=document.getElementById('uGender')?.value;
  let age=computeAgeInMonths(dob, measured);
  if(document.getElementById('uAge')) document.getElementById('uAge').value=age!=null?age:'';
  let wfa=age!=null && !isNaN(w)?classifyWFA(age,w,sex):'';
  let hfa=age!=null && !isNaN(h)?classifyHFA(age,h,sex):'';
  let wfh=!isNaN(w)&&!isNaN(h)?classifyWFH(h,w,sex):'';
  if(document.getElementById('uWFA')) document.getElementById('uWFA').value=wfa;
  if(document.getElementById('uHFA')) document.getElementById('uHFA').value=hfa;
  if(document.getElementById('uWFH')) document.getElementById('uWFH').value=wfh;
  const box=document.getElementById('uBmiResultBox');
  if(box){
    document.getElementById('uBmiValue').textContent=age!=null?age+' months':'--';
    document.getElementById('uBmiClass').textContent=`WFA:${wfa} | HFA:${hfa} | WFH:${wfh}`;
    box.classList.add('show'); box.style.display='flex';
  }
}

function resetForm(){
  const f=document.getElementById('childForm');
  if(f) f.reset();
  const eid=document.getElementById('editId'); if(eid) eid.value='';
  ['cAge','cWFA','cHFA','cWFH'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const box=document.getElementById('bmiResultBox'); if(box) box.style.display='none';
}

const childForm=document.getElementById('childForm');
if(childForm){
  childForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const dob=document.getElementById('cDOB').value;
    const measured=document.getElementById('cDate').value;
    const age=computeAgeInMonths(dob, measured);
    const w=parseFloat(document.getElementById('cWeight').value);
    const h=parseFloat(document.getElementById('cHeight').value);
    const sex=document.getElementById('cGender').value;
    const wfa=classifyWFA(age,w,sex);
    const hfa=classifyHFA(age,h,sex);
    const wfh=classifyWFH(h,w,sex);
    const editId=document.getElementById('editId').value;
    const record={
      id: editId||'id_'+Date.now()+'_'+Math.random().toString(36).substr(2,5),
      purok: document.getElementById('cPurok').value,
      address: document.getElementById('cAddress').value,
      mother: document.getElementById('cMother').value,
      name: document.getElementById('cName').value,
      ip: document.getElementById('cIP').value,
      gender: sex,
      dob: dob,
      date: measured,
      weight: w,
      height: h,
      age: age,
      wfa: wfa,
      hfa: hfa,
      wfh: wfh,
      status: wfa,
      bmi: w,
      created_by: getCurrentUsernameGlobal(),
      updated_by: getCurrentUsernameGlobal(),
      created_at: new Date().toISOString()
    };
    let list=getChildren();
    if(editId){ const idx=list.findIndex(x=>x.id===editId); if(idx>=0) list[idx]={...list[idx],...record}; }
    else list.push(record);
    saveChildren(list);
    alert('Saved! WFA:'+wfa+' HFA:'+hfa+' WFH:'+wfh);
    resetForm();
    renderTable(); renderDashboard(); renderPurokTable(); renderFeeding();
  });
}

function renderDashboard(){
  const list=getChildren();
  const total=list.length;
  const el=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  el('totalChildren', total);
  el('totalNormalWFA', list.filter(c=>c.wfa==='N').length);
  el('totalNormalHFA', 'HFA N: '+list.filter(c=>c.hfa==='N').length);
  el('totalNormalWFH', 'WFH N: '+list.filter(c=>c.wfh==='N').length);
  el('totalUnder', list.filter(c=>c.wfa==='UW').length);
  el('totalSevereUnder', list.filter(c=>c.wfa==='SUW').length);
  el('totalOver', list.filter(c=>c.wfa==='OW').length + list.filter(c=>c.wfh==='OW').length);
  el('totalStunted', list.filter(c=>c.hfa==='S').length);
  el('totalSevereStunted', list.filter(c=>c.hfa==='SS').length);
  el('totalTall', list.filter(c=>c.hfa==='T').length);
  el('totalWasted', list.filter(c=>c.wfh==='W').length);
  el('totalSevereWasted', list.filter(c=>c.wfh==='SW').length);
  el('totalObese', list.filter(c=>c.wfh==='O').length);
  el('totalNormal', list.filter(c=>c.wfa==='N').length);
  el('totalObeseLegacy', list.filter(c=>c.wfa==='SUW').length);
  const summary=document.getElementById('statusSummary');
  if(summary){
    summary.innerHTML=`Total: ${total} | WFA N:${list.filter(c=>c.wfa==='N').length} UW:${list.filter(c=>c.wfa==='UW').length} SUW:${list.filter(c=>c.wfa==='SUW').length} OW:${list.filter(c=>c.wfa==='OW').length}<br>HFA N:${list.filter(c=>c.hfa==='N').length} S:${list.filter(c=>c.hfa==='S').length} SS:${list.filter(c=>c.hfa==='SS').length} T:${list.filter(c=>c.hfa==='T').length}<br>WFH N:${list.filter(c=>c.wfh==='N').length} W:${list.filter(c=>c.wfh==='W').length} SW:${list.filter(c=>c.wfh==='SW').length} O:${list.filter(c=>c.wfh==='O').length}`;
  }
}

function renderTable(){
  const tbody=document.querySelector('#recordsTable tbody');
  if(!tbody) return;
  const list=getChildren();
  const search=(document.getElementById('searchInput')?.value||'').toLowerCase();
  const filter=(document.getElementById('filterStatus')?.value||'').trim().toUpperCase();
  let filtered=list.filter(c=>{
    const txt=`${c.name||''} ${c.mother||''} ${c.purok||''} ${c.address||''} ${c.wfa||''} ${c.hfa||''} ${c.wfh||''}`.toLowerCase();
    if(search && !txt.includes(search)) return false;
    if(filter){
      if(filter==='N'){ return c.wfa==='N'||c.hfa==='N'||c.wfh==='N'; }
      return c.wfa===filter||c.hfa===filter||c.wfh===filter;
    }
    return true;
  });
  tbody.innerHTML='';
  filtered.forEach((c,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${c.purok||''}</td><td title="${c.address||''}">${c.address||''}</td><td>${c.mother||''}</td><td><b>${c.name||''}</b></td><td>${c.ip||''}</td><td>${c.gender||''}</td><td>${c.dob||''}</td><td>${c.date||''}</td><td>${c.weight||''}</td><td>${c.height||''}</td><td>${c.age||''}</td><td><span style="background:${c.wfa==='N'?'#4caf50':c.wfa==='UW'?'#ff9800':'#f44336'};color:#fff;padding:4px 8px;border-radius:6px">${c.wfa||''}</span></td><td><span style="background:${c.hfa==='N'?'#4caf50':c.hfa==='S'?'#ff9800':'#f44336'};color:#fff;padding:4px 8px;border-radius:6px">${c.hfa||''}</span></td><td><span style="background:${c.wfh==='N'?'#4caf50':c.wfh==='W'?'#ff9800':'#f44336'};color:#fff;padding:4px 8px;border-radius:6px">${c.wfh||''}</span></td><td><button class="btn-outline" onclick="openUpdateModal('${c.id}')">✏️ Edit</button> <button class="btn-outline" onclick="deleteChild('${c.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
  if(filtered.length===0) tbody.innerHTML='<tr><td colspan="16" style="text-align:center;padding:20px">No records. Add child information.</td></tr>';
}

function openUpdateModal(id){
  const c=getChildren().find(x=>x.id===id);
  if(!c) return;
  document.getElementById('uEditId').value=c.id;
  document.getElementById('uPurok').value=c.purok||'Purok 1';
  document.getElementById('uAddress').value=c.address||'';
  document.getElementById('uMother').value=c.mother||'';
  document.getElementById('uName').value=c.name||'';
  document.getElementById('uIP').value=c.ip||'NO';
  document.getElementById('uGender').value=c.gender||'';
  document.getElementById('uDOB').value=c.dob||'';
  document.getElementById('uDate').value=c.date||'';
  document.getElementById('uWeight').value=c.weight||'';
  document.getElementById('uHeight').value=c.height||'';
  document.getElementById('uAge').value=c.age||'';
  document.getElementById('uWFA').value=c.wfa||'';
  document.getElementById('uHFA').value=c.hfa||'';
  document.getElementById('uWFH').value=c.wfh||'';
  calculateUpdateBMI();
  document.getElementById('updateChildModal').classList.add('show');
}
function editChild(id){ openUpdateModal(id); }
function closeUpdateChildModal(){ document.getElementById('updateChildModal').classList.remove('show'); }
function saveUpdateChild(){
  const id=document.getElementById('uEditId').value;
  if(!id) return;
  let list=getChildren();
  const idx=list.findIndex(x=>x.id===id);
  if(idx<0) return;
  const dob=document.getElementById('uDOB').value;
  const measured=document.getElementById('uDate').value;
  const age=computeAgeInMonths(dob, measured);
  const w=parseFloat(document.getElementById('uWeight').value);
  const h=parseFloat(document.getElementById('uHeight').value);
  const sex=document.getElementById('uGender').value;
  const wfa=classifyWFA(age,w,sex);
  const hfa=classifyHFA(age,h,sex);
  const wfh=classifyWFH(h,w,sex);
  list[idx]={...list[idx], purok:document.getElementById('uPurok').value, address:document.getElementById('uAddress').value, mother:document.getElementById('uMother').value, name:document.getElementById('uName').value, ip:document.getElementById('uIP').value, gender:sex, dob:dob, date:measured, weight:w, height:h, age:age, wfa:wfa, hfa:hfa, wfh:wfh, status:wfa };
  saveChildren(list);
  closeUpdateChildModal();
  renderTable(); renderPurokTable(); renderDashboard(); renderFeeding();
  alert('Updated! WFA:'+wfa+' HFA:'+hfa+' WFH:'+wfh);
}
function deleteChild(id){
  if(!confirm('Delete this record?')) return;
  let list=getChildren(); list=list.filter(x=>x.id!==id); saveChildren(list);
  renderTable(); renderPurokTable(); renderDashboard(); renderFeeding();
}

let currentPurokFilter='';
function initPurok(){ renderPurokTabs(); renderPurokTable(); }
function renderPurokTabs(){
  const container=document.getElementById('purokTabs');
  if(!container) return;
  const puroks=['Purok 1','Purok 2','Purok 3','Purok 4','Purok 5','Purok 6'];
  container.innerHTML='';
  puroks.forEach(p=>{
    const btn=document.createElement('button');
    btn.className='btn-outline';
    btn.style.margin='4px'; btn.style.padding='8px 14px'; btn.style.borderRadius='20px';
    btn.textContent=p;
    if(currentPurokFilter===p){ btn.style.background='#1a7a4c'; btn.style.color='#fff'; }
    btn.onclick=()=>{ currentPurokFilter=currentPurokFilter===p?'':p; renderPurokTabs(); renderPurokTable(); };
    container.appendChild(btn);
  });
  const allBtn=document.createElement('button'); allBtn.className='btn-outline'; allBtn.textContent='All Purok'; allBtn.style.margin='4px'; allBtn.onclick=()=>{ currentPurokFilter=''; renderPurokTabs(); renderPurokTable(); }; container.appendChild(allBtn);
}
function renderPurokTable(){
  const tbody=document.querySelector('#purokTable tbody');
  if(!tbody) return;
  let list=getChildren();
  const search=(document.getElementById('purokSearch')?.value||'').toLowerCase();
  if(currentPurokFilter) list=list.filter(c=>(c.purok||'').toLowerCase().includes(currentPurokFilter.toLowerCase()));
  if(search) list=list.filter(c=>`${c.name||''} ${c.mother||''} ${c.purok||''} ${c.address||''}`.toLowerCase().includes(search));
  const countEl=document.getElementById('purokCount'); if(countEl) countEl.textContent=`${list.length} record(s) ${currentPurokFilter? 'in '+currentPurokFilter : ''}`;
  tbody.innerHTML='';
  list.forEach((c,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${c.purok||''}</td><td>${c.address||''}</td><td>${c.mother||''}</td><td><b>${c.name||''}</b></td><td>${c.ip||''}</td><td>${c.gender||''}</td><td>${c.dob||''}</td><td>${c.date||''}</td><td>${c.weight||''}</td><td>${c.height||''}</td><td>${c.age||''}</td><td>${c.wfa||''}</td><td>${c.hfa||''}</td><td>${c.wfh||''}</td><td><button class="btn-outline" onclick="openUpdateModal('${c.id}')">✏️</button> <button class="btn-outline" onclick="deleteChild('${c.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
  if(list.length===0) tbody.innerHTML='<tr><td colspan="16" style="text-align:center;padding:20px">No records for this Purok.</td></tr>';
}
function exportPurokToExcel(){
  let list=getChildren(); if(currentPurokFilter) list=list.filter(c=>(c.purok||'').toLowerCase().includes(currentPurokFilter.toLowerCase()));
  if(list.length===0){ alert('No records'); return; }
  let csv='No.,Purok,Address,Mother,Child,IP,Sex,DOB,Date Measured,Weight,Height,Age,WFA,HFA,WFH\\n';
  list.forEach((c,i)=>{ csv+=`${i+1},"${c.purok}","${c.address}","${c.mother}","${c.name}","${c.ip}","${c.gender}","${c.dob}","${c.date}",${c.weight},${c.height},${c.age},${c.wfa},${c.hfa},${c.wfh}\\n`; });
  const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`Purok-${currentPurokFilter||'All'}.csv`; a.click();
}
function printPurokReport(){
  const table=document.getElementById('purokTable').outerHTML;
  const win=window.open('', '_blank');
  win.document.write(`<html><head><title>Purok Report</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:4px;font-size:11px}th{background:#6da8d1;color:#fff}</style></head><body><h2>Purok Monitoring - ${currentPurokFilter||'All'} - Brgy SAOG</h2>${table}</body></html>`);
  win.document.close(); win.print();
}
function renderFeeding(){
  const tbody=document.querySelector('#feedingTable tbody');
  if(!tbody) return;
  const list=getChildren().filter(c=> c.wfa!=='N' || c.hfa!=='N' || c.wfh!=='N');
  tbody.innerHTML='';
  list.forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${c.name}</td><td>${c.purok}</td><td>${c.wfa}/${c.hfa}/${c.wfh}</td><td>${c.age}m</td><td>${c.mother}</td>`;
    tbody.appendChild(tr);
  });
  if(list.length===0) tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:16px">No malnourished records - all Normal!</td></tr>';
}
function exportAllToExcel(){
  const list=getChildren(); if(list.length===0){ alert('No records'); return; }
  let csv='No.,Purok,Address or Location,Name of Mother/Caregiver,Full Name of Child,IP Group,Sex,Date of Birth,Date Measured,Weight (kg),Height (cm),Age in Months,Weight for Age Status,Height for Age Status,Weight for Length/Height Status\\n';
  list.forEach((c,i)=>{ csv+=`${i+1},"${(c.purok||'').replace(/"/g,'""')}","${(c.address||'').replace(/"/g,'""')}","${(c.mother||'').replace(/"/g,'""')}","${(c.name||'').replace(/"/g,'""')}","${c.ip||''}","${c.gender||''}","${c.dob||''}","${c.date||''}",${c.weight||''},${c.height||''},${c.age||''},${c.wfa||''},${c.hfa||''},${c.wfh||''}\\n`; });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`e-OPT-PLUS-SAOG-15columns-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function printAllRecords(){
  const list=getChildren(); if(list.length===0){ alert('No records'); return; }
  const table=document.getElementById('recordsTable').outerHTML;
  const win=window.open('', '_blank');
  win.document.write(`<html><head><title>All Records</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:4px;font-size:10px;text-align:center}th{background:#6da8d1;color:#fff}@media print{ @page{size:landscape} }</style></head><body><h2>e-OPT PLUS 15 Columns - Brgy SAOG</h2><p>Total: ${list.length}</p>${table}</body></html>`);
  win.document.close(); setTimeout(()=>win.print(), 500);
}

// ===== SIDEBAR FIX - GLOBAL, INDEPENDENT OF LOGIN CHECK =====
function initSidebarNavigation(){
  const btns=document.querySelectorAll('.side-btn');
  if(!btns.length) return;
  btns.forEach(b=>{
    b.addEventListener('click', function(){
      document.querySelectorAll('.side-btn').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      this.classList.add('active');
      const viewId='view-'+this.dataset.view;
      const view=document.getElementById(viewId);
      if(view){ view.classList.add('active'); }
      if(this.dataset.view==='dashboard') renderDashboard();
      if(this.dataset.view==='records') renderTable();
      if(this.dataset.view==='purok') initPurok();
      if(this.dataset.view==='feeding') renderFeeding();
    });
  });
}

// Init after DOM ready - independent
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', ()=>{
    initSidebarNavigation();
    // Load user display
    const curStr=localStorage.getItem('nt_current');
    if(curStr){
      try{ const cur=JSON.parse(curStr); const el=document.getElementById('userDisplay'); if(el) el.textContent=cur.name||cur.username||'User'; }catch{}
    }
    renderDashboard(); renderTable(); initPurok(); renderFeeding();
    const s=document.getElementById('searchInput'); if(s) s.addEventListener('input', renderTable);
    const f=document.getElementById('filterStatus'); if(f) f.addEventListener('change', renderTable);
  });
} else {
  initSidebarNavigation();
  renderDashboard(); renderTable(); initPurok(); renderFeeding();
}

window.autoComputeEOPT=autoComputeEOPT;
window.calculateBMI=calculateBMI;
window.calculateUpdateBMI=calculateUpdateBMI;
window.resetForm=resetForm;
window.renderTable=renderTable;
window.renderDashboard=renderDashboard;
window.openUpdateModal=openUpdateModal;
window.editChild=openUpdateModal;
window.closeUpdateChildModal=closeUpdateChildModal;
window.saveUpdateChild=saveUpdateChild;
window.deleteChild=deleteChild;
window.initPurok=initPurok;
window.renderPurokTabs=renderPurokTabs;
window.renderPurokTable=renderPurokTable;
window.exportPurokToExcel=exportPurokToExcel;
window.printPurokReport=printPurokReport;
window.renderFeeding=renderFeeding;
window.exportAllToExcel=exportAllToExcel;
window.printAllRecords=printAllRecords;
window.closeLogoutModal=closeLogoutModal;
window.confirmLogout=confirmLogout;
window.showLogoutModal=showLogoutModal;
window.showAccountModal=showAccountModal;
window.closeAccountModal=closeAccountModal;
