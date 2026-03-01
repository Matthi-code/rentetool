'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
}

const FEATURE_INFO: Record<string, { title: string; description: string }> = {
  opslaan: {
    title: 'Dossiers Opslaan',
    description: 'Met Pro kun je berekeningen opslaan als dossiers, zodat je er later aan kunt verder werken.',
  },
  pdf: {
    title: 'PDF zonder Watermerk',
    description: 'Download professionele PDF\'s zonder watermerk, geschikt voor gebruik in rechtszaken en correspondentie.',
  },
  snapshots: {
    title: 'Snapshots & Historie',
    description: 'Sla tussentijdse berekeningen op als snapshot, zodat je de historie kunt terugzien.',
  },
  sharing: {
    title: 'Zaken Delen',
    description: 'Deel zaken met collega\'s en werk samen aan berekeningen.',
  },
  vorderingen: {
    title: 'Meer Vorderingen',
    description: 'Voeg onbeperkt vorderingen toe aan je berekening. In de gratis versie is het maximum 3.',
  },
  deelbetalingen: {
    title: 'Meer Deelbetalingen',
    description: 'Voeg onbeperkt deelbetalingen toe. In de gratis versie is het maximum 1.',
  },
  pauze: {
    title: 'Schorsing / Uitstel van Betaling',
    description: 'Pauzeer de renteberekening voor een periode, bijvoorbeeld bij uitstel van betaling of schorsing.',
  },
};

const PRO_FEATURES = [
  'Onbeperkt vorderingen en deelbetalingen',
  'Dossiers opslaan en later hervatten',
  'Professionele PDF zonder watermerk',
  'Snapshots en berekening-historie',
  'Zaken delen met collega\'s',
  'Schorsing / uitstel van betaling',
];

export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const info = FEATURE_INFO[feature] || {
    title: 'Pro Functie',
    description: 'Deze functie is alleen beschikbaar in de Pro versie.',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary">
            Upgrade naar Pro
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            <span className="font-semibold text-foreground">{info.title}</span>
            {' '}&mdash; {info.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm font-medium mb-3">Met Pro krijg je:</p>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5 shrink-0">&#10003;</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Later
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              // TODO: Link naar betaalpagina of contactformulier
              window.location.href = 'mailto:info@rentetool.nl?subject=Upgrade naar Pro';
              onClose();
            }}
          >
            Upgrade naar Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
