import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { fileToAvatarDataUrl } from '@/lib/image'

interface AvatarPickerProps {
  /** Aktuelles Profilbild als Data-URL (leer = keins). */
  value?: string
  /** Name für die Initialen-Vorschau, solange kein Bild gewählt wurde. */
  name?: string
  onChange: (dataUrl: string) => void
  /** Kantenlänge des Avatars in Pixeln (Standard 88). */
  size?: number
  /** Beschriftung des Hinzufügen-Buttons (Standard: Onboarding-Text). */
  addLabel?: string
  /** Beschriftung des Entfernen-Buttons (Standard: Onboarding-Text). */
  removeLabel?: string
}

/**
 * Interaktiver Profilbild-Wähler: tippbarer Avatar mit Kamera-Badge öffnet den
 * Dateidialog, das Bild wird clientseitig heruntergerechnet und als Data-URL
 * zurückgegeben. Ist bereits ein Bild gesetzt, erscheint ein Entfernen-Button.
 */
export function AvatarPicker({
  value,
  name,
  onChange,
  size = 88,
  addLabel,
  removeLabel,
}: AvatarPickerProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const addText = addLabel ?? t('onboarding.step1.profileImageAdd')
  const removeText = removeLabel ?? t('onboarding.step1.profileImageRemove')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // gleiche Datei erneut wählbar machen
    if (!file) return
    setBusy(true)
    try {
      onChange(await fileToAvatarDataUrl(file))
    } catch {
      // Fehler beim Einlesen ignorieren – der Nutzer kann es erneut versuchen.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={addText}
        className={`focus-ring relative rounded-full transition-transform active:scale-95 ${busy ? 'opacity-60' : ''}`}
      >
        <Avatar src={value || undefined} name={name} size={size} className="ring-2 ring-border" />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-surface">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {removeText}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium text-primary hover:underline"
        >
          {addText}
        </button>
      )}
    </div>
  )
}
