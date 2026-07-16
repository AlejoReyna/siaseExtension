export function enhanceDocumentUploadPage(frameDocument: Document): boolean {
  frameDocument.body.classList.add('siase-v2-document-upload-page');

  frameDocument.querySelector('h1, h2')?.classList.add('siase-v2-service-title');
  frameDocument
    .querySelector<HTMLFormElement>('form[name="mi_forma"]')
    ?.classList.add('siase-v2-document-form');
  frameDocument.getElementById('idFormulario')?.classList.add('siase-v2-document-fieldset');
  frameDocument.getElementById('idContList')?.classList.add('siase-v2-document-list');
  frameDocument.getElementById('idListado')?.classList.add('siase-v2-document-table');
  frameDocument.getElementById('idListado_wrapper')?.classList.add('siase-v2-data-table');
  frameDocument.getElementById('idEnviarRevision')?.classList.add('siase-v2-review-action');

  const documentType = frameDocument.querySelector<HTMLSelectElement>('#idCve_Docto');
  if (documentType && !documentType.getAttribute('aria-label')) {
    documentType.setAttribute('aria-label', 'Tipo de documento');
  }

  const fileInput = frameDocument.querySelector<HTMLInputElement>(
    '#HTMLArchivo[type="file"][name="HTMLArchivo"]'
  );
  if (fileInput && !fileInput.getAttribute('aria-label')) {
    fileInput.setAttribute('aria-label', 'Archivo');
  }

  frameDocument.getElementById('idTermina')?.classList.add('siase-v2-review-button');
  frameDocument.querySelector('[role="progressbar"]')?.classList.add('siase-v2-native-progress');
  frameDocument.querySelector('.progress')?.classList.add('siase-v2-progress-track');
  frameDocument
    .getElementById('idRevision')
    ?.closest('.ui-dialog')
    ?.classList.add('siase-v2-service-dialog');
  frameDocument
    .getElementById('idMensaje')
    ?.closest('.ui-dialog')
    ?.classList.add('siase-v2-service-dialog');
  return Boolean(frameDocument.querySelector('form[name="mi_forma"], #idListado'));
}
