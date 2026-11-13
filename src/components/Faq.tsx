import { Plus } from 'lucide-react';
import { FAQ } from '../content/faq';

export function Faq() {
  return (
    <div className="divide-y divide-ink-200/80 border-y border-ink-200/80">
      {FAQ.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left">
            <h3 className="text-[17px] font-medium tracking-tight text-ink-950 transition-colors group-hover:text-ink-700">{item.question}</h3>
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700 transition-all duration-200 group-open:rotate-45 group-open:bg-ink-950 group-open:text-signal-400"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          </summary>
          <p className="-mt-1 max-w-2xl pb-6 text-[15px] leading-relaxed text-ink-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
