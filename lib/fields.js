// Alle Felder, gruppiert. k = Spaltenname in der DB.
export const GROUPS = [
  {
    title: 'Stammdaten',
    fields: [
      { k: 'name', label: 'Bezeichnung', type: 'text', required: true },
      { k: 'property_type', label: 'Objektart', type: 'text', ph: 'Wohnung, Haus …' },
      { k: 'status', label: 'Status', type: 'select', options: ['bestand', 'ankauf', 'verkauft'] },
      { k: 'street', label: 'Straße', type: 'text' },
      { k: 'house_number', label: 'Nr.', type: 'text' },
      { k: 'zip', label: 'PLZ', type: 'text' },
      { k: 'city', label: 'Ort', type: 'text' },
      { k: 'state', label: 'Bundesland', type: 'text' },
      { k: 'country', label: 'Land', type: 'text' },
      { k: 'build_year', label: 'Baujahr', type: 'number' },
      { k: 'living_area', label: 'Wohnfläche (m²)', type: 'number', step: '0.01' },
      { k: 'rooms', label: 'Zimmer', type: 'number', step: '0.5' },
      { k: 'floor', label: 'Etage', type: 'text' },
      { k: 'units', label: 'Einheiten', type: 'number' },
    ],
  },
  {
    title: 'Ankauf',
    fields: [
      { k: 'purchase_price', label: 'Kaufpreis (€)', type: 'number', step: '0.01' },
      { k: 'purchase_date', label: 'Kaufdatum', type: 'date' },
      { k: 'land_transfer_tax', label: 'Grunderwerbsteuer (€)', type: 'number', step: '0.01' },
      { k: 'notary_costs', label: 'Notarkosten (€)', type: 'number', step: '0.01' },
      { k: 'broker_costs', label: 'Maklerkosten (€)', type: 'number', step: '0.01' },
      { k: 'building_share_percent', label: 'Gebäudeanteil (%)', type: 'number', step: '0.01' },
      { k: 'current_value', label: 'Aktueller Wert (€)', type: 'number', step: '0.01' },
    ],
  },
  {
    title: 'Laufend',
    fields: [
      { k: 'cold_rent', label: 'Kaltmiete / Monat (€)', type: 'number', step: '0.01' },
      { k: 'additional_costs', label: 'Laufende Kosten / Monat (€)', type: 'number', step: '0.01' },
    ],
  },
  {
    title: 'Steuer / AfA',
    fields: [
      { k: 'afa_method', label: 'AfA-Methode', type: 'select', options: ['linear', 'degressiv'] },
      { k: 'afa_rate', label: 'AfA-Satz (%)', type: 'number', step: '0.01' },
      { k: 'afa_start', label: 'AfA-Beginn', type: 'date' },
    ],
  },
  {
    title: 'Finanzierung',
    fields: [
      { k: 'loan_amount', label: 'Darlehenssumme (€)', type: 'number', step: '0.01' },
      { k: 'loan_interest', label: 'Zins (% p.a.)', type: 'number', step: '0.01' },
      { k: 'loan_repayment', label: 'Tilgung (% p.a.)', type: 'number', step: '0.01' },
      { k: 'loan_bank', label: 'Bank', type: 'text' },
    ],
  },
  {
    title: 'Notizen',
    fields: [{ k: 'notes', label: 'Notiz', type: 'textarea' }],
  },
];

export const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.k));
