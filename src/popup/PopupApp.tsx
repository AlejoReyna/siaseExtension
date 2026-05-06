import { useEffect, useState } from 'react';

const SIDEBAR_BLUE = '#05386f';
/** Borde más oscuro que el fondo del panel */
const PANEL_BORDER_BLUE = '#021b36';
const TITLE = 'Elaborado por Alexis Reyna';
const SUBTITLE = 'Desde la FIME, para la UANL';
const TITLE_MS = 38;
const SUBTITLE_MS = 32;

function TypeCursor(): JSX.Element {
  return (
    <span
      className="typewriter-cursor ml-0.5 inline-block w-[2px] translate-y-px bg-white align-baseline"
      style={{ height: '1.05em' }}
      aria-hidden
    />
  );
}

export function PopupApp(): JSX.Element {
  const [titleShown, setTitleShown] = useState('');
  const [subtitleShown, setSubtitleShown] = useState('');
  const [titleDone, setTitleDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTitleShown(TITLE.slice(0, i));
      if (i >= TITLE.length) {
        window.clearInterval(id);
        setTitleDone(true);
      }
    }, TITLE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!titleDone) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setSubtitleShown(SUBTITLE.slice(0, i));
      if (i >= SUBTITLE.length) {
        window.clearInterval(id);
        setSubtitleDone(true);
      }
    }, SUBTITLE_MS);
    return () => window.clearInterval(id);
  }, [titleDone]);

  const titleTyping = !titleDone;
  const subtitleTyping = titleDone && !subtitleDone;

  return (
    <main
      className="relative box-border flex w-full max-w-full flex-col items-center justify-center self-center rounded-2xl border-2 border-solid px-8 py-8 font-sans antialiased text-white"
      style={{
        backgroundColor: SIDEBAR_BLUE,
        color: '#ffffff',
        borderColor: PANEL_BORDER_BLUE,
      }}
    >
      <div className="flex w-full max-w-[32rem] flex-col items-center justify-center text-center">
        <p
          className={`w-full text-center font-semibold text-white decoration-white decoration-2 underline-offset-[6px] ${titleDone ? 'underline' : ''}`}
          style={
            titleDone
              ? {
                  fontSize: '1.375rem',
                  lineHeight: 1.35,
                  textDecoration: 'underline',
                  textDecorationThickness: '2px',
                  textUnderlineOffset: '6px',
                }
              : { fontSize: '1.375rem', lineHeight: 1.35, textDecoration: 'none' }
          }
        >
          {titleShown}
          {titleTyping ? <TypeCursor /> : null}
        </p>
        <p
          className="mt-3 w-full text-center leading-relaxed text-white/95"
          style={{ fontSize: '10.5px', lineHeight: 1.5, minHeight: '1.5em' }}
        >
          {subtitleShown}
          {subtitleTyping ? <TypeCursor /> : null}
        </p>
      </div>
    </main>
  );
}
