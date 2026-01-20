'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="container py-8 max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          ← Terug
        </Button>
        <h1 className="font-serif text-3xl font-bold text-primary">Help & Uitleg</h1>
        <p className="text-muted-foreground mt-2">
          Hoe werkt de Rentetool en hoe worden berekeningen uitgevoerd?
        </p>
      </div>

      {/* Wettelijke basis */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Wettelijke Basis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>De Rentetool berekent wettelijke rente conform het Burgerlijk Wetboek:</p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Art. 6:119 BW</strong> — Wettelijke rente (particulier)</li>
            <li><strong>Art. 6:119a BW</strong> — Handelsrente (B2B transacties)</li>
            <li><strong>Art. 6:119 lid 2 BW</strong> — Samengestelde rente (kapitalisatie op verjaardag)</li>
            <li><strong>Art. 6:43 BW</strong> — Toerekening op meest bezwarende vordering</li>
            <li><strong>Art. 6:44 BW</strong> — Volgorde binnen vordering: kosten → rente → hoofdsom</li>
          </ul>
        </CardContent>
      </Card>

      {/* Rentetypes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Rentetypes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Omschrijving</th>
                  <th className="text-left py-2">Kapitalisatie</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-mono">1</td>
                  <td className="py-2 pr-4">Wettelijke rente</td>
                  <td className="py-2">Samengesteld (op verjaardag)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">2</td>
                  <td className="py-2 pr-4">Handelsrente</td>
                  <td className="py-2">Samengesteld (op verjaardag)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">3</td>
                  <td className="py-2 pr-4">Wettelijke rente enkelvoudig</td>
                  <td className="py-2">Geen</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">4</td>
                  <td className="py-2 pr-4">Handelsrente enkelvoudig</td>
                  <td className="py-2">Geen</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">5</td>
                  <td className="py-2 pr-4">Contractueel vast percentage</td>
                  <td className="py-2">Naar keuze</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">6</td>
                  <td className="py-2 pr-4">Wettelijke rente + opslag</td>
                  <td className="py-2">Samengesteld (op verjaardag)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">7</td>
                  <td className="py-2 pr-4">Handelsrente + opslag</td>
                  <td className="py-2">Samengesteld (op verjaardag)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Strategieën */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Betalingsstrategieën</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold mb-2">Strategie A: Meest Bezwarend</h3>
              <p className="text-sm text-muted-foreground">
                Betalingen worden eerst toegerekend aan de vordering met het hoogste rentepercentage.
                Bij gelijk percentage geldt de oudste vordering eerst. Dit is de wettelijke default conform art. 6:43 BW.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold mb-2">Strategie B: Oudste Eerst</h3>
              <p className="text-sm text-muted-foreground">
                Betalingen worden toegerekend op volgorde van startdatum, oudste vordering eerst.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betalingstoerekening diagram */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Betalingstoerekening</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Hoe wordt een deelbetaling verwerkt over meerdere vorderingen?
          </p>

          <div className="bg-muted/20 p-6 rounded-lg font-mono text-xs overflow-x-auto">
            <pre className="whitespace-pre">{`
                         BETALING ONTVANGEN
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Betaling aangewezen  │
                    │  aan vordering(en)?   │
                    └───────────┬───────────┘
                          │           │
                         Ja          Nee
                          │           │
                          ▼           ▼
              ┌─────────────────┐  ┌─────────────────┐
              │ Aangewezen      │  │ Sorteer volgens │
              │ vorderingen     │  │ strategie:      │
              │ eerst           │  │ A: hoogste rente│
              └────────┬────────┘  │ B: oudste eerst │
                       │           └────────┬────────┘
                       └─────────┬──────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────┐
        │         PER VORDERING (Art. 6:44 BW)       │
        │                                            │
        │    1. KOSTEN  →  2. RENTE  →  3. HOOFDSOM  │
        │                                            │
        └────────────────────────┬───────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │   Restant betaling?   │
                    └───────────┬───────────┘
                          │           │
                         Ja          Nee
                          │           │
                          ▼           ▼
              ┌─────────────────┐  ┌─────────────────┐
              │ Volgende        │  │     KLAAR       │
              │ vordering       │  │       ✓         │
              └────────┬────────┘  └─────────────────┘
                       │
                       └──────► (herhaal)
`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Tips & Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
            <h3 className="font-semibold mb-1">Proceskosten als aparte vordering</h3>
            <p className="text-sm text-muted-foreground">
              Proceskosten met een eigen ingangsdatum (bijv. 14 dagen na betekening vonnis)
              kunt u het beste toevoegen als aparte vordering. Zo krijgen de proceskosten
              hun eigen rentedatum en -berekening.
            </p>
          </div>

          <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
            <h3 className="font-semibold mb-1">Aanwijzen van betalingen</h3>
            <p className="text-sm text-muted-foreground">
              Bij het invoeren van een deelbetaling kunt u deze aanwijzen aan specifieke
              vorderingen. Als u niets aanwijst, wordt de gekozen strategie (A of B) toegepast.
              Een restant na volledige aflossing van aangewezen vorderingen stroomt automatisch
              door naar overige vorderingen.
            </p>
          </div>

          <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
            <h3 className="font-semibold mb-1">Kapitalisatie (samengestelde rente)</h3>
            <p className="text-sm text-muted-foreground">
              Bij samengestelde rente (types 1, 2, 6, 7) wordt de opgebouwde rente jaarlijks
              op de verjaardag van de vordering bij de hoofdsom opgeteld. Dit heet kapitalisatie.
              In de specificatie ziet u dit terug als ↻ symbool.
            </p>
          </div>

          <div className="p-4 border-l-4 border-amber-500 bg-amber-50 rounded-r-lg">
            <h3 className="font-semibold mb-1">Rentewijzigingen</h3>
            <p className="text-sm text-muted-foreground">
              De wettelijke rente wijzigt halfjaarlijks (1 januari en 1 juli).
              De Rentetool splitst renteperiodes automatisch op deze wijzigingsdata
              en past het correcte percentage toe per periode.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voorbeeld */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Rekenvoorbeeld</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vonnis: Gedaagde moet €10.000 betalen met wettelijke rente vanaf 1 januari 2024,
            plus €1.500 proceskosten met rente vanaf 15 januari 2024 (14 dagen na vonnis).
          </p>

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Invoer:</h4>
            <ul className="text-sm space-y-1">
              <li>• Vordering 1: €10.000, startdatum 01-01-2024, Wettelijke rente</li>
              <li>• Vordering 2 (proceskosten): €1.500, startdatum 15-01-2024, Wettelijke rente</li>
            </ul>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Betaling €5.000 op 01-07-2024 (strategie A):</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Beide vorderingen hebben hetzelfde rentepercentage, dus oudste eerst:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Vordering 1: rente (±€350) aflossen</li>
              <li>Vordering 1: hoofdsom (±€4.650) aflossen</li>
              <li>Vordering 1 openstaand: ±€5.350</li>
              <li>Vordering 2 ongewijzigd: €1.500 + rente</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Vragen?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Heeft u vragen over de werking van de Rentetool of over specifieke berekeningen?
            Neem contact op met de beheerder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
