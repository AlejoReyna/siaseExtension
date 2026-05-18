import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, LayoutDashboard, LineChart, Send, Terminal } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const timelineData: TimelineEvent[] = [
  {
    id: 'step-1',
    date: '27 de Abril, 2026',
    title: 'La Evolución del Dashboard',
    description:
      'El primer paso fue romper el cascarón de los frames heredados. Se diseñó un dashboard moderno, inyectado directamente en el portal existente. Organizamos la información académica, habilitamos temas personalizados y creamos una navegación lateral limpia que respeta los colores institucionales.',
    icon: LayoutDashboard,
  },
  {
    id: 'step-2',
    date: '5 de Mayo, 2026',
    title: 'Sincronizando el Tiempo: Nexus',
    description:
      'Conectamos los hilos invisibles entre SIASE y Nexus. Resolviendo bloqueos de sesión y expiración de tokens, construimos un widget nativo para las actividades próximas. Ahora, con un clic, las fechas límite se exportan a Google Calendar, Outlook o .ics.',
    icon: CalendarDays,
  },
  {
    id: 'step-3',
    date: '6 de Mayo, 2026',
    title: 'El Conocimiento es Poder: Kardex Automático',
    description:
      'La extensión comenzó a leer el Kardex en segundo plano. Analizando créditos, calculando porcentajes de progreso y determinando el promedio aritmético sin la intervención del estudiante. Todo resumido en una sola tira de métricas visuales.',
    icon: LineChart,
  },
];

export function StoryPage(): JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    console.info('Feature solicitada:', trimmed);
    try {
      const { featureSuggestions = [] } = await chrome.storage.local.get('featureSuggestions');
      const list = Array.isArray(featureSuggestions) ? featureSuggestions : [];
      await chrome.storage.local.set({
        featureSuggestions: [...list, `${new Date().toISOString()}: ${trimmed}`],
      });
    } catch {
      /* ignore */
    }
    setInputValue('');
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas-white)] font-[var(--font-af)] text-[var(--color-pitch-black)] selection:bg-[var(--color-action-azure)] selection:text-white">
      <section className="relative flex min-h-screen flex-col items-center justify-center px-[var(--spacing-24)] text-center">
        <motion.div
          initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.95, y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <Terminal
            className="mx-auto mb-[var(--spacing-24)] text-[var(--color-slate-gray)]"
            size={48}
            strokeWidth={1.5}
          />
          <h1 className="mb-[var(--spacing-24)] font-[var(--font-ppmondwest)] text-[var(--text-display)] leading-tight">
            El sistema heredado.
            <br />
            La nueva realidad.
          </h1>
          <p className="text-[var(--text-heading)] leading-relaxed text-[var(--color-charcoal)]">
            SIASE es un laberinto de frames y CGI de otra época. Pero debajo de ese código, hay una experiencia esperando
            ser liberada. Esto no es solo un reskin, es una reconstrucción completa de la experiencia académica en la
            UANL.
          </p>
          <p className="mt-[var(--spacing-16)] text-[var(--text-subheading)] text-[var(--color-slate-gray)]">
            Sigue haciendo scroll para ver el proceso.
          </p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-4xl px-[var(--spacing-24)] py-[var(--spacing-80)]">
        {timelineData.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.section
              key={step.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="mb-[var(--spacing-80)] flex flex-col items-start gap-[var(--spacing-32)] md:flex-row"
            >
              <div className="mt-[var(--spacing-8)] hidden flex-col items-center md:flex">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-off-white)] shadow-[var(--shadow-subtle)]">
                  <Icon className="text-[var(--color-action-azure)]" size={24} strokeWidth={1.5} />
                </div>
                {index !== timelineData.length - 1 ? (
                  <div className="mt-[var(--spacing-16)] h-40 w-px bg-[var(--color-medium-gray)] opacity-20" />
                ) : null}
              </div>

              <div className="flex-1 rounded-[var(--radius-card-lg)] border border-[var(--color-off-white)] bg-[var(--color-canvas-white)] p-[var(--spacing-32)] shadow-[var(--shadow-sm)]">
                <span className="font-[var(--font-ppmondwest)] text-[var(--text-button-label)] uppercase tracking-wider text-[var(--color-slate-gray)]">
                  {step.date}
                </span>
                <h2 className="mt-[var(--spacing-8)] font-[var(--font-ppmondwest)] text-[var(--text-heading-lg)] text-[var(--color-cofounder-blue)]">
                  {step.title}
                </h2>
                <p className="mt-[var(--spacing-16)] text-[var(--text-subheading)] leading-relaxed text-[var(--color-charcoal)]">
                  {step.description}
                </p>
              </div>
            </motion.section>
          );
        })}
      </div>

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '0%' }}
        transition={{ duration: 1 }}
        className="flex min-h-[60vh] flex-col items-center justify-center border-t border-[var(--color-off-white)] bg-[var(--color-canvas-white)] px-[var(--spacing-24)] py-[var(--spacing-64)] text-center"
      >
        <h2 className="mb-[var(--spacing-40)] max-w-4xl font-[var(--font-ppmondwest)] text-[var(--text-display)] leading-tight text-[var(--color-pitch-black)]">
          Este proyecto sigue en desarrollo, ¿hay alguna feature que te gustaría ver?
        </h2>

        <form onSubmit={handleSubmit} className="relative flex w-full max-w-2xl items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="# SIASE Plus"
            aria-label="Sugiere una funcionalidad para SIASE Plus"
            className="w-full border-b-2 border-[var(--color-medium-gray)] bg-transparent py-[var(--spacing-16)] pl-0 pr-[var(--spacing-48)] text-[var(--text-heading)] text-[var(--color-pitch-black)] transition-colors placeholder:text-[var(--color-medium-gray)] placeholder:opacity-50 focus:border-[var(--color-action-azure)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            aria-label="Enviar sugerencia"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-[var(--spacing-8)] text-[var(--color-medium-gray)] transition-colors hover:text-[var(--color-action-azure)] disabled:opacity-50 disabled:hover:text-[var(--color-medium-gray)]"
          >
            <Send size={24} strokeWidth={1.5} />
          </button>
        </form>
      </motion.section>
    </main>
  );
}
