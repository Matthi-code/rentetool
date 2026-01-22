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
            <li><strong>Art. 6:44 BW</strong> — Volgorde binnen vordering: rente → kosten → hoofdsom</li>
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

      {/* Strategie */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Betalingsstrategie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Strategie: Meest Bezwarend</h3>
            <p className="text-sm text-muted-foreground">
              Betalingen worden eerst toegerekend aan de vordering met het hoogste rentepercentage.
              Bij gelijk percentage geldt de oudste vordering eerst. Dit is de wettelijke default conform art. 6:43 BW.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Renteberekening schema */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Hoe wordt rente berekend?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Basisformule</h3>
            <div className="p-4 bg-muted/30 rounded-lg font-mono text-center">
              Rente = Hoofdsom × Rentepercentage × (Dagen / 365)
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Periodes worden gesplitst op:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Rentewijzigingen</li>
              <li>Verjaardagen (bij samengestelde rente → kapitalisatie)</li>
              <li>Betalingsdata</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Kosten met aparte rentedatum</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Wanneer kosten (bijv. proceskosten) een latere rentedatum hebben dan de vordering,
              worden de renteberekeningen apart uitgevoerd:
            </p>

            <div className="relative border rounded-lg p-4 bg-muted/10">
              {/* Tijdlijn */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-muted-foreground mb-2">TIJDLIJN</div>
                <div className="relative h-2 bg-muted rounded-full">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" title="Start vordering"></div>
                  <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full" title="Start kosten"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full" title="Einddatum"></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>01-01-2024<br/><span className="text-primary">Vordering</span></span>
                  <span className="text-center">15-01-2024<br/><span className="text-amber-600">Kosten ⏱</span></span>
                  <span className="text-right">01-07-2024<br/><span className="text-green-600">Einddatum</span></span>
                </div>
              </div>

              {/* Twee parallelle berekeningen */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="font-semibold text-primary text-sm mb-2">Rente op Hoofdsom</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>01-01 t/m 30-06</span>
                      <span className="font-mono">181 dagen</span>
                    </div>
                    <div className="text-muted-foreground">
                      €10.000 × 4% × 181/365 = <span className="font-mono">€198,36</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="font-semibold text-amber-700 text-sm mb-2">Rente op Kosten ⏱</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>15-01 t/m 30-06</span>
                      <span className="font-mono">167 dagen</span>
                    </div>
                    <div className="text-muted-foreground">
                      €1.500 × 4% × 167/365 = <span className="font-mono">€27,45</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Evenredige verdeling bij meerdere vorderingen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bij meerdere vorderingen met <strong>exact dezelfde rente%</strong> én <strong>dezelfde startdatum</strong>
              wordt een betaling <strong>proportioneel verdeeld</strong> over deze vorderingen, op basis van het openstaande bedrag.
            </p>

            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-2">Voorbeeld:</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Twee vorderingen met zelfde rente (4%) en startdatum:
              </p>
              <ul className="text-sm space-y-1 mb-3">
                <li>• Vordering A: €130.000 openstaand (rente: €9.306)</li>
                <li>• Vordering B: €5.000 openstaand (rente: €358)</li>
              </ul>
              <p className="text-sm text-muted-foreground mb-2">
                Betaling van €6.000 wordt proportioneel verdeeld:
              </p>
              <ul className="text-sm space-y-1">
                <li>• Vordering A krijgt: €6.000 × (130.000 / 135.000) = <strong>€5.778</strong></li>
                <li>• Vordering B krijgt: €6.000 × (5.000 / 135.000) = <strong>€222</strong></li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Dit verklaart waarom niet alle opgebouwde rente van één vordering wordt afgelost,
                ook al lijkt de betaling groot genoeg — het bedrag wordt verdeeld over alle vorderingen met dezelfde prioriteit.
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

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="font-semibold">BETALING ONTVANGEN</div>
            </div>

            <div className="flex justify-center">
              <span className="text-2xl">↓</span>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <div className="font-semibold mb-2">Stap 1: Welke vordering eerst?</div>
              <div className="text-sm text-muted-foreground">
                Aangewezen? → Die vordering(en) eerst<br />
                Niet aangewezen? → Volgens strategie (meest bezwarend)
              </div>
            </div>

            <div className="flex justify-center">
              <span className="text-2xl">↓</span>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="font-semibold mb-2">Stap 2: Binnen vordering (Art. 6:44 BW)</div>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <span className="px-3 py-1 bg-white rounded border">1. RENTE KOSTEN</span>
                <span className="text-xl">→</span>
                <span className="px-3 py-1 bg-white rounded border">2. KOSTEN</span>
                <span className="text-xl">→</span>
                <span className="px-3 py-1 bg-white rounded border">3. RENTE HOOFDSOM</span>
                <span className="text-xl">→</span>
                <span className="px-3 py-1 bg-white rounded border">4. HOOFDSOM</span>
              </div>
            </div>

            <div className="flex justify-center">
              <span className="text-2xl">↓</span>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <div className="font-semibold mb-2">Stap 3: Restant?</div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                <div className="p-2 bg-white rounded border">
                  <strong>Ja:</strong> Volgende vordering (herhaal)
                </div>
                <div className="p-2 bg-white rounded border">
                  <strong>Nee:</strong> Klaar ✓
                </div>
              </div>
            </div>
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
            <h3 className="font-semibold mb-1">Proceskosten met eigen rentedatum</h3>
            <p className="text-sm text-muted-foreground">
              Proceskosten (bijv. 14 dagen na vonnis) kunt u bij de vordering invoeren
              met een aparte rentedatum. Vul bij &apos;Kosten&apos; het bedrag in en bij
              &apos;Rente vanaf&apos; de datum waarop de rente op de kosten ingaat.
              Het ⏱ symbool geeft aan dat kosten een afwijkende rentedatum hebben.
            </p>
          </div>

          <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
            <h3 className="font-semibold mb-1">Aanwijzen van betalingen</h3>
            <p className="text-sm text-muted-foreground">
              Bij het invoeren van een deelbetaling kunt u deze aanwijzen aan specifieke
              vorderingen. Als u niets aanwijst, wordt de strategie &apos;meest bezwarend&apos; toegepast.
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
              Wanneer het wettelijke rentepercentage wijzigt, splitst de Rentetool
              de renteperiodes automatisch op de wijzigingsdata en past het correcte
              percentage toe per periode.
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
              <li>• Vordering: €10.000, startdatum 01-01-2024, Wettelijke rente</li>
              <li>• Kosten: €1.500, rentedatum 15-01-2024 ⏱</li>
            </ul>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Betaling €2.000 op 01-07-2024:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Volgorde conform art. 6:44 BW:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Rente op kosten: ±€27 aflossen</li>
              <li>Kosten: €1.500 aflossen</li>
              <li>Rente op hoofdsom: ±€198 aflossen</li>
              <li>Hoofdsom: ±€275 aflossen (rest van €2.000)</li>
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
