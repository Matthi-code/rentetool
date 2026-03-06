"""
BIK Calculator - Buitengerechtelijke Incassokosten
===================================================
Berekent incassokosten conform het Besluit vergoeding buitengerechtelijke incassokosten.

Staffel (wettelijk vastgelegd):
  Over eerste €2.500:      15% (minimum €40)
  Over volgende €2.500:    10%
  Over volgende €5.000:    5%
  Over volgende €190.000:  1%
  Boven €200.000:          0,5%
  Maximum: €6.775
"""

from decimal import Decimal, ROUND_HALF_UP


BIK_STAFFEL = [
    (Decimal("2500"), Decimal("0.15")),
    (Decimal("2500"), Decimal("0.10")),
    (Decimal("5000"), Decimal("0.05")),
    (Decimal("190000"), Decimal("0.01")),
]

BIK_MINIMUM = Decimal("40")
BIK_MAXIMUM = Decimal("6775")
BIK_BOVEN_200K_PCT = Decimal("0.005")


def bereken_bik(hoofdsom: Decimal) -> Decimal:
    """
    Bereken BIK conform wettelijke staffel.

    Args:
        hoofdsom: De hoofdsom waarover BIK berekend wordt.

    Returns:
        Het berekende BIK-bedrag (afgerond op 2 decimalen).
    """
    if hoofdsom <= 0:
        return Decimal("0")

    restant = hoofdsom
    bik = Decimal("0")

    for schijf, percentage in BIK_STAFFEL:
        if restant <= 0:
            break
        over = min(restant, schijf)
        bik += over * percentage
        restant -= over

    # Boven €200.000: 0,5%
    if restant > 0:
        bik += restant * BIK_BOVEN_200K_PCT

    # Afronden
    bik = bik.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Minimum €40, maximum €6.775
    bik = max(bik, BIK_MINIMUM)
    bik = min(bik, BIK_MAXIMUM)

    return bik
