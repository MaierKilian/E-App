import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

interface AccordionItemProps {
  title: string
  children: ReactNode
}

/** Einzelner auf-/zuklappbarer Eintrag im Glass-Stil. */
export function AccordionItem({ title, children }: AccordionItemProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('education.collapse') : t('education.expand')}
        className="focus-ring flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed text-foreground">{children}</div>
      )}
    </Card>
  )
}
