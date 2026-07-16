import{n as e,t}from"./storage-jOxuUkTc.js";import{t as n}from"./student-kpLYjQso.js";import{t as r}from"./single-view-layout-wSICUWyl.js";function i(e){return(e.textContent??e.getAttribute(`title`)??``).replace(/\s+/g,` `).trim()}function a(e,t){let n=Array.from(e.querySelectorAll(`table.MenuLink a[href]`)),r=n.filter(e=>e.target===`left`&&!/salir|cerrar\s+sesi[oó]n/i.test(i(e))),a=n.filter(e=>{let t=i(e);return t&&e.target!==`left`&&!/salir|cerrar\s+sesi[oó]n/i.test(t)}),o=n.find(e=>/salir|cerrar\s+sesi[oó]n/i.test(i(e))),s=e.createElement(`header`);s.id=`siase-v2-header`,s.innerHTML=`
    <a class="siase-v2-brand" href="#" aria-label="Inicio de SIASE">
      <span class="siase-v2-brand__mark">U</span>
      <span><strong>UANL</strong><em>SIASE</em></span>
    </a>
    <nav class="siase-v2-module-nav" aria-label="Módulos de SIASE"></nav>
    <div class="siase-v2-header-actions">
      <nav class="siase-v2-utility-nav" aria-label="Cuenta y servicios"></nav>
      <span class="siase-v2-user" title="${t||`Estudiante UANL`}">
        ${t||`Estudiante UANL`}
      </span>
    </div>
  `;let c=s.querySelector(`.siase-v2-module-nav`),l=s.querySelector(`.siase-v2-utility-nav`);if(r.forEach((e,t)=>{let n=e.cloneNode(!0);n.className=t===0?`is-active`:``,n.removeAttribute(`style`),n.addEventListener(`click`,()=>{c?.querySelectorAll(`a`).forEach(e=>e.classList.remove(`is-active`)),n.classList.add(`is-active`)}),c?.append(n)}),a.slice(0,4).forEach(e=>{let t=e.cloneNode(!0);t.removeAttribute(`style`),l?.append(t)}),o){let e=o.cloneNode(!0);e.className=`siase-v2-logout`,e.textContent=`Salir`,e.removeAttribute(`style`),l?.append(e)}return s.querySelector(`.siase-v2-brand`)?.addEventListener(`click`,e=>{e.preventDefault(),window.top?.location.reload()}),s}async function o(i){if(window.name!==`top`)return;r();let o=n(i),s=await t(`studentInfo`),c={...s,...o,matricula:s?.matricula||o.matricula};await e(`studentInfo`,c),i.body.classList.add(`siase-v2-top`),i.querySelectorAll(`table.MenuLink`).forEach(e=>{e.classList.add(`siase-v2-native-header`)}),i.getElementById(`siase-v2-header`)?.remove(),i.body.prepend(a(i,c.name))}o(document);