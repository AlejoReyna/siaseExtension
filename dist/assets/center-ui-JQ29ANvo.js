import{t as e}from"./storage-CGf68QnW.js";import{n as t,r as n}from"./theme-PNjHhAdA.js";function r(e){let t=e.split(`/`).pop()?.toLowerCase()??``;return t.includes(`econcfs`)?`Calificaciones`:t.includes(`echalm`)?`Horario`:t.includes(`econkdx`)?`Kardex`:t.includes(`edatal`)?`Datos personales`:t.includes(`ecsitest`)?`Situación estudiante`:t.includes(`ecohoinsint`)?`Fecha de inscripción`:`Dashboard`}var i=[{label:`Horario`,href:`#`},{label:`Calificaciones`,href:`#`},{label:`Kardex`,href:`#`},{label:`Recibo de Cuota Interna`,href:`#`}];function a(e){return e?.name?e.name.replace(/\s+/g,` `).trim():`Estudiante UANL`}function o(e){let t=(a(e).split(/\s+/).find(e=>e&&!/^m\d+$/i.test(e)&&!/^\d+$/.test(e)&&!/^matr[ií]cula:?$/i.test(e)&&!/^uanl$/i.test(e))||`Estudiante`).toLocaleLowerCase(`es-MX`);return`${t.charAt(0).toLocaleUpperCase(`es-MX`)}${t.slice(1)}`}function s(e){return o(e).charAt(0).toLocaleUpperCase(`es-MX`)||`U`}function c(e){let t=e.toLowerCase();return/horario/.test(t)?`calendar`:/calif/.test(t)?`grades`:/kardex/.test(t)?`kardex`:/recibo|cuota|pago/.test(t)?`receipt`:`arrow`}function l(e){let t={arrow:`<path d="M5 12h14M13 6l6 6-6 6"/>`,calendar:`<path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>`,money:`<path d="M3 7h18v10H3V7Z"/><path d="M7 7a4 4 0 0 1-4 4M21 11a4 4 0 0 1-4-4M7 17a4 4 0 0 0-4-4M21 13a4 4 0 0 0-4 4"/><circle cx="12" cy="12" r="2"/>`,grades:`<path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z"/><path d="M8 7h6M8 11h8M8 15h5"/>`,kardex:`<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>`,pencil:`<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>`,gear:`<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 1 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/>`,receipt:`<path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>`};return`<svg class="siase-icon" viewBox="0 0 24 24" aria-hidden="true">${t[e]??t.arrow}</svg>`}function u(e){return e.length?[{label:`Horario`,matcher:/horario/i,category:`schedule`},{label:`Calificaciones`,matcher:/calif/i,category:`academic`},{label:`Kárdex Oficial`,matcher:/kardex/i,category:`academic`}].map(t=>e.find(e=>t.matcher.test(e.label))??{label:t.label,href:`#`,category:t.category}):i.map(e=>({...e,category:`academic`}))}var d=220;function f(e){let t=(e?.rawText??``).match(/cr[eé]ditos?\D{0,24}(\d{1,3})/i);return t?.[1]?Number(t[1]):void 0}function p(e){let t=f(e);return t===void 0?`No disponible`:String(t)}function m(e){let t=f(e);return t===void 0?0:Math.min(Math.round(t/d*100),100)}function h(e){let t=f(e);return t===void 0?`El progreso se actualizará cuando haya datos académicos disponibles.`:`Faltan ${Math.max(d-t,0)} créditos para completar el plan de referencia actual.`}function g(e,t){if(e.dataset.typedGreeting===t)return;if(e.dataset.typedGreeting=t,window.matchMedia(`(prefers-reduced-motion: reduce)`).matches){e.textContent=t,e.classList.remove(`siase-dashboard__greeting--typing`);return}e.textContent=``,e.classList.add(`siase-dashboard__greeting--typing`);let n=0,r=window.setInterval(()=>{e.textContent=t.slice(0,n+1),n+=1,n>=t.length&&(window.clearInterval(r),window.setTimeout(()=>e.classList.remove(`siase-dashboard__greeting--typing`),800))},42)}function _(e,t){let n=e.createElement(`section`);return n.id=`siase-plus-shell`,n.innerHTML=`
    <header class="siase-dashboard__header siase-entrance siase-entrance--header">
      <div class="siase-dashboard__identity">
        <div class="siase-dashboard__identity-row">
          <h1 class="siase-dashboard__greeting">¡Hola! Estudiante</h1>
        </div>
        <div class="siase-dashboard__student-meta" aria-label="Información académica">
          <span><strong>Carrera</strong><em data-student-career>No disponible</em></span>
          <span><strong>Plan de estudios</strong><em data-student-plan>No disponible</em></span>
          <span><strong>Matrícula</strong><em data-student-matricula>Pendiente</em></span>
        </div>
      </div>
      <div class="siase-dashboard__tools">
        <div class="siase-theme-picker">
          <button class="siase-theme-button" type="button" aria-label="Personalizar tema" aria-expanded="false">
            ${l(`gear`)}
          </button>
          <div class="siase-theme-menu" hidden>
            <button type="button" data-theme-option="institutional">Institucional</button>
            <button type="button" data-theme-option="dark">Modo Oscuro</button>
            <button type="button" data-theme-option="minimal">Minimalista</button>
          </div>
        </div>
      </div>
      <label class="siase-profile-photo" aria-label="Subir imagen de perfil">
        <span class="siase-profile-photo__avatar">U</span>
        <input data-profile-photo-input type="file" accept="image/*" />
      </label>
    </header>
    <main class="siase-dashboard__main">
      <section class="siase-dashboard__primary">
        <article class="siase-dashboard__section siase-global-progress siase-entrance siase-entrance--progress">
          <div class="siase-dashboard__section-heading">
            <div>
              <p class="siase-dashboard__eyebrow">Tu Avance Global</p>
              <h2>Progreso académico</h2>
            </div>
            <strong class="siase-progress-percent" data-academic-progress-percent>0%</strong>
          </div>
          <div class="siase-academic-progress" aria-label="Progreso de créditos">
            <div class="siase-academic-progress__header">
              <span>Créditos recorridos</span>
              <strong><em data-academic-credits>No disponible</em> / ${d}</strong>
            </div>
            <div class="siase-academic-progress__track">
              <span data-academic-progress-bar style="width: 0%; --progress-width: 0%"></span>
            </div>
            <p class="siase-academic-progress__description" data-academic-missing-credits>
              El progreso se actualizará cuando haya datos académicos disponibles.
            </p>
            <div class="siase-academic-progress__footer">
              <span data-student-status>Situación: Por consultar</span>
            </div>
          </div>
        </article>
        <section class="siase-dashboard__section siase-events siase-entrance siase-entrance--events" aria-label="Próximos eventos">
          <div class="siase-dashboard__section-heading">
            <div>
              <p class="siase-dashboard__eyebrow">Próximos Eventos</p>
              <h2>Fechas importantes</h2>
            </div>
          </div>
          <div class="siase-events__list">
            <article class="siase-event" style="--entry-delay: 760ms">
              <span class="siase-event__icon">${l(`calendar`)}</span>
              <span class="siase-event__copy">
                <strong>Revisar horario</strong>
                <em>Confirma cambios antes del inicio de semana.</em>
              </span>
              <span class="siase-event__date">Próximo</span>
            </article>
            <article class="siase-event" style="--entry-delay: 860ms">
              <span class="siase-event__icon">${l(`money`)}</span>
              <span class="siase-event__copy">
                <strong>Recibo de cuota interna</strong>
                <em>Ten a la mano tu comprobante para trámites.</em>
              </span>
              <span class="siase-event__date">Pendiente</span>
            </article>
          </div>
        </section>
      </section>
      <aside class="siase-dashboard__section siase-quick-panel siase-entrance siase-entrance--quick" aria-label="Acciones rápidas">
        <div class="siase-dashboard__section-heading">
          <div>
            <p class="siase-dashboard__eyebrow">Acciones Rápidas</p>
            <h2>Servicios</h2>
          </div>
          <button class="siase-shortcuts-edit" type="button" aria-label="Modificar accesos directos visibles">
            ${l(`pencil`)}
          </button>
        </div>
        <nav class="siase-dashboard__quick-actions" aria-label="Accesos directos"></nav>
      </aside>
    </main>
  `,n}function v(e){try{return e.defaultView?.sessionStorage.getItem(`siase-plus-profile-photo`)??void 0}catch{return}}function y(e,t){try{e.defaultView?.sessionStorage.setItem(`siase-plus-profile-photo`,t)}catch{}}function b(e,t,n){let r=e.querySelector(`.siase-profile-photo__avatar`);r&&(r.textContent=t?``:n,r.style.backgroundImage=t?`url(${JSON.stringify(t)})`:``)}function x(e,r){let i=e.querySelector(`.siase-theme-button`),a=e.querySelector(`.siase-theme-menu`);t(r,n(r)),e.dataset.themeControlsReady!==`true`&&(e.dataset.themeControlsReady=`true`,i?.addEventListener(`click`,()=>{if(!a||!i)return;let e=!a.hidden;a.hidden=e,i.setAttribute(`aria-expanded`,String(!e))}),a?.querySelectorAll(`[data-theme-option]`).forEach(e=>{e.addEventListener(`click`,()=>{t(r,e.dataset.themeOption??`institutional`),a.hidden=!0,i?.setAttribute(`aria-expanded`,`false`)})}))}function S(e,t,n){if(b(e,v(t),s(n)),e.dataset.profilePhotoControlsReady===`true`)return;e.dataset.profilePhotoControlsReady=`true`;let r=e.querySelector(`[data-profile-photo-input]`);r?.addEventListener(`change`,()=>{let i=r.files?.[0];if(!i)return;let a=new FileReader;a.addEventListener(`load`,()=>{let r=typeof a.result==`string`?a.result:void 0;r&&(y(t,r),b(e,r,s(n)))}),a.readAsDataURL(i)})}function C(e,t,n,r){let i=e.querySelector(`.siase-dashboard__greeting`),a=e.querySelector(`[data-student-career]`),s=e.querySelector(`[data-student-plan]`),d=e.querySelector(`[data-student-matricula]`),f=e.querySelector(`.siase-dashboard__quick-actions`),_=e.querySelector(`[data-academic-credits]`),v=e.querySelector(`[data-academic-progress-bar]`),y=e.querySelector(`[data-academic-progress-label]`),b=e.querySelector(`[data-academic-progress-percent]`),x=e.querySelector(`[data-academic-missing-credits]`),C=e.querySelector(`[data-student-status]`);i&&g(i,`¡Hola! ${o(t)}`),S(e,e.ownerDocument,t),a&&(a.textContent=t?.program||`No disponible`),s&&(s.textContent=t?.plan||`No disponible`),d&&(d.textContent=t?.matricula||`Pendiente`),_&&(_.textContent=p(n));let w=m(n);v&&(v.style.width=`${w}%`,v.style.setProperty(`--progress-width`,`${w}%`)),y&&(y.textContent=`${w}% completado`),b&&(b.textContent=`${w}%`),x&&(x.textContent=h(n)),C&&(C.textContent=`Situación: ${n?.label||`Por consultar`}`),f&&(f.replaceChildren(),u(r).forEach((e,t)=>{let n=f.ownerDocument.createElement(`a`);n.href=e.href,n.target=`center`,n.className=`siase-dashboard__quick-card siase-dashboard__quick-card--${e.category}`,n.style.setProperty(`--entry-delay`,`${940+t*90}ms`);let r=f.ownerDocument.createElement(`span`);r.className=`siase-dashboard__quick-icon`,r.innerHTML=l(c(e.label));let i=f.ownerDocument.createElement(`strong`);i.textContent=e.label;let a=f.ownerDocument.createElement(`span`);a.textContent=`Abrir servicio`;let o=f.ownerDocument.createElement(`span`);o.className=`siase-dashboard__quick-arrow`,o.innerHTML=l(`arrow`),n.append(r,i,a,o),f.append(n)}))}async function w(t){let[n,r,i]=await Promise.all([e(`studentInfo`),e(`studentStatus`),e(`menuItems`)]);C(t,n,r,i??[])}function T(e,t=new URL(location.href)){e.body.classList.add(`siase-plus-center`,`siase-plus-single-view`),e.body.classList.toggle(`siase-plus-main-center`,t.pathname.toLowerCase().includes(`maincenter.htm`));let n=r(t.pathname),i=e.getElementById(`siase-plus-shell`);if(i){let t=i.querySelector(`[data-quest-label]`);t&&(t.textContent=n),x(i,e),w(i);return}let a=_(e,n);e.body.prepend(a),x(a,e),w(a)}export{T as t};