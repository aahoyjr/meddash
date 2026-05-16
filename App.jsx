import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════ */
const C = {
  bg:"#0A0A0A",surface:"#111111",surface2:"#1A1A1A",surface3:"#222222",
  border:"#2A2A2A",border2:"#333333",
  gold:"#C8A96E",goldDim:"rgba(200,169,110,0.12)",goldBorder:"rgba(200,169,110,0.3)",
  white:"#FFFFFF",gray1:"#999999",gray2:"#666666",gray3:"#444444",
  green:"#4CAF7D",greenDim:"rgba(76,175,125,0.12)",
  red:"#E05252",redDim:"rgba(224,82,82,0.12)",
  yellow:"#E0C052",yellowDim:"rgba(224,192,82,0.12)",
  blue:"#5B9BD5",blueDim:"rgba(91,155,213,0.12)",
  orange:"#D4845A",orangeDim:"rgba(212,132,90,0.12)",
};
const FD="'Cormorant Garamond',Georgia,serif";
const FB="'Darker Grotesque','Helvetica Neue',sans-serif";
const FM="'IBM Plex Mono',monospace";

const css=`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Darker+Grotesque:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.white};font-family:${FB};-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:${C.surface};}
  ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px;}
  input,textarea,select{background:${C.surface2};border:1px solid ${C.border};color:${C.white};font-family:${FB};border-radius:8px;padding:10px 14px;font-size:14px;outline:none;width:100%;transition:border-color 0.2s;}
  input:focus,textarea:focus,select:focus{border-color:${C.gold};}
  input::placeholder,textarea::placeholder{color:${C.gray2};}
  select option{background:${C.surface2};}
  button{cursor:pointer;font-family:${FB};font-weight:600;}
  table{border-collapse:collapse;width:100%;}
  th{text-align:left;padding:10px 16px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.gray1};border-bottom:1px solid ${C.border};}
  td{padding:12px 16px;font-size:13px;border-bottom:1px solid ${C.border};}
  tr:hover td{background:${C.surface2};}
  .fade-in{animation:fadeIn 0.3s ease;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  .pulse{animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .md-sidebar{display:flex;flex-direction:column;}
  .md-topbar{display:none;background:#111;border-bottom:1px solid #2A2A2A;padding:14px 16px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:300;flex-shrink:0;}
  .md-drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:400;}
  .md-drawer{position:fixed;left:0;top:0;bottom:0;width:280px;background:#111;z-index:500;transform:translateX(-100%);transition:transform .25s;overflow-y:auto;display:flex;flex-direction:column;border-right:1px solid #2A2A2A;}
  .md-drawer.open{transform:translateX(0);}
  .md-drawer-overlay.open{display:block;}
  .md-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #2A2A2A;z-index:300;}
  @media(max-width:900px){
    .md-sidebar{display:none !important;}
    .md-topbar{display:flex !important;}
    .md-bottom-nav{display:flex !important;}
    .main-pad{padding:16px 16px 90px !important;max-height:calc(100vh - 58px) !important;}
    .hide-sm{display:none !important;}
  }
  @media(max-width:600px){
    .metric-flex>*{min-width:calc(50% - 6px) !important;flex:0 0 calc(50% - 6px) !important;}
  }
`;

/* ═══════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════ */
const SK={orders:"md_orders",drivers:"md_drivers",routes:"md_routes",tasks:"md_tasks",
  tickets:"md_tickets",exceptions:"md_exc",pod:"md_pod",scans:"md_scans",
  audit:"md_audit",sms:"md_sms",pickups:"md_pickups",pipeline:"md_pipeline",
  leads:"md_leads",qc:"md_qc",ops:"md_ops",contractors:"md_contractors",gigwork:"md_gigwork",
};
const DS={
  get:(k)=>{try{return JSON.parse(localStorage.getItem(k)||"null");}catch{return null;}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
  list:(k)=>{try{return JSON.parse(localStorage.getItem(k)||"[]");}catch{return[];}},
  push:(k,item)=>{const a=DS.list(k);a.push(item);DS.set(k,a);},
  update:(k,id,patch)=>{DS.set(k,DS.list(k).map(x=>x.id===id?{...x,...patch}:x));},
};
const exportCSV=(rows,name)=>{
  if(!rows||!rows.length)return;
  const keys=Object.keys(rows[0]);
  const csv=[keys.join(","),...rows.map(r=>keys.map(k=>JSON.stringify(r[k]??"")).join(","))].join("\n");
  const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=name;a.click();
};
const logAudit=(actor,action,entity)=>{
  DS.push(SK.audit,{id:"AUD-"+Date.now(),actor,action,entity,ts:new Date().toISOString()});
};

/* ═══════════════════════════════════════════════════════
   AUTH SYSTEM
═══════════════════════════════════════════════════════ */
const AUTH_KEY="md_users";
const SESSION_KEY="md_session";
const SEED=[
  {id:"USR-001",username:"admin",   phone:"",email:"admin@meddash.com",   password:"MedDash2026!",role:"dispatch",name:"Admin",          pharmacy:"",status:"active",created:"2026-01-01"},
  {id:"USR-002",username:"dispatch",phone:"",email:"dispatch@meddash.com",password:"meddash2026", role:"dispatch",name:"Dispatch HQ",    pharmacy:"",status:"active",created:"2026-01-01"},
  {id:"USR-003",username:"pharmacy",phone:"",email:"pharmacy@meddash.com",password:"meddash2026", role:"pharmacy",name:"Sunrise Pharmacy",pharmacy:"Sunrise Pharmacy",status:"active",created:"2026-01-01"},
  {id:"USR-004",username:"driver1", phone:"",email:"driver1@meddash.com", password:"meddash2026", role:"driver",  name:"Carlos M.",      pharmacy:"",status:"active",created:"2026-01-01"},
];
const Auth={
  getUsers:()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(AUTH_KEY)||"null");
      if(!saved||!saved.length){localStorage.setItem(AUTH_KEY,JSON.stringify(SEED));return SEED;}
      const merged=[...saved];
      SEED.forEach(s=>{if(!merged.find(u=>u.id===s.id))merged.push(s);});
      return merged;
    }catch{return SEED;}
  },
  setUsers:(u)=>{try{localStorage.setItem(AUTH_KEY,JSON.stringify(u));}catch{}},
  session:()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null");}catch{return null;}},
  setSession:(u)=>{try{localStorage.setItem(SESSION_KEY,JSON.stringify(u));}catch{}},
  clearSession:()=>{try{localStorage.removeItem(SESSION_KEY);}catch{}},
  login:(identifier,password)=>{
    const users=Auth.getUsers();
    const id=identifier.toLowerCase().trim();
    const u=users.find(x=>
      x.username.toLowerCase()===id||
      x.email.toLowerCase()===id||
      (x.phone&&x.phone.replace(/\D/g,"")===id.replace(/\D/g,""))
    );
    if(!u)return{ok:false,error:"No account found. Check your username, email, or phone number."};
    if(u.status==="suspended")return{ok:false,error:"Account suspended. Contact admin@meddash.com."};
    if(u.tempPass&&password===u.tempPass){Auth.setSession(u);return{ok:true,user:u,changePass:true};}
    if(u.password!==password)return{ok:false,error:"Incorrect password."};
    Auth.setSession(u);
    return{ok:true,user:u};
  },
  register:(data)=>{
    const users=Auth.getUsers();
    const uname=data.username.toLowerCase().trim();
    const uemail=data.email.toLowerCase().trim();
    const uphone=data.phone?data.phone.replace(/\D/g,""):"";
    if(uname&&users.find(u=>u.username.toLowerCase()===uname))return{ok:false,error:"Username already taken."};
    if(uemail&&users.find(u=>u.email.toLowerCase()===uemail))return{ok:false,error:"Email already registered."};
    if(uphone&&uphone.length>=10&&users.find(u=>u.phone&&u.phone.replace(/\D/g,"")===uphone))return{ok:false,error:"Phone number already registered."};
    if(!uname&&!uemail&&!uphone)return{ok:false,error:"Enter a username, email, or phone number."};
    if(data.password.length<8)return{ok:false,error:"Password must be at least 8 characters."};
    if(data.password!==data.confirm)return{ok:false,error:"Passwords do not match."};
    const nu={
      id:"USR-"+Date.now(),
      username:uname||("user"+Date.now().toString().slice(-6)),
      phone:data.phone||"",
      email:uemail,
      password:data.password,
      role:data.role,
      name:data.name,
      pharmacy:data.pharmacy||"",
      status:"active",
      created:new Date().toISOString().split("T")[0],
    };
    Auth.setUsers([...users,nu]);
    Auth.setSession(nu);
    return{ok:true,user:nu};
  },
  forgotPassword:(val)=>{
    const users=Auth.getUsers();
    const v=val.toLowerCase().trim();
    const u=users.find(x=>
      x.username.toLowerCase()===v||
      x.email.toLowerCase()===v||
      (x.phone&&x.phone.replace(/\D/g,"")===v.replace(/\D/g,""))
    );
    if(!u)return{ok:false,error:"No account found with that username, email, or phone."};
    const chars="ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const temp=Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
    Auth.setUsers(users.map(x=>x.id===u.id?{...x,tempPass:temp}:x));
    DS.push(SK.sms,{id:"SMS-"+Date.now(),to:u.phone||u.email,msg:"[MedDash] Your temp password is: "+temp+" — sign in at meddash.com and change it immediately.",ts:new Date().toISOString(),type:"password_reset"});
    return{ok:true,tempPass:temp,contact:u.phone||u.email,name:u.name};
  },
  changePassword:(userId,newPass,confirm)=>{
    if(newPass.length<8)return{ok:false,error:"Password must be at least 8 characters."};
    if(newPass!==confirm)return{ok:false,error:"Passwords do not match."};
    Auth.setUsers(Auth.getUsers().map(u=>u.id===userId?{...u,password:newPass,tempPass:null}:u));
    const s=Auth.session();
    if(s&&s.id===userId)Auth.setSession({...s,password:newPass,tempPass:null});
    return{ok:true};
  },
  updateUser:(userId,data)=>{
    Auth.setUsers(Auth.getUsers().map(u=>u.id===userId?{...u,...data}:u));
    const s=Auth.session();
    if(s&&s.id===userId)Auth.setSession({...s,...data});
  },
};

