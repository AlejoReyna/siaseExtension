import{t as e}from"./storage-jOxuUkTc.js";function t(e){let t=e?.name?.replace(/\s+/g,` `).trim().split(` `).find(e=>e&&!/^m?\d+$/i.test(e));if(!t)return`Estudiante`;let n=t.toLocaleLowerCase(`es-MX`);return`${n.charAt(0).toLocaleUpperCase(`es-MX`)}${n.slice(1)}`}function n(){return[void 0,`monday`,`tuesday`,`wednesday`,`thursday`,`friday`,`saturday`][new Date().getDay()]}function r(e,t){return e.find(e=>t.test(e.label))}function i(e,t,n,r){let i=e.createElement(`a`);i.className=n,i.href=t.href,i.target=t.target,(t.target===`_blank`||t.target===`_new`)&&(i.rel=`noopener noreferrer`);let a=e.createElement(`strong`);if(a.textContent=t.label,i.append(a),r){let t=e.createElement(`span`);t.textContent=r,i.append(t)}let o=e.createElement(`em`);return o.textContent=`→`,i.append(o),i}function a(e,t){Array.from(e.body.childNodes).forEach(e=>{e!==t.closest(`#siase-v2-dashboard`)&&(e instanceof HTMLElement&&[`SCRIPT`,`STYLE`,`LINK`].includes(e.tagName)||e.nodeType===e.TEXT_NODE&&!e.textContent?.trim()||t.append(e))})}function o(e,t){let n=e.querySelector(`[data-siase-v2-quick-actions]`);if(n&&([{matcher:/horario/i,helper:`Consulta tus clases y salones`},{matcher:/calificaciones/i,helper:`Revisa tus resultados recientes`},{matcher:/kardex/i,helper:`Consulta tu historial académico`},{matcher:/fecha.*inscrip|inscripci[oó]n/i,helper:`Revisa fechas y requisitos`}].forEach(({matcher:a,helper:o})=>{let s=r(t.menuItems,a);s&&n.append(i(e.ownerDocument,s,`siase-v2-action`,o))}),!n.children.length)){let t=e.ownerDocument.createElement(`p`);t.className=`siase-v2-empty`,t.textContent=`Los accesos aparecerán cuando el menú de SIASE termine de cargar.`,n.append(t)}}function s(e,t){let n=e.querySelector(`[data-siase-v2-attention]`);if(n&&([{matcher:/carga documentos pendientes/i,title:`Documentos pendientes`,tag:`Revisar`},{matcher:/consulta fecha inscripci[oó]n/i,title:`Fecha de inscripción`,tag:`Consultar`},{matcher:/recibo interno/i,title:`Recibos académicos`,tag:`Abrir`}].forEach(({matcher:a,title:o,tag:s})=>{let c=r(t.menuItems,a);if(!c)return;let l=i(e.ownerDocument,c,`siase-v2-attention-row`);l.querySelector(`strong`).textContent=o;let u=e.ownerDocument.createElement(`span`);u.className=`siase-v2-badge`,u.textContent=s,l.insertBefore(u,l.lastElementChild),n.append(l)}),!n.children.length)){let t=e.ownerDocument.createElement(`p`);t.className=`siase-v2-empty`,t.textContent=`Sin accesos administrativos disponibles por ahora.`,n.append(t)}}function c(e,t){let r=e.querySelector(`[data-siase-v2-schedule]`);if(!r)return;let i=n(),a=i?t.filter(e=>e.weekday===i).sort((e,t)=>e.startTime.localeCompare(t.startTime)):[];if(!a.length){let n=e.ownerDocument.createElement(`p`);n.className=`siase-v2-empty`,n.textContent=t.length?`No hay clases registradas para hoy.`:`Abre Horario para sincronizar tus clases.`,r.append(n);return}a.slice(0,5).forEach(t=>{let n=e.ownerDocument.createElement(`article`);n.className=`siase-v2-class-row`;let i=e.ownerDocument.createElement(`time`);i.textContent=t.startTime;let a=e.ownerDocument.createElement(`span`),o=e.ownerDocument.createElement(`strong`);o.textContent=t.subject;let s=e.ownerDocument.createElement(`em`);s.textContent=[t.classroom,t.teacher].filter(Boolean).join(` · `)||`Sin detalles`,a.append(o,s),n.append(i,a),r.append(n)})}function l(e,t){let n=e.querySelector(`[data-siase-v2-grades]`);if(!n)return;let r=t?.grades??[];if(!r.length){let t=e.ownerDocument.createElement(`p`);t.className=`siase-v2-empty`,t.textContent=`Abre Calificaciones para sincronizar resultados.`,n.append(t);return}r.slice(0,4).forEach(t=>{let r=e.ownerDocument.createElement(`article`);r.className=`siase-v2-grade-row`;let i=e.ownerDocument.createElement(`span`);i.textContent=t.subject;let a=e.ownerDocument.createElement(`strong`);a.textContent=t.score===void 0?`—`:String(t.score),a.dataset.status=t.status,r.append(i,a),n.append(r)})}function u(e,t){let n=Math.max(0,Math.min(t.kardex?.progressPercent??0,100)),r=e.querySelector(`[data-siase-v2-progress]`),i=e.querySelector(`[data-siase-v2-credits]`),a=e.querySelector(`[data-siase-v2-average]`),o=e.querySelector(`[data-siase-v2-status]`),s=e.querySelector(`[data-siase-v2-progress-bar]`);r&&(r.textContent=t.kardex?`${Math.round(n)}%`:`—`),i&&(i.textContent=t.kardex?`${t.kardex.totalCreditsCompleted} / ${t.kardex.totalCreditsRequired}`:`Sin sincronizar`),a&&(a.textContent=t.kardex?.average?.toFixed(2)??`—`),o&&(o.textContent=t.studentStatus?.label||`Por consultar`),s&&(s.style.width=`${n}%`)}function d(e){let t=e.createElement(`main`);return t.id=`siase-v2-dashboard`,t.innerHTML=`
    <section class="siase-v2-welcome">
      <div>
        <p class="siase-v2-eyebrow">Portal académico</p>
        <h1>Hola, <span data-siase-v2-first-name>Estudiante</span></h1>
        <p data-siase-v2-program>Tu información académica en un solo lugar.</p>
      </div>
      <div class="siase-v2-session-state"><span></span>Sesión activa</div>
    </section>

    <section class="siase-v2-dashboard-grid">
      <article class="siase-v2-card siase-v2-card--attention">
        <header><div><p class="siase-v2-eyebrow">Prioridad</p><h2>Requiere tu atención</h2></div></header>
        <div class="siase-v2-stack" data-siase-v2-attention></div>
      </article>

      <article class="siase-v2-card siase-v2-card--academic">
        <header><div><p class="siase-v2-eyebrow">Resumen</p><h2>Avance académico</h2></div><strong data-siase-v2-progress>—</strong></header>
        <div class="siase-v2-progress"><span data-siase-v2-progress-bar></span></div>
        <dl class="siase-v2-metrics">
          <div><dt>Créditos</dt><dd data-siase-v2-credits>Sin sincronizar</dd></div>
          <div><dt>Promedio</dt><dd data-siase-v2-average>—</dd></div>
          <div><dt>Situación</dt><dd data-siase-v2-status>Por consultar</dd></div>
        </dl>
      </article>

      <article class="siase-v2-card siase-v2-card--schedule">
        <header><div><p class="siase-v2-eyebrow">Hoy</p><h2>Tu horario</h2></div></header>
        <div class="siase-v2-stack" data-siase-v2-schedule></div>
      </article>

      <article class="siase-v2-card siase-v2-card--grades">
        <header><div><p class="siase-v2-eyebrow">Reciente</p><h2>Calificaciones</h2></div></header>
        <div class="siase-v2-stack" data-siase-v2-grades></div>
      </article>
    </section>

    <section class="siase-v2-quick-section">
      <header><div><p class="siase-v2-eyebrow">Servicios</p><h2>Accesos frecuentes</h2></div></header>
      <nav class="siase-v2-quick-grid" data-siase-v2-quick-actions aria-label="Accesos frecuentes"></nav>
    </section>

    <details class="siase-v2-native-notices" open>
      <summary>Avisos oficiales de SIASE</summary>
      <div data-siase-v2-native-host></div>
    </details>
  `,t}async function f(){let[t,n,r,i,a,o]=await Promise.all([e(`studentInfo`),e(`studentStatus`),e(`menuItems`),e(`scheduleSlots`),e(`gradeSnapshot`),e(`kardexSnapshot`)]);return{studentInfo:t,studentStatus:n,menuItems:r??[],schedule:i??[],grades:a,kardex:o}}function p(e,n){e.querySelectorAll(`[data-siase-v2-attention], [data-siase-v2-schedule], [data-siase-v2-grades], [data-siase-v2-quick-actions]`).forEach(e=>e.replaceChildren());let r=e.querySelector(`[data-siase-v2-first-name]`),i=e.querySelector(`[data-siase-v2-program]`);r&&(r.textContent=t(n.studentInfo)),i&&(i.textContent=[n.studentInfo?.program,n.studentInfo?.plan?`Plan ${n.studentInfo.plan}`:void 0].filter(Boolean).join(` · `)||`Tu información académica en un solo lugar.`),s(e,n),u(e,n),c(e,n.schedule),l(e,n.grades),o(e,n)}function m(e,t=new URL(location.href)){let n=t.pathname.toLocaleLowerCase().includes(`maincenter.htm`);if(e.body.classList.add(`siase-v2-center`),e.body.classList.toggle(`siase-v2-main-center`,n),e.getElementById(`siase-plus-shell`)?.remove(),!n||e.getElementById(`siase-v2-dashboard`))return;let r=d(e),i=r.querySelector(`[data-siase-v2-native-host]`);e.body.prepend(r),i&&a(e,i);let o=()=>{f().then(e=>p(r,e))};o();let s=e.defaultView;s&&!s.__SIASE_V2_STORAGE_LISTENER__&&(s.__SIASE_V2_STORAGE_LISTENER__=!0,chrome.storage.onChanged.addListener((e,t)=>{t===`local`&&[`studentInfo`,`studentStatus`,`menuItems`,`scheduleSlots`,`gradeSnapshot`,`kardexSnapshot`].some(t=>t in e)&&o()}))}export{m as t};