/* ═══════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
═══════════════════════════════════════════════════════ */
const Badge=({label,color,bg,size="sm"})=>(
  <span style={{background:bg||"rgba(255,255,255,0.08)",color:color||C.white,padding:size==="lg"?"6px 14px":"3px 10px",borderRadius:20,fontSize:size==="lg"?13:11,fontWeight:700,letterSpacing:"0.04em",whiteSpace:"nowrap",fontFamily:FB}}>{label}</span>
);
const StatusBadge=({status})=>{
  const m={ready:{label:"Ready",color:C.gold,bg:C.goldDim},assigned:{label:"Assigned",color:C.blue,bg:C.blueDim},in_transit:{label:"In Transit",color:C.yellow,bg:C.yellowDim},delivered:{label:"Delivered",color:C.green,bg:C.greenDim},failed:{label:"Failed",color:C.red,bg:C.redDim},active:{label:"Active",color:C.green,bg:C.greenDim},pending:{label:"Pending",color:C.yellow,bg:C.yellowDim},suspended:{label:"Suspended",color:C.red,bg:C.redDim},in_progress:{label:"In Progress",color:C.yellow,bg:C.yellowDim},completed:{label:"Completed",color:C.green,bg:C.greenDim},created:{label:"Created",color:C.gold,bg:C.goldDim},open:{label:"Open",color:C.red,bg:C.redDim},resolved:{label:"Resolved",color:C.green,bg:C.greenDim},scheduled:{label:"Scheduled",color:C.blue,bg:C.blueDim},verified:{label:"Verified",color:C.green,bg:C.greenDim},new:{label:"New",color:C.gold,bg:C.goldDim},flagged:{label:"Flagged",color:C.red,bg:C.redDim},approved:{label:"Approved",color:C.green,bg:C.greenDim}};
  const s=m[status]||{label:status,color:C.gray1,bg:C.surface2};
  return <Badge label={s.label} color={s.color} bg={s.bg}/>;
};
const Btn=({children,onClick,variant="primary",size="md",disabled,style:sx})=>{
  const v={primary:{background:C.gold,color:C.bg,border:"none"},secondary:{background:"transparent",color:C.gold,border:`1px solid ${C.goldBorder}`},ghost:{background:"transparent",color:C.gray1,border:`1px solid ${C.border}`},danger:{background:C.redDim,color:C.red,border:"1px solid rgba(224,82,82,0.3)"},success:{background:C.greenDim,color:C.green,border:"1px solid rgba(76,175,125,0.3)"}};
  const s={sm:{padding:"6px 14px",fontSize:12},md:{padding:"9px 20px",fontSize:13},lg:{padding:"13px 28px",fontSize:15}};
  return <button onClick={onClick} disabled={disabled} style={{...v[variant],...s[size],borderRadius:8,fontWeight:700,fontFamily:FB,letterSpacing:"0.02em",opacity:disabled?0.4:1,transition:"all 0.15s",cursor:disabled?"not-allowed":"pointer",...sx}}>{children}</button>;
};
const Card=({children,style:sx,onClick})=>(
  <div onClick={onClick} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20,...sx,cursor:onClick?"pointer":"default",transition:"border-color 0.2s"}} onMouseEnter={e=>onClick&&(e.currentTarget.style.borderColor=C.border2)} onMouseLeave={e=>onClick&&(e.currentTarget.style.borderColor=C.border)}>{children}</div>
);
const MetricCard=({label,value,sub,color})=>(
  <Card style={{flex:1,minWidth:140}}>
    <div style={{fontSize:11,color:C.gray1,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{label}</div>
    <div style={{fontSize:32,fontFamily:FM,fontWeight:500,color:color||C.white,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.gray1,marginTop:6}}>{sub}</div>}
  </Card>
);
const PageHeader=({title,sub,action})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:12}}>
    <div><h1 style={{fontFamily:FD,fontSize:28,fontWeight:600,color:C.white,marginBottom:4}}>{title}</h1>{sub&&<p style={{fontSize:13,color:C.gray1}}>{sub}</p>}</div>
    {action}
  </div>
);
const SectionLabel=({children})=>(
  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:C.gray2,marginBottom:12}}>{children}</div>
);
const Divider=()=><div style={{height:1,background:C.border,margin:"16px 0"}}/>;
const Modal=({title,onClose,children,width=520})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,border:`1px solid ${C.border2}`,borderRadius:14,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:FD,fontSize:20,fontWeight:600}}>{title}</div>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.gray1,padding:"4px 10px",cursor:"pointer",fontSize:16,fontFamily:FB}}>✕</button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
);
const FG=({label,children,required})=>(
  <div style={{marginBottom:14}}>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.gray2,marginBottom:6}}>{label}{required&&<span style={{color:C.red}}> *</span>}</div>
    {children}
  </div>
);
const Toast=({msg,type="success",onClose})=>(
  <div style={{position:"fixed",top:16,left:16,right:16,zIndex:9999,background:type==="error"?C.redDim:C.greenDim,border:`1px solid ${type==="error"?"rgba(224,82,82,.4)":"rgba(76,175,125,.4)"}`,borderRadius:10,padding:"12px 16px",color:type==="error"?C.red:C.green,fontSize:13,fontWeight:600,fontFamily:FB,display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:500,margin:"0 auto"}} className="fade-in">
    <span>{msg}</span>
    <button onClick={onClose} style={{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:18,lineHeight:1,marginLeft:12}}>✕</button>
  </div>
);
const useToast=()=>{
  const [toast,setToast]=useState(null);
  const show=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};
  const el=toast?<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>:null;
  return[show,el];
};
const Icon=({name,size=16,color="currentColor"})=>{
  const icons={home:"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",orders:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",route:"M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",chart:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",check:"M5 13l4 4L19 7",x:"M6 18L18 6M6 6l12 12",plus:"M12 4v16m8-8H4",pkg:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",phone:"M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",loc:"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",star:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",scan:"M4 6h2M4 10h2M4 14h2M4 18h2M18 6h2M18 10h2M18 14h2M18 18h2M8 4v2M12 4v2M16 4v2M8 18v2M12 18v2M16 18v2",cam:"M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",sig:"M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",back:"M15 19l-7-7 7-7",settings:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",user:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",exclaim:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",eye:"M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",truck:"M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",download:"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"};
  const d=icons[name]||icons.exclaim;
  const isMulti=d.includes(" M");
  return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {isMulti?d.split(" M").map((seg,i)=><path key={i} d={i===0?seg:"M"+seg}/>):<path d={d}/>}
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════
   SIDEBAR NAV
═══════════════════════════════════════════════════════ */
const Sidebar=({role,active,setActive,onLogout,collapsed,setCollapsed})=>{
  const navs={
    pharmacy:[
      {id:"dashboard",label:"Dashboard",icon:"home"},
      {id:"create",label:"Create Order",icon:"plus"},
      {id:"orders",label:"Orders",icon:"orders"},
      {id:"reports",label:"Reports",icon:"chart"},
      {id:"account",label:"My Account",icon:"settings"},
    ],
    dispatch:[
      {id:"dashboard",label:"Dashboard",icon:"home"},
      {id:"tasks",label:"Tasks",icon:"check"},
      {id:"tickets",label:"Tickets",icon:"exclaim"},
      {id:"gigground",label:"Gig Ground Work",icon:"loc"},
      {id:"contractors",label:"Contractors",icon:"truck"},
      {id:"qc",label:"Quality Control",icon:"eye"},
      {id:"gigprep",label:"Gig Prep",icon:"route"},
      {id:"pickups",label:"Pickups",icon:"pkg"},
      {id:"orders",label:"Orders",icon:"orders"},
      {id:"livemap",label:"Live Map",icon:"loc"},
      {id:"exceptions",label:"Exceptions",icon:"exclaim"},
      {id:"sales",label:"Sales Pipeline",icon:"chart"},
      {id:"pharmacies",label:"Pharmacies",icon:"user"},
      {id:"reports",label:"Reports",icon:"download"},
      {id:"users",label:"User Mgmt",icon:"user"},
      {id:"account",label:"My Account",icon:"settings"},
    ],
  };
  const items=navs[role]||[];
  const w=collapsed?64:220;
  return(
    <div style={{width:w,minWidth:w,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100vh",overflowY:"auto",transition:"width 0.2s",flexShrink:0}}>
      <div style={{padding:"20px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between"}}>
        {!collapsed&&<div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${C.gold}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontFamily:FD,fontSize:12,fontWeight:700,color:C.white}}>M</span>
            <span style={{fontFamily:FD,fontSize:12,fontWeight:700,color:C.gold}}>D</span>
          </div>
          <span style={{fontFamily:FD,fontSize:17,fontWeight:600}}>MedDash</span>
        </div>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.gray2,padding:"4px 8px",cursor:"pointer",fontSize:12}}>
          {collapsed?"→":"←"}
        </button>
      </div>
      <div style={{flex:1,padding:"8px 0"}}>
        {items.map(item=>(
          <div key={item.id} onClick={()=>setActive(item.id)}
            style={{display:"flex",alignItems:"center",gap:12,padding:collapsed?"12px 0":"10px 16px",justifyContent:collapsed?"center":"flex-start",cursor:"pointer",background:active===item.id?C.goldDim:"transparent",borderLeft:`3px solid ${active===item.id?C.gold:"transparent"}`,color:active===item.id?C.gold:C.gray1,fontSize:13,fontWeight:active===item.id?700:500,transition:"all 0.15s",margin:"1px 0"}}>
            <Icon name={item.icon} size={16} color={active===item.id?C.gold:C.gray2}/>
            {!collapsed&&<span>{item.label}</span>}
          </div>
        ))}
      </div>
      <div style={{padding:"16px",borderTop:`1px solid ${C.border}`}}>
        <button onClick={onLogout} style={{width:"100%",padding:"9px",background:C.redDim,border:"1px solid rgba(224,82,82,.3)",color:C.red,borderRadius:8,fontSize:12,fontFamily:FB,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {!collapsed&&"Sign Out"}
        </button>
      </div>
    </div>
  );
};

/* ── MOBILE NAV ── */
const MobileNav=({role,active,setActive,onLogout,open,setOpen})=>{
  const allItems={
    pharmacy:[{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"create",icon:"➕",label:"Create Order"},{id:"orders",icon:"📋",label:"Orders"},{id:"reports",icon:"📊",label:"Reports"},{id:"account",icon:"👤",label:"My Account"}],
    dispatch:[{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"tasks",icon:"✓",label:"Tasks"},{id:"tickets",icon:"🎫",label:"Tickets"},{id:"gigground",icon:"🔍",label:"Gig Ground Work"},{id:"contractors",icon:"🚗",label:"Contractors"},{id:"qc",icon:"👁",label:"Quality Control"},{id:"gigprep",icon:"🗺",label:"Gig Prep"},{id:"pickups",icon:"📦",label:"Pickups"},{id:"orders",icon:"📋",label:"Orders"},{id:"livemap",icon:"📍",label:"Live Map"},{id:"exceptions",icon:"⚠",label:"Exceptions"},{id:"sales",icon:"📊",label:"Sales"},{id:"pharmacies",icon:"💊",label:"Pharmacies"},{id:"reports",icon:"⬇",label:"Reports"},{id:"users",icon:"👥",label:"User Mgmt"},{id:"account",icon:"👤",label:"My Account"}],
  };
  const tabItems={
    pharmacy:[{id:"dashboard",icon:"🏠",label:"Home"},{id:"orders",icon:"📋",label:"Orders"},{id:"create",icon:"➕",label:"New"},{id:"reports",icon:"📊",label:"Reports"},{id:"account",icon:"👤",label:"Account"}],
    dispatch:[{id:"dashboard",icon:"🏠",label:"Home"},{id:"orders",icon:"📋",label:"Orders"},{id:"livemap",icon:"📍",label:"Map"},{id:"exceptions",icon:"⚠",label:"Issues"},{id:"users",icon:"👥",label:"Users"}],
  };
  const label={pharmacy:"Pharmacy Portal",dispatch:"Admin Console"};
  return(
    <>
      <div className="md-topbar">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",border:`1.5px solid ${C.gold}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontFamily:FD,fontSize:11,fontWeight:700,color:C.white}}>M</span>
            <span style={{fontFamily:FD,fontSize:11,fontWeight:700,color:C.gold}}>D</span>
          </div>
          <span style={{fontFamily:FD,fontSize:19,fontWeight:600}}>MedDash</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Badge label={label[role]||role} color={C.gold} bg={C.goldDim}/>
          <button onClick={()=>setOpen(true)} style={{background:C.surface2,border:`1px solid ${C.border}`,color:C.gray1,padding:"7px 13px",borderRadius:7,fontSize:14,fontFamily:FB,fontWeight:700,cursor:"pointer"}}>☰</button>
        </div>
      </div>
      <div className={"md-drawer-overlay"+(open?" open":"")} onClick={()=>setOpen(false)}/>
      <div className={"md-drawer"+(open?" open":"")}>
        <div style={{padding:"20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:FD,fontSize:19,fontWeight:600}}>{label[role]}</div>
          <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",color:C.gray1,cursor:"pointer",fontSize:24,lineHeight:1}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {(allItems[role]||[]).map(item=>(
            <div key={item.id} onClick={()=>{setActive(item.id);setOpen(false);}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"13px 20px",cursor:"pointer",background:active===item.id?C.goldDim:"transparent",borderLeft:`3px solid ${active===item.id?C.gold:"transparent"}`,color:active===item.id?C.gold:C.gray1,fontSize:14,fontWeight:active===item.id?700:500}}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{padding:"16px 20px",borderTop:`1px solid ${C.border}`}}>
          <button onClick={()=>{Auth.clearSession();onLogout();setOpen(false);}} style={{width:"100%",padding:11,background:C.redDim,border:"1px solid rgba(224,82,82,.3)",color:C.red,borderRadius:8,fontSize:14,fontFamily:FB,fontWeight:700,cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>
      {(tabItems[role]||[]).length>0&&(
        <div className="md-bottom-nav">
          {(tabItems[role]||[]).map(t=>(
            <button key={t.id} onClick={()=>setActive(t.id)} style={{flex:1,padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",color:active===t.id?C.gold:C.gray2,cursor:"pointer",fontFamily:FB}}>
              <span style={{fontSize:22,lineHeight:1}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:active===t.id?800:500}}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════
   AUTH SCREENS
═══════════════════════════════════════════════════════ */
const AuthScreen=({onLogin})=>{
  const [view,setView]=useState("login");
  const [f,setF]=useState({identifier:"",username:"",phone:"",email:"",password:"",confirm:"",name:"",role:"driver",pharmacy:""});
  const [err,setErr]=useState("");const [msg,setMsg]=useState("");
  const [tempInfo,setTempInfo]=useState(null);const [pendingUser,setPendingUser]=useState(null);
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const Err=()=>err?<div style={{background:C.redDim,border:"1px solid rgba(224,82,82,.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:14,lineHeight:1.5}}>{err}</div>:null;
  const Msg=()=>msg?<div style={{background:C.greenDim,border:"1px solid rgba(76,175,125,.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.green,marginBottom:14}}>{msg}</div>:null;
  const LB=({onClick,children})=><button onClick={onClick} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontFamily:FB,fontSize:13,textDecoration:"underline",textUnderlineOffset:3}}>{children}</button>;

  const doLogin=()=>{
    setErr("");
    if(!f.identifier.trim())return setErr("Enter your username, email, or phone number.");
    if(!f.password)return setErr("Enter your password.");
    const res=Auth.login(f.identifier,f.password);
    if(!res.ok){setErr(res.error);return;}
    if(res.changePass){setPendingUser(res.user);setView("changePass");return;}
    onLogin(res.user);
  };
  const doRegister=()=>{
    setErr("");
    if(!f.name.trim())return setErr("Enter your full name.");
    if(!f.email.trim()&&!f.phone.trim())return setErr("Enter at least an email or phone number.");
    const res=Auth.register(f);
    if(!res.ok){setErr(res.error);return;}
    onLogin(res.user);
  };
  const doForgot=()=>{
    setErr("");
    if(!f.identifier.trim())return setErr("Enter your username, email, or phone number.");
    const res=Auth.forgotPassword(f.identifier);
    if(!res.ok){setErr(res.error);return;}
    setTempInfo(res);setView("tempShown");
  };
  const doChangePass=()=>{
    setErr("");
    const uid=pendingUser?pendingUser.id:(Auth.session()||{}).id;
    const res=Auth.changePassword(uid,f.password,f.confirm);
    if(!res.ok){setErr(res.error);return;}
    setMsg("Password updated!");setTimeout(()=>onLogin(Auth.session()),1200);
  };

  const Logo=()=>(
    <div style={{textAlign:"center",marginBottom:40}}>
      <div style={{width:76,height:76,borderRadius:"50%",background:C.bg,border:`2px solid ${C.gold}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <span style={{fontFamily:FD,fontSize:28,fontWeight:700,color:C.white}}>M</span>
        <span style={{fontFamily:FD,fontSize:28,fontWeight:700,color:C.gold}}>D</span>
      </div>
      <div style={{fontFamily:FD,fontSize:32,fontWeight:600,color:C.white}}>MedDash</div>
      <div style={{fontSize:13,color:C.gray1,marginTop:5}}>Pharmacy-First Delivery Platform</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",fontFamily:FB}}>
      <div style={{width:"100%",maxWidth:440}}>
        <Logo/>
        {view==="login"&&(
          <Card>
            <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:20,textAlign:"center"}}>Sign In</div>
            <Err/><Msg/>
            <FG label="Username, Email, or Phone Number" required>
              <input value={f.identifier} onChange={e=>up("identifier",e.target.value)} placeholder="username, email, or (555) 555-5555" autoCapitalize="none" autoComplete="username" onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
            </FG>
            <FG label="Password" required>
              <input type="password" value={f.password} onChange={e=>up("password",e.target.value)} placeholder="your password" autoComplete="current-password" onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
            </FG>
            <Btn onClick={doLogin} style={{width:"100%",padding:14,fontSize:16,borderRadius:10,marginBottom:14}}>Sign In →</Btn>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <LB onClick={()=>{setView("forgot");setErr("");}}>Forgot password?</LB>
              <LB onClick={()=>{setView("register");setErr("");}}>Create account</LB>
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:16}}>
              <div style={{fontSize:11,color:C.gray2,marginBottom:8,textAlign:"center",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>Quick Demo Access</div>
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                {[["Pharmacy","pharmacy"],["Driver","driver1"],["Dispatch","dispatch"]].map(([l,u])=>(
                  <button key={u} onClick={()=>{up("identifier",u);up("password","meddash2026");}} style={{background:C.goldDim,border:`1px solid ${C.goldBorder}`,color:C.gold,padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>{l}</button>
                ))}
              </div>
            </div>
          </Card>
        )}
        {view==="register"&&(
          <Card>
            <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:20,textAlign:"center"}}>Create Account</div>
            <Err/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FG label="Full Name" required><input value={f.name} onChange={e=>up("name",e.target.value)} placeholder="First Last"/></FG>
              <FG label="Account Type">
                <select value={f.role} onChange={e=>up("role",e.target.value)}>
                  <option value="driver">Driver</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="dispatch">Dispatcher</option>
                </select>
              </FG>
            </div>
            {f.role==="pharmacy"&&<FG label="Pharmacy Name" required><input value={f.pharmacy} onChange={e=>up("pharmacy",e.target.value)} placeholder="e.g. Sunrise Pharmacy"/></FG>}
            <FG label="Cell Phone Number">
              <input type="tel" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="(555) 555-5555" autoComplete="tel"/>
            </FG>
            <FG label="Email Address">
              <input type="email" value={f.email} onChange={e=>up("email",e.target.value)} placeholder="you@example.com" autoCapitalize="none"/>
            </FG>
            <div style={{fontSize:11,color:C.gray1,marginBottom:14,padding:"8px 12px",background:C.surface2,borderRadius:6}}>
              You can sign in with your phone number, email, or a username. At least one contact is required.
            </div>
            <FG label="Username (optional)">
              <input value={f.username} onChange={e=>up("username",e.target.value)} placeholder="choose a username (optional)" autoCapitalize="none"/>
            </FG>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FG label="Password" required><input type="password" value={f.password} onChange={e=>up("password",e.target.value)} placeholder="8+ characters"/></FG>
              <FG label="Confirm Password" required><input type="password" value={f.confirm} onChange={e=>up("confirm",e.target.value)} placeholder="repeat password"/></FG>
            </div>
            <Btn onClick={doRegister} style={{width:"100%",padding:14,fontSize:16,borderRadius:10,marginBottom:12}}>Create Account</Btn>
            <div style={{textAlign:"center"}}><LB onClick={()=>{setView("login");setErr("");}}>Back to Sign In</LB></div>
          </Card>
        )}
        {view==="forgot"&&(
          <Card>
            <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:8,textAlign:"center"}}>Reset Password</div>
            <div style={{fontSize:13,color:C.gray1,marginBottom:20,textAlign:"center",lineHeight:1.6}}>Enter your username, email, or phone number and we will generate a temporary password.</div>
            <Err/>
            <FG label="Username, Email, or Phone" required>
              <input value={f.identifier} onChange={e=>up("identifier",e.target.value)} placeholder="username, email, or phone" autoCapitalize="none" onKeyDown={e=>e.key==="Enter"&&doForgot()}/>
            </FG>
            <Btn onClick={doForgot} style={{width:"100%",padding:14,fontSize:16,borderRadius:10,marginBottom:12}}>Send Temp Password</Btn>
            <div style={{textAlign:"center"}}><LB onClick={()=>{setView("login");setErr("");}}>Back to Sign In</LB></div>
          </Card>
        )}
        {view==="tempShown"&&tempInfo&&(
          <Card>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:40,marginBottom:12}}>🔑</div>
              <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:8}}>Temp Password Ready</div>
              <div style={{fontSize:13,color:C.gray1,lineHeight:1.6}}>In production this is sent to <strong style={{color:C.white}}>{tempInfo.contact}</strong> via SMS and email. For this demo it is shown here:</div>
            </div>
            <div style={{background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:12,padding:24,textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:11,color:C.gray2,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Temporary Password</div>
              <div style={{fontFamily:FM,fontSize:30,fontWeight:700,color:C.gold,letterSpacing:"0.14em"}}>{tempInfo.tempPass}</div>
              <div style={{fontSize:12,color:C.gray2,marginTop:10}}>Use this to sign in, then you will be asked to set a new password.</div>
            </div>
            <Btn onClick={()=>{up("identifier",f.identifier);up("password",tempInfo.tempPass);setView("login");}} style={{width:"100%",padding:14,fontSize:16,borderRadius:10,marginBottom:12}}>Sign In with Temp Password →</Btn>
            <div style={{textAlign:"center"}}>
              <button onClick={()=>navigator.clipboard&&navigator.clipboard.writeText(tempInfo.tempPass)} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontFamily:FB,fontSize:13,textDecoration:"underline",textUnderlineOffset:3}}>Copy to clipboard</button>
            </div>
          </Card>
        )}
        {view==="changePass"&&(
          <Card>
            <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:8,textAlign:"center"}}>Set New Password</div>
            <div style={{fontSize:13,color:C.gray1,marginBottom:20,textAlign:"center"}}>{"Welcome " + (pendingUser?pendingUser.name:"back") + "! Create your permanent password."}</div>
            <Err/><Msg/>
            <FG label="New Password" required><input type="password" value={f.password} onChange={e=>up("password",e.target.value)} placeholder="At least 8 characters"/></FG>
            <FG label="Confirm Password" required><input type="password" value={f.confirm} onChange={e=>up("confirm",e.target.value)} placeholder="Repeat new password" onKeyDown={e=>e.key==="Enter"&&doChangePass()}/></FG>
            <Btn onClick={doChangePass} style={{width:"100%",padding:14,fontSize:16,borderRadius:10}}>Save New Password</Btn>
          </Card>
        )}
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:C.gray2}}>MedDash · 888-MED-DASH · Secure Login</div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   USER MANAGEMENT PAGE
═══════════════════════════════════════════════════════ */
const UserManagementPage=({onLogout})=>{
  const [users,setUsers]=useState(()=>Auth.getUsers());
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({name:"",username:"",phone:"",email:"",role:"driver",pharmacy:"",password:""});
  const [search,setSearch]=useState("");const [msg,setMsg]=useState("");const [msgType,setMsgType]=useState("success");
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const rc={dispatch:{c:C.blue,b:C.blueDim},pharmacy:{c:C.gold,b:C.goldDim},driver:{c:C.green,b:C.greenDim}};
  const refresh=()=>setUsers(Auth.getUsers());
  const showMsg=(m,t="success")=>{setMsg(m);setMsgType(t);};
  const doReset=(id)=>{
    const u=users.find(x=>x.id===id);if(!u)return;
    const res=Auth.forgotPassword(u.email||u.phone||u.username);
    if(res.ok){showMsg("Temp password for "+u.name+": "+res.tempPass);refresh();}
    else showMsg(res.error,"error");
  };
  const doAdd=()=>{
    if(!f.name.trim())return showMsg("Full name required.","error");
    if(!f.email.trim()&&!f.phone.trim())return showMsg("Email or phone required.","error");
    if(!f.password||f.password.length<8)return showMsg("Password must be 8+ characters.","error");
    const res=Auth.register({...f,confirm:f.password});
    if(!res.ok)return showMsg(res.error,"error");
    setShowNew(false);refresh();showMsg(f.name+" added successfully.");
    setF({name:"",username:"",phone:"",email:"",role:"driver",pharmacy:"",password:""});
  };
  const filtered=users.filter(u=>!search||u.name.toLowerCase().includes(search.toLowerCase())||u.username.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase())||(u.phone&&u.phone.includes(search)));
  return(
    <div className="fade-in">
      <PageHeader title="User Management" sub={"All "+users.length+" platform users — drivers, pharmacies, dispatchers"}
        action={<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn variant="ghost" size="sm" onClick={()=>exportCSV(users.map(u=>({Name:u.name,Username:u.username,Phone:u.phone||"",Email:u.email,Role:u.role,Status:u.status,Joined:u.created})),"meddash-users.csv")}>Export CSV</Btn>
          <Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Add User</Btn>
        </div>}
      />
      {msg&&<div style={{background:msgType==="error"?C.redDim:C.greenDim,border:`1px solid ${msgType==="error"?"rgba(224,82,82,.3)":"rgba(76,175,125,.3)"}`,borderRadius:8,padding:"10px 16px",fontSize:13,color:msgType==="error"?C.red:C.green,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{wordBreak:"break-all"}}>{msg}</span><button onClick={()=>setMsg("")} style={{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:18,marginLeft:12,flexShrink:0}}>✕</button></div>}
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>Add New User</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Full Name" required><input value={f.name} onChange={e=>up("name",e.target.value)} placeholder="First Last"/></FG>
            <FG label="Role">
              <select value={f.role} onChange={e=>up("role",e.target.value)}>
                <option value="driver">Driver</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="dispatch">Dispatcher</option>
              </select>
            </FG>
            <FG label="Cell Phone"><input type="tel" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="(555) 555-5555"/></FG>
            <FG label="Email"><input type="email" value={f.email} onChange={e=>up("email",e.target.value)} placeholder="email@example.com"/></FG>
            <FG label="Username (optional)"><input value={f.username} onChange={e=>up("username",e.target.value)} placeholder="optional username" autoCapitalize="none"/></FG>
            <FG label="Initial Password" required><input type="password" value={f.password} onChange={e=>up("password",e.target.value)} placeholder="8+ characters"/></FG>
            {f.role==="pharmacy"&&<FG label="Pharmacy Name"><input value={f.pharmacy} onChange={e=>up("pharmacy",e.target.value)} placeholder="Pharmacy name"/></FG>}
          </div>
          <div style={{fontSize:12,color:C.gray1,marginBottom:12}}>User will be sent login instructions to their phone/email. They can change their password on first login.</div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={doAdd}>Save User</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}} className="metric-flex">
        <MetricCard label="Total Users" value={users.length}/>
        <MetricCard label="Drivers" value={users.filter(u=>u.role==="driver").length} color={C.green}/>
        <MetricCard label="Pharmacies" value={users.filter(u=>u.role==="pharmacy").length} color={C.gold}/>
        <MetricCard label="Dispatchers" value={users.filter(u=>u.role==="dispatch").length} color={C.blue}/>
        <MetricCard label="Suspended" value={users.filter(u=>u.status==="suspended").length} color={C.red}/>
      </div>
      <Card style={{padding:"12px 16px",marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, username, email, or phone..." style={{maxWidth:380}}/>
      </Card>
      <Card style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Name</th><th className="hide-sm">Phone / Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u=>{
              const r=rc[u.role]||{c:C.gray1,b:C.surface2};
              return(
                <tr key={u.id}>
                  <td>
                    <div style={{fontWeight:600}}>{u.name}</div>
                    <div style={{fontSize:11,color:C.gray1,fontFamily:FM}}>{u.username}</div>
                    {u.pharmacy&&<div style={{fontSize:11,color:C.gold}}>{u.pharmacy}</div>}
                  </td>
                  <td className="hide-sm">
                    {u.phone&&<div style={{fontSize:12}}>{u.phone}</div>}
                    {u.email&&<div style={{fontSize:12,color:C.gray1}}>{u.email}</div>}
                  </td>
                  <td><Badge label={u.role} color={r.c} bg={r.b}/></td>
                  <td>
                    <Badge label={u.status==="active"?"Active":"Suspended"} color={u.status==="active"?C.green:C.red} bg={u.status==="active"?C.greenDim:C.redDim}/>
                    {u.tempPass&&<span style={{marginLeft:6,fontSize:10,color:C.yellow}}>⚠ temp pw</span>}
                  </td>
                  <td>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <Btn size="sm" variant="ghost" onClick={()=>doReset(u.id)}>Reset Pass</Btn>
                      {u.status==="active"
                        ?<Btn size="sm" variant="danger" onClick={()=>{Auth.updateUser(u.id,{status:"suspended"});refresh();showMsg(u.name+" suspended.");}}>Suspend</Btn>
                        :<Btn size="sm" variant="success" onClick={()=>{Auth.updateUser(u.id,{status:"active"});refresh();showMsg(u.name+" reactivated.");}}>Activate</Btn>
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.gray2}}>No users match your search.</div>}
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MY ACCOUNT PAGE
═══════════════════════════════════════════════════════ */
const MyAccountPage=({currentUser,onLogout})=>{
  const [f,setF]=useState({password:"",confirm:""});
  const [msg,setMsg]=useState("");const [err,setErr]=useState("");
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const rc={dispatch:{c:C.blue,b:C.blueDim},pharmacy:{c:C.gold,b:C.goldDim},driver:{c:C.green,b:C.greenDim}};
  const r=rc[currentUser.role]||{c:C.gray1,b:C.surface2};
  const doChange=()=>{
    setErr("");
    const res=Auth.changePassword(currentUser.id,f.password,f.confirm);
    if(!res.ok){setErr(res.error);return;}
    setMsg("Password updated successfully.");setF({password:"",confirm:""});
  };
  return(
    <div className="fade-in">
      <PageHeader title="My Account" sub="Manage your profile and credentials"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <SectionLabel>Profile</SectionLabel>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:C.goldDim,border:`2px solid ${C.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:C.gold,flexShrink:0}}>
              {currentUser.name?currentUser.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2):"?"}
            </div>
            <div>
              <div style={{fontSize:18,fontWeight:700}}>{currentUser.name}</div>
              <div style={{marginTop:4,display:"flex",gap:6,flexWrap:"wrap"}}><Badge label={currentUser.role} color={r.c} bg={r.b}/></div>
              {currentUser.pharmacy&&<div style={{fontSize:12,color:C.gold,marginTop:4}}>{currentUser.pharmacy}</div>}
            </div>
          </div>
          {[["Username",currentUser.username||"—"],["Phone",currentUser.phone||"—"],["Email",currentUser.email||"—"],["Account ID",currentUser.id],["Member Since",currentUser.created]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,gap:8}}>
              <span style={{fontSize:12,color:C.gray1,flexShrink:0}}>{l}</span>
              <span style={{fontSize:12,fontWeight:600,color:l==="Username"||l==="Account ID"?C.gold:C.white,fontFamily:l==="Username"||l==="Account ID"?FM:FB,textAlign:"right",wordBreak:"break-all"}}>{v}</span>
            </div>
          ))}
        </Card>
        <Card>
          <SectionLabel>Change Password</SectionLabel>
          {msg&&<div style={{background:C.greenDim,border:"1px solid rgba(76,175,125,.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.green,marginBottom:14}}>{msg}</div>}
          {err&&<div style={{background:C.redDim,border:"1px solid rgba(224,82,82,.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:14}}>{err}</div>}
          <FG label="New Password" required><input type="password" value={f.password} onChange={e=>up("password",e.target.value)} placeholder="At least 8 characters"/></FG>
          <FG label="Confirm Password" required><input type="password" value={f.confirm} onChange={e=>up("confirm",e.target.value)} placeholder="Repeat new password" onKeyDown={e=>e.key==="Enter"&&doChange()}/></FG>
          <Btn onClick={doChange} style={{width:"100%",marginBottom:16}}>Update Password</Btn>
          <Divider/>
          <SectionLabel>Session</SectionLabel>
          <Btn variant="danger" onClick={()=>{Auth.clearSession();onLogout();}} style={{width:"100%"}}>Sign Out of All Devices</Btn>
        </Card>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   PHARMACY PORTAL PAGES  (all metrics live from localStorage)
═══════════════════════════════════════════════════════ */
const PharmacyDashboard=()=>{
  const orders=DS.list(SK.orders);
  const today=new Date().toISOString().split("T")[0];
  const todayOrders=orders.filter(o=>o.created&&o.created.startsWith(today));
  const count=(s)=>orders.filter(o=>o.status===s).length;
  return(
    <div className="fade-in">
      <PageHeader title="Dashboard" sub="Live delivery status for your pharmacy"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}} className="metric-flex">
        <MetricCard label="Total Orders" value={orders.length} sub="All time"/>
        <MetricCard label="Ready for Pickup" value={count("ready")} color={C.gold} sub="Awaiting driver"/>
        <MetricCard label="In Transit" value={count("in_transit")} color={C.yellow} sub="Out for delivery"/>
        <MetricCard label="Delivered" value={count("delivered")} color={C.green} sub="Completed"/>
        <MetricCard label="Failed" value={count("failed")} color={C.red} sub="Needs attention"/>
        <MetricCard label="Today" value={todayOrders.length} sub="Orders created today"/>
      </div>
      {orders.length===0?(
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{fontSize:40,marginBottom:16}}>📦</div>
          <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:8}}>No orders yet</div>
          <div style={{color:C.gray1,marginBottom:20}}>Create your first delivery order to get started.</div>
          <Btn onClick={()=>{}}>Create First Order</Btn>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Order ID</th><th>Recipient</th><th>Service</th><th>Status</th><th className="hide-sm">Driver</th></tr></thead>
            <tbody>
              {orders.slice().reverse().slice(0,8).map(o=>(
                <tr key={o.id}>
                  <td style={{fontFamily:FM,fontSize:12,color:C.gold}}>{o.id}</td>
                  <td style={{fontWeight:600}}>{o.recipient}<div style={{fontSize:11,color:C.gray1}}>{o.address}</div></td>
                  <td style={{fontSize:12}}>{o.service}</td>
                  <td><StatusBadge status={o.status}/></td>
                  <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{o.driver||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const CreateOrder=()=>{
  const [showToast,toastEl]=useToast();
  const [f,setF]=useState({recipient:"",phone:"",address:"",zip:"",service:"Same-Day Standard",packages:1,sig:false,sensitive:false,notes:""});
  const [saved,setSaved]=useState(false);
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!f.recipient.trim())return showToast("Recipient name required.","error");
    if(!f.address.trim())return showToast("Delivery address required.","error");
    if(!f.phone.trim())return showToast("Recipient phone required.","error");
    const order={id:"ORD-"+Date.now().toString().slice(-6),recipient:f.recipient,phone:f.phone,address:f.address,zip:f.zip,service:f.service,packages:Number(f.packages),sig:f.sig,sensitive:f.sensitive,notes:f.notes,status:"ready",driver:null,route:null,created:new Date().toISOString(),pharmacy:Auth.session()?.pharmacy||"Your Pharmacy"};
    DS.push(SK.orders,order);
    logAudit(Auth.session()?.name||"Pharmacy","Order created",order.id);
    setSaved(true);showToast("Order "+order.id+" created! Status: Ready for pickup.");
    setF({recipient:"",phone:"",address:"",zip:"",service:"Same-Day Standard",packages:1,sig:false,sensitive:false,notes:""});
    setTimeout(()=>setSaved(false),3000);
  };
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Create Order" sub="Submit a new prescription delivery"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <SectionLabel>Recipient</SectionLabel>
          <FG label="Full Name" required><input value={f.recipient} onChange={e=>up("recipient",e.target.value)} placeholder="Patient full name"/></FG>
          <FG label="Cell Phone" required><input type="tel" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="(718) 555-0000"/></FG>
          <FG label="Delivery Address" required><input value={f.address} onChange={e=>up("address",e.target.value)} placeholder="Street address, Apt #"/></FG>
          <FG label="ZIP Code"><input value={f.zip} onChange={e=>up("zip",e.target.value)} placeholder="11354" style={{maxWidth:100}}/></FG>
          <FG label="Notes"><textarea value={f.notes} onChange={e=>up("notes",e.target.value)} placeholder="Gate code, floor, special instructions..." rows={3}/></FG>
        </Card>
        <Card>
          <SectionLabel>Service &amp; Options</SectionLabel>
          <FG label="Service Level">
            <select value={f.service} onChange={e=>up("service",e.target.value)}>
              <option>Next-Day Batch</option>
              <option>Same-Day Standard</option>
              <option>Priority 2-Hour</option>
              <option>Time Window</option>
            </select>
          </FG>
          <FG label="Number of Packages">
            <input type="number" value={f.packages} min={1} max={20} onChange={e=>up("packages",e.target.value)} style={{maxWidth:80}}/>
          </FG>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={f.sig} onChange={e=>up("sig",e.target.checked)} style={{width:"auto",accentColor:C.gold}}/>
              <span style={{fontSize:14}}>Signature required on delivery</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={f.sensitive} onChange={e=>up("sensitive",e.target.checked)} style={{width:"auto",accentColor:C.gold}}/>
              <span style={{fontSize:14}}>Sensitive / controlled substance</span>
            </label>
          </div>
          <div style={{background:C.surface2,borderRadius:8,padding:"12px 16px",marginBottom:20}}>
            <div style={{fontSize:12,color:C.gray1,marginBottom:6}}>Estimated Cost</div>
            <div style={{fontFamily:FM,fontSize:20,color:C.gold}}>
              {f.service==="Next-Day Batch"?"$8–11":f.service==="Same-Day Standard"?"$13–18":f.service==="Priority 2-Hour"?"$20–30":"$18–22"}
            </div>
            <div style={{fontSize:11,color:C.gray2,marginTop:4}}>+ ${f.sig?"5":"0"} verified delivery fee</div>
          </div>
          <Btn onClick={submit} style={{width:"100%",padding:14,fontSize:16}}>Submit Order →</Btn>
          {saved&&<div style={{textAlign:"center",marginTop:8,fontSize:13,color:C.green}}>Order created and queued for pickup!</div>}
        </Card>
      </div>
    </div>
  );
};

const OrdersTable=({onSelect})=>{
  const [showToast,toastEl]=useToast();
  const [orders,setOrders]=useState(()=>DS.list(SK.orders));
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const filtered=orders.filter(o=>(filter==="all"||o.status===filter)&&(!search||o.recipient.toLowerCase().includes(search.toLowerCase())||o.id.includes(search)));
  const statusOptions=["all","ready","assigned","in_transit","delivered","failed"];
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Orders" sub={orders.length+" total orders"}
        action={<div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" size="sm" onClick={()=>exportCSV(orders,"orders.csv")}>Export CSV</Btn>
        </div>}
      />
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {statusOptions.map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${filter===s?C.gold:C.border}`,background:filter===s?C.goldDim:"transparent",color:filter===s?C.gold:C.gray1,fontSize:12,fontWeight:700,fontFamily:FB,cursor:"pointer",textTransform:"capitalize"}}>
            {s==="all"?"All":s.replace("_"," ")}
          </button>
        ))}
      </div>
      <Card style={{padding:"10px 16px",marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search recipient or order ID..." style={{maxWidth:320}}/>
      </Card>
      {orders.length===0?(
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No orders yet</div>
          <div style={{color:C.gray1}}>Create your first delivery order to see it here.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Order</th><th>Recipient</th><th className="hide-sm">Service</th><th>Status</th><th className="hide-sm">Driver</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={6} style={{textAlign:"center",color:C.gray2,padding:32}}>No orders match filter</td></tr>:filtered.slice().reverse().map(o=>(
                <tr key={o.id} style={{cursor:"pointer"}} onClick={()=>onSelect&&onSelect(o)}>
                  <td style={{fontFamily:FM,fontSize:12,color:C.gold}}>{o.id}</td>
                  <td style={{fontWeight:600}}>{o.recipient}<div style={{fontSize:11,color:C.gray1}}>{o.phone}</div></td>
                  <td className="hide-sm" style={{fontSize:12}}>{o.service}</td>
                  <td><StatusBadge status={o.status}/></td>
                  <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{o.driver||"Unassigned"}</td>
                  <td onClick={e=>e.stopPropagation()}>
                    {o.status==="ready"&&<Btn size="sm" variant="ghost" onClick={()=>{DS.update(SK.orders,o.id,{status:"assigned"});setOrders(DS.list(SK.orders));showToast(o.id+" updated to Assigned");}}>Assign</Btn>}
                    {o.status==="failed"&&<Btn size="sm" variant="secondary" onClick={()=>{DS.update(SK.orders,o.id,{status:"ready"});setOrders(DS.list(SK.orders));showToast(o.id+" reset to Ready");}}>Retry</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const PharmacyReports=()=>{
  const orders=DS.list(SK.orders);
  const delivered=orders.filter(o=>o.status==="delivered").length;
  const failed=orders.filter(o=>o.status==="failed").length;
  const total=orders.length;
  const rate=total>0?Math.round((delivered/total)*100):0;
  return(
    <div className="fade-in">
      <PageHeader title="Reports" sub="Delivery performance overview"
        action={<div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" size="sm" onClick={()=>exportCSV(DS.list(SK.orders),"orders-report.csv")}>Export CSV</Btn>
        </div>}
      />
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}} className="metric-flex">
        <MetricCard label="Total Orders" value={total}/>
        <MetricCard label="Delivered" value={delivered} color={C.green}/>
        <MetricCard label="Failed" value={failed} color={C.red}/>
        <MetricCard label="Success Rate" value={total>0?rate+"%":"—"} color={rate>=90?C.green:C.yellow}/>
        <MetricCard label="Pending" value={orders.filter(o=>o.status==="ready"||o.status==="assigned"||o.status==="in_transit").length} color={C.gold}/>
      </div>
      {total===0&&<Card style={{textAlign:"center",padding:48}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No data yet</div><div style={{color:C.gray1}}>Create some orders to see your performance metrics here.</div></Card>}
      {total>0&&(
        <Card>
          <SectionLabel>Order Breakdown by Status</SectionLabel>
          {["ready","assigned","in_transit","delivered","failed"].map(s=>{
            const c=orders.filter(o=>o.status===s).length;
            const pct=total>0?Math.round((c/total)*100):0;
            return(
              <div key={s} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{s.replace("_"," ")}</span>
                  <span style={{fontSize:13,fontFamily:FM,color:C.gold}}>{c} ({pct}%)</span>
                </div>
                <div style={{height:6,background:C.surface2,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:pct+"%",height:"100%",background:s==="delivered"?C.green:s==="failed"?C.red:s==="in_transit"?C.yellow:C.gold,borderRadius:3,transition:"width 0.6s ease"}}/>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DISPATCH PORTAL PAGES (all live data from localStorage)
═══════════════════════════════════════════════════════ */
const DispatchDashboard=()=>{
  const [showToast,toastEl]=useToast();
  const orders=DS.list(SK.orders);
  const routes=DS.list(SK.routes);
  const drivers=Auth.getUsers().filter(u=>u.role==="driver"&&u.status==="active");
  const exceptions=DS.list(SK.exceptions);
  const tasks=DS.list(SK.tasks);
  const today=new Date().toISOString().split("T")[0];
  const todayOrders=orders.filter(o=>o.created&&o.created.startsWith(today));
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Dashboard" sub="Operations overview — live data"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}} className="metric-flex">
        <MetricCard label="Total Orders" value={orders.length} sub="All time"/>
        <MetricCard label="Active Routes" value={routes.filter(r=>r.status==="in_progress").length} color={C.yellow}/>
        <MetricCard label="Active Drivers" value={drivers.length} color={C.green}/>
        <MetricCard label="Delivered" value={orders.filter(o=>o.status==="delivered").length} color={C.green}/>
        <MetricCard label="Open Exceptions" value={exceptions.filter(e=>e.status==="open").length} color={C.red}/>
        <MetricCard label="Pending Tasks" value={tasks.filter(t=>t.status!=="completed").length} color={C.gold}/>
      </div>
      {orders.length===0&&routes.length===0&&(
        <Card style={{textAlign:"center",padding:48,marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:16}}>🚀</div>
          <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:8}}>Ready for Launch</div>
          <div style={{color:C.gray1,marginBottom:20,maxWidth:400,margin:"0 auto 20px"}}>All metrics start at zero. Add users, create orders, and build routes to see live data here.</div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={()=>showToast("Go to User Mgmt to add drivers and pharmacies")}>Add Users</Btn>
            <Btn variant="secondary" onClick={()=>showToast("Pharmacies create orders from their portal")}>Create Orders</Btn>
          </div>
        </Card>
      )}
      {routes.length>0&&(
        <Card style={{padding:0,overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:13}}>Recent Routes</div>
          <table>
            <thead><tr><th>Route ID</th><th>Driver</th><th>Stops</th><th>Status</th></tr></thead>
            <tbody>
              {routes.slice().reverse().slice(0,5).map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:FM,fontSize:12,color:C.gold}}>{r.id}</td>
                  <td style={{fontWeight:600}}>{r.driver||"Unassigned"}</td>
                  <td>{r.stops||0} stops</td>
                  <td><StatusBadge status={r.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const TasksPage=()=>{
  const [showToast,toastEl]=useToast();
  const [tasks,setTasks]=useState(()=>DS.list(SK.tasks));
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({title:"",priority:"medium",due:"",assignee:""});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const refresh=()=>setTasks(DS.list(SK.tasks));
  const addTask=()=>{
    if(!f.title.trim())return showToast("Task title required.","error");
    DS.push(SK.tasks,{id:"TSK-"+Date.now(),title:f.title,priority:f.priority,due:f.due,assignee:f.assignee,status:"open",created:new Date().toISOString()});
    refresh();showToast("Task created.");setShowNew(false);setF({title:"",priority:"medium",due:"",assignee:""});
  };
  const complete=(id)=>{DS.update(SK.tasks,id,{status:"completed",completedAt:new Date().toISOString()});refresh();showToast("Task completed.");};
  const del=(id)=>{DS.set(SK.tasks,DS.list(SK.tasks).filter(t=>t.id!==id));refresh();showToast("Task deleted.");};
  const pc={high:{c:C.red,b:C.redDim},medium:{c:C.yellow,b:C.yellowDim},low:{c:C.green,b:C.greenDim}};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Tasks" sub={tasks.filter(t=>t.status!=="completed").length+" open tasks"}
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ New Task</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>New Task</SectionLabel>
          <FG label="Task Title" required><input value={f.title} onChange={e=>up("title",e.target.value)} placeholder="Describe the task..."/></FG>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <FG label="Priority">
              <select value={f.priority} onChange={e=>up("priority",e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </FG>
            <FG label="Due Date"><input type="date" value={f.due} onChange={e=>up("due",e.target.value)}/></FG>
            <FG label="Assignee"><input value={f.assignee} onChange={e=>up("assignee",e.target.value)} placeholder="Name or role"/></FG>
          </div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={addTask}>Save Task</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {tasks.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>✓</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No tasks yet</div>
          <div style={{color:C.gray1}}>Create a task to track action items for your team.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Task</th><th>Priority</th><th className="hide-sm">Assignee</th><th className="hide-sm">Due</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.slice().reverse().map(t=>{
                const p=pc[t.priority]||{c:C.gray1,b:C.surface2};
                return(
                  <tr key={t.id} style={{opacity:t.status==="completed"?0.5:1}}>
                    <td style={{fontWeight:600}}>{t.title}</td>
                    <td><Badge label={t.priority} color={p.c} bg={p.b}/></td>
                    <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{t.assignee||"—"}</td>
                    <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{t.due||"—"}</td>
                    <td><StatusBadge status={t.status==="completed"?"completed":"open"}/></td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        {t.status!=="completed"&&<Btn size="sm" variant="success" onClick={()=>complete(t.id)}>Complete</Btn>}
                        <Btn size="sm" variant="danger" onClick={()=>del(t.id)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const TicketsPage=()=>{
  const [showToast,toastEl]=useToast();
  const [tickets,setTickets]=useState(()=>DS.list(SK.tickets));
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({title:"",type:"Delivery Issue",orderId:"",description:""});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const refresh=()=>setTickets(DS.list(SK.tickets));
  const addTicket=()=>{
    if(!f.title.trim())return showToast("Ticket title required.","error");
    DS.push(SK.tickets,{id:"TKT-"+Date.now(),title:f.title,type:f.type,orderId:f.orderId,description:f.description,status:"open",created:new Date().toISOString()});
    refresh();showToast("Ticket created.");setShowNew(false);setF({title:"",type:"Delivery Issue",orderId:"",description:""});
  };
  const close=(id)=>{DS.update(SK.tickets,id,{status:"closed",closedAt:new Date().toISOString()});refresh();showToast("Ticket closed.");};
  const escalate=(id)=>{DS.update(SK.tickets,id,{status:"escalated"});refresh();showToast("Ticket escalated.");};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Tickets" sub={tickets.filter(t=>t.status==="open").length+" open tickets"}
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ New Ticket</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>New Support Ticket</SectionLabel>
          <FG label="Title" required><input value={f.title} onChange={e=>up("title",e.target.value)} placeholder="Brief description of the issue"/></FG>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FG label="Type">
              <select value={f.type} onChange={e=>up("type",e.target.value)}>
                <option>Delivery Issue</option>
                <option>Driver Issue</option>
                <option>Pharmacy Complaint</option>
                <option>Patient Complaint</option>
                <option>System Issue</option>
                <option>Billing</option>
                <option>Other</option>
              </select>
            </FG>
            <FG label="Order ID (optional)"><input value={f.orderId} onChange={e=>up("orderId",e.target.value)} placeholder="ORD-XXXXX"/></FG>
          </div>
          <FG label="Description"><textarea value={f.description} onChange={e=>up("description",e.target.value)} rows={3} placeholder="Detailed description..."/></FG>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={addTicket}>Create Ticket</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {tickets.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>🎫</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No tickets yet</div>
          <div style={{color:C.gray1}}>Open a ticket to track delivery issues or support cases.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Ticket</th><th>Type</th><th className="hide-sm">Order</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {tickets.slice().reverse().map(t=>(
                <tr key={t.id}>
                  <td style={{fontWeight:600}}>{t.title}<div style={{fontSize:11,color:C.gray2}}>{new Date(t.created).toLocaleDateString()}</div></td>
                  <td style={{fontSize:12}}>{t.type}</td>
                  <td className="hide-sm" style={{fontSize:12,fontFamily:FM,color:C.gold}}>{t.orderId||"—"}</td>
                  <td><StatusBadge status={t.status}/></td>
                  <td>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {t.status==="open"&&<Btn size="sm" variant="danger" onClick={()=>escalate(t.id)}>Escalate</Btn>}
                      {t.status!=="closed"&&<Btn size="sm" variant="success" onClick={()=>close(t.id)}>Close</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const ExceptionsPage=()=>{
  const [showToast,toastEl]=useToast();
  const [exceptions,setExceptions]=useState(()=>DS.list(SK.exceptions));
  const refresh=()=>setExceptions(DS.list(SK.exceptions));
  const resolve=(id)=>{DS.update(SK.exceptions,id,{status:"resolved",resolvedAt:new Date().toISOString()});refresh();showToast("Exception resolved.");};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Exceptions" sub="Failed and flagged deliveries"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}} className="metric-flex">
        <MetricCard label="Open" value={exceptions.filter(e=>e.status==="open").length} color={C.red}/>
        <MetricCard label="Resolved" value={exceptions.filter(e=>e.status==="resolved").length} color={C.green}/>
        <MetricCard label="Total" value={exceptions.length}/>
      </div>
      {exceptions.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>✅</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No exceptions</div>
          <div style={{color:C.gray1}}>All deliveries are on track. Exceptions appear here automatically when drivers report failed deliveries.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Exception</th><th>Order</th><th>Type</th><th className="hide-sm">Driver</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {exceptions.slice().reverse().map(ex=>(
                <tr key={ex.id}>
                  <td style={{fontFamily:FM,fontSize:12,color:C.red}}>{ex.id}</td>
                  <td style={{fontFamily:FM,fontSize:12,color:C.gold}}>{ex.orderId||ex.order||"—"}</td>
                  <td style={{fontWeight:600}}>{ex.type}<div style={{fontSize:11,color:C.gray1}}>{ex.address||""}</div></td>
                  <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{ex.driver||"—"}</td>
                  <td><StatusBadge status={ex.status}/></td>
                  <td>
                    {ex.status==="open"&&<Btn size="sm" variant="success" onClick={()=>resolve(ex.id)}>Resolve</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const LiveMap=()=>{
  const drivers=Auth.getUsers().filter(u=>u.role==="driver"&&u.status==="active");
  const routes=DS.list(SK.routes);
  const [selected,setSelected]=useState(null);
  const locs=drivers.map(d=>{
    try{return{...d,loc:JSON.parse(localStorage.getItem("meddash_driver_location_"+d.id)||"null")};}
    catch{return{...d,loc:null};}
  });
  const isRecent=(ts)=>ts&&(Date.now()-ts)<120000;
  return(
    <div className="fade-in">
      <PageHeader title="Live Map" sub="Driver locations and active routes"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}} className="metric-flex">
        <MetricCard label="Active Drivers" value={locs.filter(d=>d.loc&&isRecent(d.loc.ts)).length} color={C.green}/>
        <MetricCard label="Offline" value={locs.filter(d=>!d.loc||!isRecent(d.loc.ts)).length} color={C.gray1}/>
        <MetricCard label="Active Routes" value={routes.filter(r=>r.status==="in_progress").length} color={C.yellow}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <SectionLabel>Driver Locations</SectionLabel>
          {drivers.length===0?(
            <div style={{textAlign:"center",padding:32,color:C.gray2}}>No active drivers yet. Add drivers in User Management.</div>
          ):locs.map(d=>{
            const live=d.loc&&isRecent(d.loc.ts);
            return(
              <div key={d.id} onClick={()=>setSelected(selected?.id===d.id?null:d)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:live?C.green:C.gray3,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>{d.name}</div>
                    <div style={{fontSize:11,color:C.gray1}}>{live?"Live GPS":d.loc?"Last seen":"No location shared"}</div>
                  </div>
                </div>
                {live&&<a href={"https://maps.google.com/?q="+d.loc.lat+","+d.loc.lng} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}><Btn size="sm" variant="secondary">Maps</Btn></a>}
              </div>
            );
          })}
        </Card>
        <Card>
          <SectionLabel>Active Routes</SectionLabel>
          {routes.filter(r=>r.status==="in_progress").length===0?(
            <div style={{textAlign:"center",padding:32,color:C.gray2}}>No active routes. Routes appear here when drivers start them.</div>
          ):routes.filter(r=>r.status==="in_progress").map(r=>(
            <div key={r.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:FM,fontSize:12,color:C.gold}}>{r.id}</span>
                <StatusBadge status={r.status}/>
              </div>
              <div style={{fontSize:13,fontWeight:600}}>{r.driver||"Unassigned"}</div>
              <div style={{fontSize:12,color:C.gray1}}>{r.stops||0} stops · {r.completed||0} completed</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

const ContractorsPage=()=>{
  const [showToast,toastEl]=useToast();
  const drivers=Auth.getUsers().filter(u=>u.role==="driver");
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({name:"",phone:"",email:"",password:"meddash2026"});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const addDriver=()=>{
    if(!f.name.trim())return showToast("Name required.","error");
    if(!f.phone.trim()&&!f.email.trim())return showToast("Phone or email required.","error");
    const res=Auth.register({...f,role:"driver",confirm:f.password,username:""});
    if(!res.ok)return showToast(res.error,"error");
    showToast(f.name+" added as driver. They can now log in.");setShowNew(false);setF({name:"",phone:"",email:"",password:"meddash2026"});
  };
  const suspendDriver=(id)=>{Auth.updateUser(id,{status:"suspended"});showToast("Driver suspended.");};
  const activateDriver=(id)=>{Auth.updateUser(id,{status:"active"});showToast("Driver activated.");};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Contractors" sub={drivers.length+" registered drivers"}
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Add Driver</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>Add New Driver</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Full Name" required><input value={f.name} onChange={e=>up("name",e.target.value)} placeholder="Driver full name"/></FG>
            <FG label="Cell Phone"><input type="tel" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="(555) 555-5555"/></FG>
            <FG label="Email"><input type="email" value={f.email} onChange={e=>up("email",e.target.value)} placeholder="driver@email.com"/></FG>
            <FG label="Initial Password"><input type="password" value={f.password} onChange={e=>up("password",e.target.value)} placeholder="They will change this"/></FG>
          </div>
          <div style={{fontSize:12,color:C.gray1,marginBottom:12}}>Driver will log in with their phone or email and the initial password. They can change it after first login.</div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={addDriver}>Add Driver</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {drivers.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>🚗</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No drivers yet</div>
          <div style={{color:C.gray1}}>Add your first driver to start building routes.</div>
        </Card>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {drivers.map(d=>(
            <Card key={d.id}>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:d.status==="active"?C.goldDim:C.surface2,border:`2px solid ${d.status==="active"?C.gold:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:d.status==="active"?C.gold:C.gray2,flexShrink:0}}>
                  {d.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:700}}>{d.name}</div>
                  <StatusBadge status={d.status}/>
                </div>
              </div>
              {d.phone&&<div style={{fontSize:12,color:C.gray1,marginBottom:4}}><a href={"tel:"+d.phone.replace(/\D/g,"")} style={{color:C.gold,textDecoration:"none"}}>📞 {d.phone}</a></div>}
              {d.email&&<div style={{fontSize:12,color:C.gray1,marginBottom:8}}>{d.email}</div>}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                {d.phone&&<a href={"tel:"+d.phone.replace(/\D/g,"")} style={{textDecoration:"none"}}><Btn size="sm" variant="secondary">Call</Btn></a>}
                {d.phone&&<a href={"sms:"+d.phone.replace(/\D/g,"")} style={{textDecoration:"none"}}><Btn size="sm" variant="ghost">SMS</Btn></a>}
                {d.status==="active"?<Btn size="sm" variant="danger" onClick={()=>suspendDriver(d.id)}>Suspend</Btn>:<Btn size="sm" variant="success" onClick={()=>activateDriver(d.id)}>Activate</Btn>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const PharmaciesPage=()=>{
  const [showToast,toastEl]=useToast();
  const pharmas=Auth.getUsers().filter(u=>u.role==="pharmacy");
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({name:"",pharmacyName:"",phone:"",email:"",password:"meddash2026"});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const addPharma=()=>{
    if(!f.pharmacyName.trim())return showToast("Pharmacy name required.","error");
    if(!f.phone.trim()&&!f.email.trim())return showToast("Phone or email required.","error");
    const res=Auth.register({name:f.name||f.pharmacyName,phone:f.phone,email:f.email,password:f.password,confirm:f.password,role:"pharmacy",pharmacy:f.pharmacyName,username:""});
    if(!res.ok)return showToast(res.error,"error");
    showToast(f.pharmacyName+" added! They can now log in.");setShowNew(false);setF({name:"",pharmacyName:"",phone:"",email:"",password:"meddash2026"});
  };
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Pharmacies" sub={pharmas.length+" pharmacy accounts"}
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Add Pharmacy</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>Add New Pharmacy</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Pharmacy Name" required><input value={f.pharmacyName} onChange={e=>up("pharmacyName",e.target.value)} placeholder="e.g. Sunrise Pharmacy"/></FG>
            <FG label="Contact Name"><input value={f.name} onChange={e=>up("name",e.target.value)} placeholder="Primary contact"/></FG>
            <FG label="Phone"><input type="tel" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="(555) 555-5555"/></FG>
            <FG label="Email"><input type="email" value={f.email} onChange={e=>up("email",e.target.value)} placeholder="pharmacy@email.com"/></FG>
          </div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={addPharma}>Add Pharmacy</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {pharmas.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>💊</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No pharmacies yet</div>
          <div style={{color:C.gray1}}>Add your first pharmacy account to get started.</div>
        </Card>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {pharmas.map(p=>(
            <Card key={p.id}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4,color:C.gold}}>{p.pharmacy||p.name}</div>
              <div style={{fontSize:13,marginBottom:8}}>{p.name}</div>
              {p.phone&&<div style={{fontSize:12,color:C.gray1,marginBottom:4}}><a href={"tel:"+p.phone.replace(/\D/g,"")} style={{color:C.gold,textDecoration:"none"}}>📞 {p.phone}</a></div>}
              {p.email&&<div style={{fontSize:12,color:C.gray1,marginBottom:8}}>{p.email}</div>}
              <Badge label={p.status} color={p.status==="active"?C.green:C.red} bg={p.status==="active"?C.greenDim:C.redDim}/>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                {p.phone&&<a href={"tel:"+p.phone.replace(/\D/g,"")} style={{textDecoration:"none"}}><Btn size="sm" variant="secondary">Call</Btn></a>}
                {p.phone&&<a href={"sms:"+p.phone.replace(/\D/g,"")} style={{textDecoration:"none"}}><Btn size="sm" variant="ghost">SMS</Btn></a>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const PickupsPage=()=>{
  const [showToast,toastEl]=useToast();
  const [pickups,setPickups]=useState(()=>DS.list(SK.pickups));
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({pharmacy:"",time:"",driver:"",notes:""});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const drivers=Auth.getUsers().filter(u=>u.role==="driver"&&u.status==="active");
  const pharmas=Auth.getUsers().filter(u=>u.role==="pharmacy");
  const refresh=()=>setPickups(DS.list(SK.pickups));
  const addPickup=()=>{
    if(!f.pharmacy)return showToast("Select a pharmacy.","error");
    if(!f.time)return showToast("Select a pickup time.","error");
    DS.push(SK.pickups,{id:"PU-"+Date.now(),pharmacy:f.pharmacy,time:f.time,driver:f.driver,notes:f.notes,status:"scheduled",created:new Date().toISOString()});
    refresh();showToast("Pickup scheduled.");setShowNew(false);setF({pharmacy:"",time:"",driver:"",notes:""});
  };
  const assign=(id,driver)=>{DS.update(SK.pickups,id,{driver,status:"assigned"});refresh();showToast("Driver assigned.");};
  const complete=(id)=>{DS.update(SK.pickups,id,{status:"completed",completedAt:new Date().toISOString()});refresh();showToast("Pickup completed.");};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Pickups" sub="Pharmacy pickup schedule"
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Schedule Pickup</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>Schedule Pickup</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Pharmacy" required>
              <select value={f.pharmacy} onChange={e=>up("pharmacy",e.target.value)}>
                <option value="">Select pharmacy...</option>
                {pharmas.map(p=><option key={p.id} value={p.pharmacy||p.name}>{p.pharmacy||p.name}</option>)}
              </select>
            </FG>
            <FG label="Pickup Time" required><input type="datetime-local" value={f.time} onChange={e=>up("time",e.target.value)}/></FG>
            <FG label="Assign Driver">
              <select value={f.driver} onChange={e=>up("driver",e.target.value)}>
                <option value="">Unassigned</option>
                {drivers.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </FG>
            <FG label="Notes"><input value={f.notes} onChange={e=>up("notes",e.target.value)} placeholder="Any special instructions"/></FG>
          </div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={addPickup}>Schedule</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {pickups.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>📦</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No pickups scheduled</div>
          <div style={{color:C.gray1}}>Schedule a pharmacy pickup to see it here.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Pharmacy</th><th>Time</th><th>Driver</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {pickups.slice().reverse().map(p=>(
                <tr key={p.id}>
                  <td style={{fontWeight:600}}>{p.pharmacy}</td>
                  <td style={{fontSize:12,color:C.gray1}}>{p.time?new Date(p.time).toLocaleString():"—"}</td>
                  <td style={{fontSize:12}}>{p.driver||"Unassigned"}</td>
                  <td><StatusBadge status={p.status}/></td>
                  <td>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {p.status==="scheduled"&&(
                        <select onChange={e=>e.target.value&&assign(p.id,e.target.value)} defaultValue="" style={{fontSize:11,padding:"4px 8px",borderRadius:6,width:"auto"}}>
                          <option value="">Assign driver...</option>
                          {drivers.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      )}
                      {p.status!=="completed"&&<Btn size="sm" variant="success" onClick={()=>complete(p.id)}>Complete</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const SalesPage=()=>{
  const [showToast,toastEl]=useToast();
  const [leads,setLeads]=useState(()=>DS.list(SK.leads));
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({name:"",contact:"",phone:"",email:"",stage:"prospect",notes:""});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const refresh=()=>setLeads(DS.list(SK.leads));
  const addLead=()=>{
    if(!f.name.trim())return showToast("Pharmacy name required.","error");
    DS.push(SK.leads,{id:"LEAD-"+Date.now(),name:f.name,contact:f.contact,phone:f.phone,email:f.email,stage:f.stage,notes:f.notes,created:new Date().toISOString()});
    refresh();showToast("Lead added.");setShowNew(false);setF({name:"",contact:"",phone:"",email:"",stage:"prospect",notes:""});
  };
  const advance=(id,stage)=>{DS.update(SK.leads,id,{stage});refresh();showToast("Stage updated.");};
  const stages=["prospect","contacted","demo","proposal","closed"];
  const stageColor={prospect:{c:C.gray1,b:C.surface2},contacted:{c:C.blue,b:C.blueDim},demo:{c:C.yellow,b:C.yellowDim},proposal:{c:C.gold,b:C.goldDim},closed:{c:C.green,b:C.greenDim}};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Sales Pipeline" sub={leads.length+" leads in pipeline"}
        action={<div style={{display:"flex",gap:8}}><Btn variant="ghost" size="sm" onClick={()=>exportCSV(leads,"leads.csv")}>Export</Btn><Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Add Lead</Btn></div>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>New Pharmacy Lead</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Pharmacy Name" required><input value={f.name} onChange={e=>up("name",e.target.value)} placeholder="Pharmacy name"/></FG>
            <FG label="Contact Name"><input value={f.contact} onChange={e=>up("contact",e.target.value)} placeholder="Decision maker"/></FG>
            <FG label="Phone"><input type="tel" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="(555) 555-5555"/></FG>
            <FG label="Email"><input type="email" value={f.email} onChange={e=>up("email",e.target.value)} placeholder="email@pharmacy.com"/></FG>
            <FG label="Stage">
              <select value={f.stage} onChange={e=>up("stage",e.target.value)}>
                {stages.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </FG>
            <FG label="Notes"><input value={f.notes} onChange={e=>up("notes",e.target.value)} placeholder="Notes..."/></FG>
          </div>
          <div style={{display:"flex",gap:8}}><Btn size="sm" onClick={addLead}>Save Lead</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {leads.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>📊</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No leads yet</div>
          <div style={{color:C.gray1}}>Add your first pharmacy lead to start tracking your pipeline.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Pharmacy</th><th>Contact</th><th className="hide-sm">Phone</th><th>Stage</th><th>Actions</th></tr></thead>
            <tbody>
              {leads.slice().reverse().map(l=>{
                const sc=stageColor[l.stage]||{c:C.gray1,b:C.surface2};
                return(
                  <tr key={l.id}>
                    <td style={{fontWeight:600}}>{l.name}</td>
                    <td style={{fontSize:12,color:C.gray1}}>{l.contact||"—"}</td>
                    <td className="hide-sm">{l.phone?<a href={"tel:"+l.phone.replace(/\D/g,"")} style={{color:C.gold,textDecoration:"none",fontSize:12}}>{l.phone}</a>:<span style={{color:C.gray2,fontSize:12}}>—</span>}</td>
                    <td><Badge label={l.stage} color={sc.c} bg={sc.b}/></td>
                    <td>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {l.stage!=="closed"&&<Btn size="sm" variant="secondary" onClick={()=>advance(l.id,stages[Math.min(stages.indexOf(l.stage)+1,stages.length-1)])}>Advance</Btn>}
                        {l.phone&&<a href={"tel:"+l.phone.replace(/\D/g,"")} style={{textDecoration:"none"}}><Btn size="sm" variant="ghost">Call</Btn></a>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const QualityControl=()=>{
  const [showToast,toastEl]=useToast();
  const pods=DS.list(SK.pod);
  const [qcs,setQcs]=useState(()=>DS.list(SK.qc));
  const refresh=()=>setQcs(DS.list(SK.qc));
  const flag=(id)=>{DS.update(SK.qc,id,{qc_status:"flagged"});refresh();showToast("POD flagged for review.");};
  const approve=(id)=>{DS.update(SK.qc,id,{qc_status:"approved"});refresh();showToast("POD approved.");};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Quality Control" sub="Review proof of delivery records"/>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}} className="metric-flex">
        <MetricCard label="Total PODs" value={pods.length}/>
        <MetricCard label="Pending Review" value={qcs.filter(q=>q.qc_status==="pending").length} color={C.yellow}/>
        <MetricCard label="Approved" value={qcs.filter(q=>q.qc_status==="approved").length} color={C.green}/>
        <MetricCard label="Flagged" value={qcs.filter(q=>q.qc_status==="flagged").length} color={C.red}/>
      </div>
      {pods.length===0&&qcs.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>👁</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No PODs to review</div>
          <div style={{color:C.gray1}}>Proof of delivery records appear here as drivers complete deliveries.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Order</th><th>Driver</th><th className="hide-sm">Timestamp</th><th>QC Status</th><th>Actions</th></tr></thead>
            <tbody>
              {[...qcs,...pods.filter(p=>!qcs.find(q=>q.orderId===p.orderId))].slice().reverse().map((p,i)=>(
                <tr key={p.id||i}>
                  <td style={{fontFamily:FM,fontSize:12,color:C.gold}}>{p.orderId||"—"}</td>
                  <td style={{fontWeight:600}}>{p.driver||p.driverName||"—"}</td>
                  <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{p.ts||p.timestamp?new Date(p.ts||p.timestamp).toLocaleString():"—"}</td>
                  <td><StatusBadge status={p.qc_status||"pending"}/></td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      {(!p.qc_status||p.qc_status==="pending")&&<><Btn size="sm" variant="success" onClick={()=>approve(p.id)}>Approve</Btn><Btn size="sm" variant="danger" onClick={()=>flag(p.id)}>Flag</Btn></>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const GigGroundWork=()=>{
  const [showToast,toastEl]=useToast();
  const [gigs,setGigs]=useState(()=>DS.list(SK.gigwork));
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({title:"",zone:"",driver:"",status:"new",notes:""});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const drivers=Auth.getUsers().filter(u=>u.role==="driver"&&u.status==="active");
  const refresh=()=>setGigs(DS.list(SK.gigwork));
  const addGig=()=>{
    if(!f.title.trim())return showToast("Title required.","error");
    DS.push(SK.gigwork,{id:"GIG-"+Date.now(),title:f.title,zone:f.zone,driver:f.driver,status:f.status,notes:f.notes,created:new Date().toISOString()});
    refresh();showToast("Gig ground work added.");setShowNew(false);setF({title:"",zone:"",driver:"",status:"new",notes:""});
  };
  const advance=(id)=>{
    const g=gigs.find(x=>x.id===id);
    const next={new:"verified",verified:"ready",ready:"completed"}[g.status]||"completed";
    DS.update(SK.gigwork,id,{status:next});refresh();showToast("Status updated to "+next+".");
  };
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Gig Ground Work" sub="Pre-route verification and zone prep"
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Add Item</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>New Gig Ground Work Item</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Title" required><input value={f.title} onChange={e=>up("title",e.target.value)} placeholder="Task description"/></FG>
            <FG label="Zone / Area"><input value={f.zone} onChange={e=>up("zone",e.target.value)} placeholder="e.g. Flushing, Queens"/></FG>
            <FG label="Assign Driver">
              <select value={f.driver} onChange={e=>up("driver",e.target.value)}>
                <option value="">Unassigned</option>
                {drivers.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </FG>
            <FG label="Status">
              <select value={f.status} onChange={e=>up("status",e.target.value)}>
                <option value="new">New</option>
                <option value="verified">Verified</option>
                <option value="ready">Ready</option>
              </select>
            </FG>
          </div>
          <FG label="Notes"><textarea value={f.notes} onChange={e=>up("notes",e.target.value)} rows={2} placeholder="Details..."/></FG>
          <div style={{display:"flex",gap:8,marginTop:8}}><Btn size="sm" onClick={addGig}>Save</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {gigs.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>🔍</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No gig ground work yet</div>
          <div style={{color:C.gray1}}>Add pre-route verification items and zone preparation tasks here.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Item</th><th className="hide-sm">Zone</th><th>Driver</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {gigs.slice().reverse().map(g=>(
                <tr key={g.id}>
                  <td style={{fontWeight:600}}>{g.title}{g.notes&&<div style={{fontSize:11,color:C.gray1}}>{g.notes}</div>}</td>
                  <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{g.zone||"—"}</td>
                  <td style={{fontSize:12}}>{g.driver||"—"}</td>
                  <td><StatusBadge status={g.status}/></td>
                  <td>
                    {g.status!=="completed"&&<Btn size="sm" variant="secondary" onClick={()=>advance(g.id)}>Advance</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const GigPrep=()=>{
  const routes=DS.list(SK.routes);
  const orders=DS.list(SK.orders);
  const drivers=Auth.getUsers().filter(u=>u.role==="driver"&&u.status==="active");
  const [showToast,toastEl]=useToast();
  const [rts,setRts]=useState(()=>DS.list(SK.routes));
  const [showNew,setShowNew]=useState(false);
  const [f,setF]=useState({driver:"",pharmacy:"",zone:"",stops:0,notes:""});
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const refresh=()=>setRts(DS.list(SK.routes));
  const pharmas=Auth.getUsers().filter(u=>u.role==="pharmacy");
  const createRoute=()=>{
    if(!f.driver)return showToast("Select a driver.","error");
    const route={id:"RT-"+Date.now().toString().slice(-5),driver:f.driver,pharmacy:f.pharmacy,zone:f.zone,stops:Number(f.stops),completed:0,status:"created",notes:f.notes,created:new Date().toISOString()};
    DS.push(SK.routes,route);logAudit(Auth.session()?.name||"Dispatch","Route created",route.id);
    refresh();showToast("Route "+route.id+" created.");setShowNew(false);setF({driver:"",pharmacy:"",zone:"",stops:0,notes:""});
  };
  const startRoute=(id)=>{DS.update(SK.routes,id,{status:"in_progress",startedAt:new Date().toISOString()});refresh();showToast("Route started.");};
  const completeRoute=(id)=>{DS.update(SK.routes,id,{status:"completed",completedAt:new Date().toISOString()});refresh();showToast("Route completed.");};
  return(
    <div className="fade-in">
      {toastEl}
      <PageHeader title="Gig Prep" sub={rts.length+" total routes"}
        action={<Btn size="sm" onClick={()=>setShowNew(!showNew)}>+ Create Route</Btn>}
      />
      {showNew&&(
        <Card style={{marginBottom:20,border:`1px solid ${C.goldBorder}`}}>
          <SectionLabel>Create New Route</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FG label="Driver" required>
              <select value={f.driver} onChange={e=>up("driver",e.target.value)}>
                <option value="">Select driver...</option>
                {drivers.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </FG>
            <FG label="Pharmacy">
              <select value={f.pharmacy} onChange={e=>up("pharmacy",e.target.value)}>
                <option value="">Select pharmacy...</option>
                {pharmas.map(p=><option key={p.id} value={p.pharmacy||p.name}>{p.pharmacy||p.name}</option>)}
              </select>
            </FG>
            <FG label="Zone / Area"><input value={f.zone} onChange={e=>up("zone",e.target.value)} placeholder="e.g. Flushing/Main St"/></FG>
            <FG label="Number of Stops"><input type="number" value={f.stops} min={0} onChange={e=>up("stops",e.target.value)} style={{maxWidth:80}}/></FG>
          </div>
          <FG label="Notes"><textarea value={f.notes} onChange={e=>up("notes",e.target.value)} rows={2} placeholder="Route notes..."/></FG>
          <div style={{display:"flex",gap:8,marginTop:8}}><Btn size="sm" onClick={createRoute}>Create Route</Btn><Btn variant="ghost" size="sm" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
        </Card>
      )}
      {rts.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:12}}>🗺</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No routes yet</div>
          <div style={{color:C.gray1}}>Create your first route to start dispatching drivers.</div>
        </Card>
      ):(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead><tr><th>Route</th><th>Driver</th><th className="hide-sm">Pharmacy</th><th>Stops</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rts.slice().reverse().map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:FM,fontSize:12,color:C.gold}}>{r.id}</td>
                  <td style={{fontWeight:600}}>{r.driver||"Unassigned"}</td>
                  <td className="hide-sm" style={{fontSize:12,color:C.gray1}}>{r.pharmacy||"—"}</td>
                  <td style={{fontSize:13}}>{r.stops||0} <span style={{fontSize:11,color:C.gray2}}>({r.completed||0} done)</span></td>
                  <td><StatusBadge status={r.status}/></td>
                  <td>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {r.status==="created"&&<Btn size="sm" onClick={()=>startRoute(r.id)}>Start</Btn>}
                      {r.status==="in_progress"&&<Btn size="sm" variant="success" onClick={()=>completeRoute(r.id)}>Complete</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const DispatchReports=()=>{
  const orders=DS.list(SK.orders);
  const routes=DS.list(SK.routes);
  const pods=DS.list(SK.pod);
  const drivers=Auth.getUsers().filter(u=>u.role==="driver");
  const exceptions=DS.list(SK.exceptions);
  const total=orders.length;
  const delivered=orders.filter(o=>o.status==="delivered").length;
  const failed=orders.filter(o=>o.status==="failed").length;
  const rate=total>0?Math.round((delivered/total)*100):0;
  return(
    <div className="fade-in">
      <PageHeader title="Reports" sub="Platform performance overview"
        action={<div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" size="sm" onClick={()=>exportCSV(orders,"orders.csv")}>Orders CSV</Btn>
          <Btn variant="ghost" size="sm" onClick={()=>exportCSV(DS.list(SK.audit),"audit-log.csv")}>Audit Log</Btn>
        </div>}
      />
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}} className="metric-flex">
        <MetricCard label="Total Orders" value={total}/>
        <MetricCard label="Delivered" value={delivered} color={C.green}/>
        <MetricCard label="Failed" value={failed} color={C.red}/>
        <MetricCard label="Success Rate" value={total>0?rate+"%":"—"} color={rate>=90?C.green:rate>=70?C.yellow:C.red}/>
        <MetricCard label="Total Routes" value={routes.length}/>
        <MetricCard label="Total Drivers" value={drivers.length}/>
        <MetricCard label="PODs Captured" value={pods.length}/>
        <MetricCard label="Exceptions" value={exceptions.length} color={exceptions.filter(e=>e.status==="open").length>0?C.red:C.green}/>
      </div>
      {total===0&&<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:32,marginBottom:12}}>📊</div><div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:8}}>No data yet</div><div style={{color:C.gray1}}>Data populates here as your operation runs.</div></Card>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DRIVER APP
═══════════════════════════════════════════════════════ */
const DriverApp=({onLogout,currentUser})=>{
  const [tab,setTab]=useState("home");
  const [routeStep,setRouteStep]=useState(null);
  const [scanned,setScanned]=useState([]);
  const [podStep,setPodStep]=useState(0);
  const [stopIdx,setStopIdx]=useState(0);
  const [accepted,setAccepted]=useState(false);
  const [photoData,setPhotoData]=useState(null);
  const [sigData,setSigData]=useState(null);
  const [recipName,setRecipName]=useState("");
  const [gpsOn,setGpsOn]=useState(false);
  const [gpsCoords,setGpsCoords]=useState(null);
  const [showToast,toastEl]=useToast();
  const sigRef=useRef(null);
  const drawing=useRef(false);
  const watchRef=useRef(null);
  const myRoute=DS.list(SK.routes).filter(r=>r.driver===(currentUser?.name||"")&&r.status==="in_progress")[0]||null;
  const myOrders=DS.list(SK.orders).filter(o=>o.driver===(currentUser?.name||"")&&o.status==="assigned");
  const myEarnings=DS.list(SK.pod).filter(p=>p.driver===(currentUser?.name||""));

  const STOPS=[
    {recipient:"Maria S.",address:"142-15 Roosevelt Ave, Apt 3B",id:"ORD-4821",pkgs:2,sig:true,phone:"(718) 555-0142"},
    {recipient:"Yuki T.",address:"63-19 Woodhaven Blvd",id:"ORD-4817",pkgs:2,sig:false,phone:"(718) 555-0563"},
    {recipient:"Ahmed H.",address:"78-44 Queens Blvd",id:"ORD-4815",pkgs:1,sig:false,phone:"(718) 555-0732"},
  ];
  const PACKAGES=["PKG-4821-A","PKG-4821-B","PKG-4817-A","PKG-4817-B","PKG-4815-A"];
  const currentStop=STOPS[stopIdx];

  const toggleGPS=()=>{
    if(gpsOn){
      if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);
      setGpsOn(false);setGpsCoords(null);showToast("GPS sharing stopped.");
    }else{
      if(!navigator.geolocation){showToast("GPS not available on this device.","error");return;}
      setGpsOn(true);showToast("GPS sharing started. Dispatch can see your location.");
      watchRef.current=navigator.geolocation.watchPosition(
        pos=>{const loc={lat:pos.coords.latitude,lng:pos.coords.longitude,acc:Math.round(pos.coords.accuracy),ts:Date.now()};setGpsCoords(loc);try{localStorage.setItem("meddash_driver_location_"+(currentUser?.id||"DRV-01"),JSON.stringify(loc));}catch{}},
        ()=>{showToast("GPS error — check location permissions.","error");setGpsOn(false);},
        {enableHighAccuracy:true,maximumAge:5000}
      );
    }
  };
  useEffect(()=>()=>{if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);},[]);

  const openCamera=(onResult)=>{const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.capture="environment";inp.onchange=()=>{if(inp.files&&inp.files[0]){const r=new FileReader();r.onload=e=>{if(onResult)onResult(e.target.result);};r.readAsDataURL(inp.files[0]);}};inp.click();};
  const getXY=(e,c)=>{const r=c.getBoundingClientRect();const s=e.touches?e.touches[0]:e;return[s.clientX-r.left,s.clientY-r.top];};
  const onSigStart=e=>{e.preventDefault();drawing.current=true;if(!sigRef.current)return;const[x,y]=getXY(e,sigRef.current);const ctx=sigRef.current.getContext("2d");ctx.beginPath();ctx.moveTo(x,y);};
  const onSigDraw=e=>{if(!drawing.current||!sigRef.current)return;e.preventDefault();const[x,y]=getXY(e,sigRef.current);const ctx=sigRef.current.getContext("2d");ctx.lineTo(x,y);ctx.strokeStyle=C.gold;ctx.lineWidth=2.5;ctx.lineCap="round";ctx.stroke();};
  const onSigEnd=e=>{e.preventDefault();drawing.current=false;if(sigRef.current)setSigData(sigRef.current.toDataURL());};
  const clearSig=()=>{if(sigRef.current)sigRef.current.getContext("2d").clearRect(0,0,sigRef.current.width,sigRef.current.height);setSigData(null);};

  const S={
    wrap:{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",fontFamily:FB,position:"relative"},
    header:{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0},
    content:{flex:1,padding:20,overflowY:"auto",paddingBottom:90},
    tabBar:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100},
    tabBtn:(active)=>({flex:1,padding:"12px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",color:active?C.gold:C.gray2,background:"transparent",border:"none",fontFamily:FB}),
    bigBtn:(color=C.gold)=>({width:"100%",padding:"16px",background:color,border:"none",borderRadius:12,fontSize:16,fontWeight:800,fontFamily:FB,color:color===C.gold?C.bg:C.white,cursor:"pointer",letterSpacing:"0.02em"}),
    card:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:12},
    label:{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.gray2,marginBottom:4},
    val:{fontSize:14,fontWeight:600},
  };

  const renderHome=()=>(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,color:C.gray1}}>Welcome back,</div>
        <div style={{fontFamily:FD,fontSize:28,fontWeight:600}}>{currentUser?.name||"Driver"}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <div style={{...S.card,margin:0}}>
          <div style={S.label}>Today's Deliveries</div>
          <div style={{fontFamily:FM,fontSize:28,color:C.gold}}>{myEarnings.filter(e=>{try{return new Date(e.ts).toDateString()===new Date().toDateString();}catch{return false;}}).length}</div>
        </div>
        <div style={{...S.card,margin:0}}>
          <div style={S.label}>GPS Status</div>
          <div style={{fontSize:13,fontWeight:700,color:gpsOn?C.green:C.gray2}}>{gpsOn?"Sharing Live":"Off"}</div>
          {gpsCoords&&<div style={{fontSize:10,color:C.gray2,fontFamily:FM,marginTop:2}}>{gpsCoords.lat.toFixed(4)}N</div>}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.label}>Today's Earnings</div>
        <div style={{fontFamily:FM,fontSize:32,color:C.green,marginBottom:4}}>${(myEarnings.filter(e=>{try{return new Date(e.ts).toDateString()===new Date().toDateString();}catch{return false;}}).length*13.5).toFixed(2)}</div>
        <div style={{fontSize:11,color:C.gray2}}>Based on completed deliveries · avg $13.50/delivery</div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <button onClick={toggleGPS} style={{flex:1,padding:"12px",background:gpsOn?C.greenDim:C.surface2,border:`1px solid ${gpsOn?"rgba(76,175,125,.4)":C.border}`,color:gpsOn?C.green:C.gray1,borderRadius:10,fontSize:14,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>
          {gpsOn?"GPS On — Sharing":"GPS Off — Tap to Share"}
        </button>
      </div>
      {!routeStep&&(
        <button onClick={()=>setRouteStep("offer")} style={S.bigBtn()}>View Available Route →</button>
      )}
      {routeStep&&(
        <button onClick={()=>setTab("route")} style={S.bigBtn()}>Continue Route →</button>
      )}
    </div>
  );

  const renderRoute=()=>{
    if(!routeStep)return(
      <div style={{textAlign:"center",padding:"40px 0"}}>
        <div style={{fontSize:48,marginBottom:16}}>🚗</div>
        <div style={{fontFamily:FD,fontSize:22,fontWeight:600,marginBottom:8}}>No Active Route</div>
        <div style={{fontSize:13,color:C.gray1,marginBottom:24}}>Go to Home to accept a new route assignment.</div>
        <button onClick={()=>setTab("home")} style={S.bigBtn()}>Go to Home</button>
      </div>
    );
    if(routeStep==="offer")return(
      <div>
        <div style={{fontFamily:FD,fontSize:22,fontWeight:600,marginBottom:4}}>Route Offer</div>
        <div style={{fontSize:12,color:C.gold,marginBottom:16,fontFamily:FM}}>RT-092 from Sunrise Pharmacy</div>
        <div style={{...S.card,borderColor:C.goldBorder}}>
          {[["Stops","3 deliveries"],["Packages","5 packages"],["Zone","Queens, NY"],["Est. Distance","8.4 miles"],["Est. Time","~90 min"],["Est. Earnings","~$40.50"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={S.label}>{l}</span><span style={S.val}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",fontSize:13,color:C.gray1,lineHeight:1.5}}>
            <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{width:"auto",marginTop:2,accentColor:C.gold}}/>
            I agree to follow MedDash delivery protocols, maintain patient privacy, and handle all medications with care.
          </label>
        </div>
        <button onClick={()=>{if(accepted){setRouteStep("pickup");showToast("Route accepted! Proceed to pharmacy for pickup.");}else showToast("Please accept the terms to continue.","error");}} style={{...S.bigBtn(),opacity:accepted?1:0.4}}>Accept Route</button>
        <button onClick={()=>setRouteStep(null)} style={{width:"100%",marginTop:8,padding:"10px",background:"transparent",border:`1px solid ${C.border}`,color:C.gray1,borderRadius:10,fontSize:14,fontFamily:FB,cursor:"pointer"}}>Decline</button>
      </div>
    );
    if(routeStep==="pickup")return(
      <div>
        <div style={{fontFamily:FD,fontSize:22,fontWeight:600,marginBottom:4}}>Pharmacy Pickup</div>
        <div style={{fontSize:12,color:C.gray1,marginBottom:16}}>Scan all packages before departing</div>
        <div style={S.card}>
          <div style={S.label}>Packages to Scan ({scanned.length}/{PACKAGES.length})</div>
          {PACKAGES.map(pkg=>(
            <div key={pkg} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontFamily:FM,fontSize:12,color:scanned.includes(pkg)?C.green:C.white}}>{pkg}</span>
              {scanned.includes(pkg)
                ?<Badge label="Scanned ✓" color={C.green} bg={C.greenDim}/>
                :<button onClick={()=>openCamera(()=>setScanned(s=>[...s,pkg]))} style={{background:C.goldDim,border:`1px solid ${C.goldBorder}`,color:C.gold,padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>📷 Scan</button>
              }
            </div>
          ))}
        </div>
        <button onClick={()=>{STOPS.forEach(s=>{DS.push(SK.sms,{id:"SMS-"+Date.now(),to:s.phone,msg:"Hi "+s.recipient+", your MedDash delivery is on the way! Questions? Call 888-MED-DASH.",ts:new Date().toISOString(),type:"route_start"});});showToast("Route started! SMS sent to "+STOPS.length+" patients.");setRouteStep("route");}}
          style={{...S.bigBtn(),marginTop:4}}>
          {scanned.length<PACKAGES.length?"Scan Remaining ("+( PACKAGES.length-scanned.length)+")":"Start Route → SMS Patients"}
        </button>
        {scanned.length<PACKAGES.length&&<button onClick={()=>{STOPS.forEach(s=>{DS.push(SK.sms,{id:"SMS-"+Date.now(),to:s.phone,msg:"Hi "+s.recipient+", your MedDash delivery is on the way! Call 888-MED-DASH.",ts:new Date().toISOString()});});showToast("Route started (demo mode).");setRouteStep("route");}} style={{width:"100%",marginTop:8,padding:"10px",background:"transparent",border:`1px solid ${C.border}`,color:C.gray2,borderRadius:10,fontSize:13,fontFamily:FB,cursor:"pointer"}}>Skip Scan (Demo)</button>}
      </div>
    );
    if(routeStep==="route")return(
      <div>
        <div style={{fontFamily:FD,fontSize:22,fontWeight:600,marginBottom:4}}>Active Route</div>
        <div style={{fontSize:12,color:C.gold,marginBottom:16,fontFamily:FM}}>RT-092 · Stop {stopIdx+1} of {STOPS.length}</div>
        <div style={{...S.card,borderColor:C.goldBorder,marginBottom:12}}>
          <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Next Stop</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>{currentStop.recipient}</div>
          <div style={{fontSize:13,color:C.gray1,marginBottom:14}}>{currentStop.address}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>window.open("https://maps.google.com/?q="+encodeURIComponent(currentStop.address+" Queens NY"),"_blank")}
              style={{flex:1,background:C.goldDim,border:`1px solid ${C.goldBorder}`,color:C.gold,padding:"11px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>📍 Navigate</button>
            <a href={"tel:"+currentStop.phone.replace(/\D/g,"")} style={{flex:1,textDecoration:"none"}}>
              <button style={{width:"100%",background:C.surface2,border:`1px solid ${C.border}`,color:C.gray1,padding:"11px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>📞 Call</button>
            </a>
            <a href="sms:8882633274" style={{flex:1,textDecoration:"none"}}>
              <button style={{width:"100%",background:C.surface2,border:`1px solid ${C.border}`,color:C.gray1,padding:"11px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>💬 HQ</button>
            </a>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.label}>All Stops</div>
          {STOPS.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<STOPS.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:i<stopIdx?C.greenDim:i===stopIdx?C.goldDim:C.surface2,border:`2px solid ${i<stopIdx?C.green:i===stopIdx?C.gold:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontFamily:FM,color:i<stopIdx?C.green:i===stopIdx?C.gold:C.gray2,flexShrink:0}}>
                {i<stopIdx?"✓":i+1}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:i<stopIdx?C.gray1:C.white}}>{s.recipient}</div>
                <div style={{fontSize:11,color:C.gray2}}>{s.address.split(",")[0]}</div>
              </div>
              {i===stopIdx&&<Btn size="sm" onClick={()=>{setPodStep(0);setPhotoData(null);setSigData(null);setRecipName("");setRouteStep("pod");}}>Arrive</Btn>}
            </div>
          ))}
        </div>
        <button onClick={()=>{DS.push(SK.exceptions,{id:"EXC-"+Date.now(),orderId:currentStop.id,type:"Failed Delivery",driver:currentUser?.name||"Driver",address:currentStop.address,status:"open",ts:new Date().toISOString()});showToast("Failed delivery logged. Dispatch notified.","error");const next=stopIdx+1;if(next>=STOPS.length)setRouteStep("done");else{setStopIdx(next);setPodStep(0);setPhotoData(null);setSigData(null);}}}
          style={{width:"100%",padding:"12px",background:C.redDim,border:"1px solid rgba(224,82,82,.3)",color:C.red,borderRadius:10,fontSize:14,fontWeight:700,fontFamily:FB,cursor:"pointer",marginTop:8}}>
          Can't Deliver — Log Failed Attempt
        </button>
      </div>
    );
    if(routeStep==="pod"){
      const steps=["Scan Package","Recipient Name","Capture Signature","Take Photo","Confirm"];
      return(
        <div>
          <button onClick={()=>setRouteStep("route")} style={{background:"transparent",border:"none",color:C.gray1,display:"flex",alignItems:"center",gap:6,marginBottom:16,cursor:"pointer",fontFamily:FB,fontSize:13}}>← Back to Route</button>
          <div style={{fontFamily:FD,fontSize:22,fontWeight:600,marginBottom:4}}>Proof of Delivery</div>
          <div style={{fontSize:12,color:C.gray1,marginBottom:16}}>{currentStop.recipient} · {currentStop.address.split(",")[0]}</div>
          <div style={{display:"flex",gap:4,marginBottom:20}}>
            {steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=podStep?C.gold:C.surface2,transition:"background 0.3s"}}/>)}
          </div>
          <div style={{...S.card,borderColor:podStep===4?C.goldBorder:C.border}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>{steps[podStep]}</div>
            {podStep===0&&(
              <div>
                <div onClick={()=>openCamera(()=>setPodStep(1))} style={{textAlign:"center",padding:"28px 0",cursor:"pointer",border:`2px dashed ${C.goldBorder}`,borderRadius:10,background:C.surface2}}>
                  <div style={{fontSize:40,marginBottom:8}}>📷</div>
                  <div style={{fontSize:14,color:C.gold,fontWeight:700}}>Tap to Scan Package</div>
                  <div style={{fontSize:11,color:C.gray2,marginTop:4}}>Opens rear camera · scans barcode or label</div>
                </div>
                <button onClick={()=>setPodStep(1)} style={{width:"100%",marginTop:8,padding:8,background:"transparent",border:`1px solid ${C.border}`,color:C.gray2,borderRadius:8,fontSize:12,fontFamily:FB,cursor:"pointer"}}>Skip (Demo Mode)</button>
              </div>
            )}
            {podStep===1&&<input value={recipName} onChange={e=>setRecipName(e.target.value)} placeholder="Enter recipient's full name" autoFocus style={{marginBottom:0}}/>}
            {podStep===2&&(
              <div>
                <div style={{fontSize:12,color:C.gray1,marginBottom:8}}>Sign below with your finger or mouse:</div>
                <canvas ref={sigRef} width={340} height={110}
                  style={{width:"100%",background:C.surface2,border:`2px solid ${sigData?C.gold:C.border2}`,borderRadius:10,display:"block",touchAction:"none",cursor:"crosshair"}}
                  onMouseDown={onSigStart} onMouseMove={onSigDraw} onMouseUp={onSigEnd} onMouseLeave={onSigEnd}
                  onTouchStart={onSigStart} onTouchMove={onSigDraw} onTouchEnd={onSigEnd}/>
                <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                  <button onClick={clearSig} style={{background:C.surface2,border:`1px solid ${C.border}`,color:C.gray1,padding:"6px 14px",borderRadius:6,fontSize:12,fontFamily:FB,cursor:"pointer"}}>Clear</button>
                  {sigData&&<Badge label="Signature captured ✓" color={C.green} bg={C.greenDim}/>}
                </div>
              </div>
            )}
            {podStep===3&&(
              <div>
                <div onClick={()=>openCamera(img=>setPhotoData(img))} style={{border:`2px dashed ${photoData?C.gold:C.border2}`,borderRadius:10,minHeight:120,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,cursor:"pointer",overflow:"hidden",background:C.surface2}}>
                  {photoData
                    ?<img src={photoData} alt="POD" style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:8}}/>
                    :<><div style={{fontSize:36}}>📷</div><div style={{fontSize:14,color:C.gold,fontWeight:700}}>Tap to Take Delivery Photo</div><div style={{fontSize:11,color:C.gray2}}>Opens rear camera</div></>
                  }
                </div>
                {photoData&&<div style={{fontSize:12,color:C.green,marginTop:6,textAlign:"center"}}>Photo captured ✓</div>}
              </div>
            )}
            {podStep===4&&(
              <div>
                {[["Recipient",recipName||currentStop.recipient],["Signature",sigData?"Captured ✓":"Skipped"],["Photo",photoData?"Captured ✓":"Skipped"],["GPS",gpsCoords?(gpsCoords.lat.toFixed(4)+"N, "+gpsCoords.lng.toFixed(4)+"W"):"Not shared"],["Timestamp",new Date().toLocaleTimeString()]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:12,color:C.gray1}}>{l}</span>
                    <span style={{fontSize:12,color:v.includes("✓")||v.includes("N,")||v.includes(":")?C.green:C.white,fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>{
              if(podStep<4){setPodStep(p=>p+1);}
              else{
                const pod={id:"POD-"+Date.now(),orderId:currentStop.id,driver:currentUser?.name||"Driver",recipient:recipName||currentStop.recipient,hasSig:!!sigData,hasPhoto:!!photoData,hasGps:!!gpsCoords,ts:new Date().toISOString()};
                DS.push(SK.pod,pod);
                DS.update(SK.orders,currentStop.id,{status:"delivered",deliveredAt:new Date().toISOString()});
                logAudit(currentUser?.name||"Driver","POD submitted",currentStop.id);
                showToast("Delivery confirmed for "+currentStop.recipient+"!");
                const next=stopIdx+1;
                if(next>=STOPS.length){setRouteStep("done");}
                else{setStopIdx(next);setRouteStep("route");setPodStep(0);setPhotoData(null);setSigData(null);setRecipName("");}
              }
            }} style={{...S.bigBtn(),marginTop:16}}>
              {podStep<4?"Continue →":"Complete Delivery ✓"}
            </button>
          </div>
        </div>
      );
    }
    if(routeStep==="done")return(
      <div style={{textAlign:"center",padding:"40px 0"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:C.greenDim,border:`2px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32}}>✓</div>
        <div style={{fontFamily:FD,fontSize:28,fontWeight:600,marginBottom:8}}>Route Complete!</div>
        <div style={{fontSize:13,color:C.gray1,marginBottom:8}}>All {STOPS.length} stops completed.</div>
        <div style={{fontFamily:FM,fontSize:28,color:C.green,fontWeight:700,marginBottom:24}}>${(STOPS.length*13.5).toFixed(2)} earned</div>
        <button onClick={()=>{setRouteStep(null);setStopIdx(0);setScanned([]);setAccepted(false);setPodStep(0);setPhotoData(null);setSigData(null);setRecipName("");setTab("home");}} style={S.bigBtn()}>Back to Home</button>
      </div>
    );
    return null;
  };

  const renderEarnings=()=>{
    const pods=myEarnings;
    const total=pods.length*13.5;
    const today=pods.filter(p=>{try{return new Date(p.ts).toDateString()===new Date().toDateString();}catch{return false;}});
    return(
      <div>
        <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:16}}>Earnings</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          <div style={S.card}><div style={S.label}>Today</div><div style={{fontFamily:FM,fontSize:26,color:C.green}}>${(today.length*13.5).toFixed(2)}</div><div style={{fontSize:11,color:C.gray2}}>{today.length} deliveries</div></div>
          <div style={S.card}><div style={S.label}>All Time</div><div style={{fontFamily:FM,fontSize:26,color:C.gold}}>${total.toFixed(2)}</div><div style={{fontSize:11,color:C.gray2}}>{pods.length} deliveries</div></div>
        </div>
        {pods.length===0?<div style={{...S.card,textAlign:"center",padding:32}}><div style={{fontSize:28,marginBottom:8}}>💰</div><div style={{fontSize:14,color:C.gray1}}>Complete deliveries to see your earnings here.</div></div>:
        <div style={S.card}>
          <div style={S.label}>Recent Deliveries</div>
          {pods.slice().reverse().slice(0,10).map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{p.recipient}</div><div style={{fontSize:11,color:C.gray2}}>{new Date(p.ts).toLocaleDateString()}</div></div>
              <div style={{fontFamily:FM,fontSize:14,color:C.green}}>+$13.50</div>
            </div>
          ))}
        </div>}
      </div>
    );
  };

  const renderStats=()=>{
    const pods=myEarnings;
    const completed=pods.length;
    return(
      <div>
        <div style={{fontFamily:FD,fontSize:24,fontWeight:600,marginBottom:16}}>My Stats</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={S.card}><div style={S.label}>Deliveries</div><div style={{fontFamily:FM,fontSize:26,color:C.gold}}>{completed}</div></div>
          <div style={S.card}><div style={S.label}>GPS Sharing</div><div style={{fontSize:13,fontWeight:700,color:gpsOn?C.green:C.gray2}}>{gpsOn?"Live":"Off"}</div></div>
        </div>
        <div style={{...S.card,textAlign:"center"}}>
          <div style={{fontSize:13,color:C.gray1,marginBottom:16}}>Stats and ratings populate as you complete deliveries.</div>
          <a href="sms:8882633274" style={{textDecoration:"none"}}>
            <button style={{background:C.surface2,border:`1px solid ${C.border}`,color:C.gray1,padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>💬 Message Dispatch</button>
          </a>
        </div>
      </div>
    );
  };

  const tabDefs=[{id:"home",label:"Home",icon:"🏠"},{id:"route",label:"Route",icon:"🗺"},{id:"earnings",label:"Earnings",icon:"💰"},{id:"stats",label:"Stats",icon:"⭐"}];

  return(
    <div style={S.wrap}>
      {toastEl}
      <div style={S.header}>
        <div>
          <div style={{fontFamily:FD,fontSize:18,fontWeight:600}}>MedDash Driver</div>
          <div style={{fontSize:11,color:C.gray1}}>{currentUser?.name||"Driver"}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={toggleGPS} style={{background:gpsOn?C.greenDim:C.surface2,border:`1px solid ${gpsOn?"rgba(76,175,125,.3)":C.border}`,color:gpsOn?C.green:C.gray2,padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,fontFamily:FB,cursor:"pointer"}}>
            {gpsOn?"GPS On":"GPS Off"}
          </button>
          <a href="tel:8882633274" style={{textDecoration:"none"}}><button style={{background:C.surface2,border:`1px solid ${C.border}`,color:C.gray1,padding:"5px 10px",borderRadius:6,fontSize:11,fontFamily:FB,cursor:"pointer"}}>📞 HQ</button></a>
          <button onClick={()=>{Auth.clearSession();onLogout();}} style={{background:"transparent",border:"none",color:C.gray2,cursor:"pointer",fontSize:11,fontFamily:FB}}>Out</button>
        </div>
      </div>
      <div style={S.content}>
        {tab==="home"&&renderHome()}
        {tab==="route"&&renderRoute()}
        {tab==="earnings"&&renderEarnings()}
        {tab==="stats"&&renderStats()}
      </div>
      <div style={S.tabBar}>
        {tabDefs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={S.tabBtn(tab===t.id)}>
            <span style={{fontSize:20,lineHeight:1}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?800:500}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   PATIENT TRACKING
═══════════════════════════════════════════════════════ */
const PatientTracking=({onBack})=>{
  const [code,setCode]=useState("");
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const lookup=()=>{
    const orders=DS.list(SK.orders);
    const o=orders.find(x=>x.id.toUpperCase()===code.toUpperCase().trim()||x.recipient.toLowerCase()===code.toLowerCase().trim());
    if(o){setResult(o);setErr("");}
    else setErr("No order found with that ID or recipient name.");
  };
  const steps=[{s:"ready",label:"Order Received",done:true},{s:"assigned",label:"Driver Assigned"},{s:"in_transit",label:"Out for Delivery"},{s:"delivered",label:"Delivered"}];
  const stepIdx={ready:0,assigned:1,in_transit:2,delivered:3,failed:3};
  const current=result?stepIdx[result.status]??0:0;
  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 16px",fontFamily:FB}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.gray1,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontFamily:FB,fontSize:13}}>← Back</button>
          <div>
            <div style={{fontFamily:FD,fontSize:24,fontWeight:600}}>Track Your Delivery</div>
            <div style={{fontSize:13,color:C.gray1}}>Enter your order ID or name</div>
          </div>
        </div>
        <Card>
          <FG label="Order ID or Recipient Name">
            <input value={code} onChange={e=>{setCode(e.target.value);setErr("");}} placeholder="e.g. ORD-4821 or Maria S." onKeyDown={e=>e.key==="Enter"&&lookup()}/>
          </FG>
          {err&&<div style={{color:C.red,fontSize:13,marginBottom:12}}>{err}</div>}
          <Btn onClick={lookup} style={{width:"100%",padding:13,fontSize:15}}>Track →</Btn>
        </Card>
        {result&&(
          <Card style={{marginTop:16}}>
            <div style={{fontFamily:FD,fontSize:20,fontWeight:600,marginBottom:4}}>{result.recipient}</div>
            <div style={{fontSize:12,color:C.gray1,marginBottom:20}}>{result.address}</div>
            {result.status==="failed"?(
              <div style={{background:C.redDim,border:"1px solid rgba(224,82,82,.3)",borderRadius:8,padding:"12px 16px",marginBottom:16}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:4}}>Delivery Attempted — Unable to Complete</div>
                <div style={{fontSize:13,color:C.gray1}}>Contact your pharmacy or call 888-MED-DASH for assistance.</div>
              </div>
            ):(
              <div style={{marginBottom:20}}>
                {steps.map((step,i)=>(
                  <div key={step.s} style={{display:"flex",gap:12,marginBottom:i<steps.length-1?20:0}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:i<=current?C.gold:C.surface2,border:`2px solid ${i<=current?C.gold:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>
                        {i<current?"✓":i===current?"●":""}
                      </div>
                      {i<steps.length-1&&<div style={{width:2,flex:1,background:i<current?C.gold:C.border,margin:"4px 0",minHeight:20}}/>}
                    </div>
                    <div style={{paddingTop:2}}>
                      <div style={{fontSize:14,fontWeight:i===current?700:500,color:i<=current?C.white:C.gray2}}>{step.label}</div>
                      {i===current&&result.driver&&<div style={{fontSize:12,color:C.gold,marginTop:2}}>Driver: {result.driver}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{padding:"10px 14px",background:C.surface2,borderRadius:8,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:C.gray1}}>Order ID</span>
              <span style={{fontSize:12,fontFamily:FM,color:C.gold}}>{result.id}</span>
            </div>
            <div style={{marginTop:12,textAlign:"center"}}>
              <a href="tel:8882633274" style={{textDecoration:"none"}}><Btn variant="secondary" size="sm">Need Help? Call 888-MED-DASH</Btn></a>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   PORTAL SHELLS
═══════════════════════════════════════════════════════ */
const PharmacyPortal=({onLogout,currentUser})=>{
  const [active,setActive]=useState("dashboard");
  const [selectedOrder,setSelectedOrder]=useState(null);
  const [collapsed,setCollapsed]=useState(false);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const renderContent=()=>{
    if(active==="orders"&&selectedOrder)return<OrderDetail order={selectedOrder} onBack={()=>setSelectedOrder(null)}/>;
    switch(active){
      case"dashboard":return<PharmacyDashboard/>;
      case"create":return<CreateOrder/>;
      case"orders":return<OrdersTable onSelect={o=>setSelectedOrder(o)}/>;
      case"reports":return<PharmacyReports/>;
      case"account":return<MyAccountPage currentUser={currentUser||Auth.session()||{id:"",name:"User",username:"",phone:"",email:"",role:"pharmacy",created:""}} onLogout={onLogout}/>;
      default:return<PharmacyDashboard/>;
    }
  };
  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:C.bg}}>
      <MobileNav role="pharmacy" active={active} setActive={id=>{setActive(id);setSelectedOrder(null);}} onLogout={onLogout} open={drawerOpen} setOpen={setDrawerOpen}/>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div className="md-sidebar"><Sidebar role="pharmacy" active={active} setActive={id=>{setActive(id);setSelectedOrder(null);}} onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed}/></div>
        <main style={{flex:1,padding:32,overflowY:"auto",maxHeight:"100vh"}} className="main-pad">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const OrderDetail=({order,onBack})=>{
  const [showToast,toastEl]=useToast();
  const [status,setStatus]=useState(order.status);
  const updateStatus=(s)=>{DS.update(SK.orders,order.id,{status:s});setStatus(s);showToast("Order "+order.id+" updated to: "+s);};
  return(
    <div className="fade-in">
      {toastEl}
      <button onClick={onBack} style={{background:"transparent",border:"none",color:C.gold,cursor:"pointer",fontFamily:FB,fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:20}}>← Back to Orders</button>
      <PageHeader title={order.id} sub={order.recipient+" · "+order.address}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <SectionLabel>Delivery Details</SectionLabel>
          {[["Recipient",order.recipient],["Phone",order.phone||"—"],["Address",order.address],["Service",order.service],["Packages",order.packages||1],["Driver",order.driver||"Unassigned"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,color:C.gray1}}>{l}</span>
              <span style={{fontSize:12,fontWeight:600}}>{String(v)}</span>
            </div>
          ))}
        </Card>
        <Card>
          <SectionLabel>Status Management</SectionLabel>
          <div style={{marginBottom:16}}><StatusBadge status={status}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {order.phone&&<a href={"tel:"+order.phone.replace(/\D/g,"")} style={{textDecoration:"none"}}><Btn variant="secondary" style={{width:"100%"}}>📞 Call Patient</Btn></a>}
            {status==="ready"&&<Btn onClick={()=>updateStatus("in_transit")} style={{width:"100%"}}>Mark In Transit</Btn>}
            {status==="in_transit"&&<Btn variant="success" onClick={()=>updateStatus("delivered")} style={{width:"100%"}}>Mark Delivered</Btn>}
            {(status==="in_transit"||status==="assigned")&&<Btn variant="danger" onClick={()=>updateStatus("failed")} style={{width:"100%"}}>Mark Failed</Btn>}
            {status==="failed"&&<Btn onClick={()=>updateStatus("ready")} style={{width:"100%"}}>Reset to Ready</Btn>}
          </div>
        </Card>
      </div>
    </div>
  );
};

const DispatchPortal=({onLogout,currentUser})=>{
  const [active,setActive]=useState("dashboard");
  const [selectedOrder,setSelectedOrder]=useState(null);
  const [collapsed,setCollapsed]=useState(false);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const renderContent=()=>{
    if(active==="orders"&&selectedOrder)return<OrderDetail order={selectedOrder} onBack={()=>setSelectedOrder(null)}/>;
    switch(active){
      case"dashboard":return<DispatchDashboard/>;
      case"tasks":return<TasksPage/>;
      case"tickets":return<TicketsPage/>;
      case"gigground":return<GigGroundWork/>;
      case"contractors":return<ContractorsPage/>;
      case"qc":return<QualityControl/>;
      case"gigprep":return<GigPrep/>;
      case"pickups":return<PickupsPage/>;
      case"orders":return<OrdersTable onSelect={o=>setSelectedOrder(o)}/>;
      case"livemap":return<LiveMap/>;
      case"exceptions":return<ExceptionsPage/>;
      case"sales":return<SalesPage/>;
      case"pharmacies":return<PharmaciesPage/>;
      case"reports":return<DispatchReports/>;
      case"users":return<UserManagementPage onLogout={onLogout}/>;
      case"account":return<MyAccountPage currentUser={currentUser||Auth.session()||{id:"",name:"User",username:"",phone:"",email:"",role:"dispatch",created:""}} onLogout={onLogout}/>;
      default:return<DispatchDashboard/>;
    }
  };
  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:C.bg}}>
      <MobileNav role="dispatch" active={active} setActive={id=>{setActive(id);setSelectedOrder(null);}} onLogout={onLogout} open={drawerOpen} setOpen={setDrawerOpen}/>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div className="md-sidebar"><Sidebar role="dispatch" active={active} setActive={id=>{setActive(id);setSelectedOrder(null);}} onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed}/></div>
        <main style={{flex:1,padding:32,overflowY:"auto",maxHeight:"100vh"}} className="main-pad">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════ */
export default function App(){
  const [currentUser,setCurrentUser]=useState(()=>Auth.session());
  const [showTracking,setShowTracking]=useState(false);

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=css;
    document.head.appendChild(style);
    const m=document.createElement("meta");
    m.name="viewport";m.content="width=device-width,initial-scale=1,viewport-fit=cover";
    document.head.appendChild(m);
    Auth.getUsers();
    return()=>{try{document.head.removeChild(style);}catch{}};
  },[]);

  const handleLogin=(user)=>{Auth.setSession(user);setCurrentUser(user);};
  const handleLogout=()=>{Auth.clearSession();setCurrentUser(null);};

  if(showTracking)return<PatientTracking onBack={()=>setShowTracking(false)}/>;
  if(!currentUser)return(
    <div>
      <AuthScreen onLogin={handleLogin}/>
      <div style={{position:"fixed",bottom:16,right:16}}>
        <button onClick={()=>setShowTracking(true)} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.gray1,padding:"9px 16px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:FB,cursor:"pointer"}}>
          📦 Track a Package
        </button>
      </div>
    </div>
  );
  if(currentUser.role==="driver")return<DriverApp onLogout={handleLogout} currentUser={currentUser}/>;
  if(currentUser.role==="pharmacy")return<PharmacyPortal onLogout={handleLogout} currentUser={currentUser}/>;
  if(currentUser.role==="dispatch")return<DispatchPortal onLogout={handleLogout} currentUser={currentUser}/>;
  return<AuthScreen onLogin={handleLogin}/>;
}
