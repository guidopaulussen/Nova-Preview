/**
 * Synthetische gegevens. Nooit klantdata of productie-identificaties in een demo.
 */
export const demoSeed = {
  id: 'DEMO-INV-001',
  customer: { id: 'DEMO-REL-1001', displayName: 'Fictieve klant' },
  serviceId: 'DEMO-HYP-2001',
  appointmentAt: '2026-12-12T13:00:00+01:00',
  workflowStatus: 'active',
  sections: [
    { id: 'persoonlijk', title: 'Persoonlijk', subtitle: 'Identiteit, gezin en contactgegevens', fields: [
      { id: 'address', label: 'Woonadres', key: 'person.address', current: 'Voorbeeldstraat 1', proposed: 'Voorbeeldstraat 1', sourceId: 'DOC-01' },
      { id: 'household', label: 'Huishouden', key: 'household.members', current: '2 personen', proposed: '2 personen + kind', sourceId: 'DOC-04' },
      { id: 'phone', label: 'Telefoon', key: 'person.phone', current: null, proposed: null, sourceId: '' }
    ] },
    { id: 'inkomen', title: 'Inkomen', subtitle: 'Werkgeversverklaring, salarissen en inkomensbronnen', fields: [
      { id: 'salary', label: 'Bruto jaarinkomen', key: 'income.annual', current: '€ 58.000', proposed: '€ 65.000', sourceId: 'DOC-02' },
      { id: 'employer', label: 'Werkgever', key: 'income.employer', current: 'De Horizon B.V.', proposed: 'De Horizon B.V.', sourceId: 'DOC-02' },
      { id: 'bonus', label: 'Variabel inkomen', key: 'income.bonus', current: null, proposed: null, sourceId: '' }
    ] },
    { id: 'wonen', title: 'Wonen', subtitle: 'Bestaande woning en nieuwe woonsituatie', fields: [
      { id: 'value', label: 'Geschatte woningwaarde', key: 'housing.value', current: '€ 410.000', proposed: '€ 430.000', sourceId: 'DOC-03' },
      { id: 'purpose', label: 'Doel financiering', key: 'housing.purpose', current: 'Doorstromen', proposed: 'Doorstromen', sourceId: 'DOC-04' }
    ] },
    { id: 'hypotheek', title: 'Hypotheek', subtitle: 'Huidige hypotheek en leningdelen', fields: [
      { id: 'balance', label: 'Openstaande hypotheek', key: 'mortgage.balance', current: '€ 218.000', proposed: '€ 214.500', sourceId: 'DOC-03' },
      { id: 'rate', label: 'Huidige hypotheekrente', key: 'mortgage.rate', current: '2,31%', proposed: '2,31%', sourceId: 'DOC-03' }
    ] },
    { id: 'verplichtingen', title: 'Verplichtingen', subtitle: 'Leningen, krediet en financiële verplichtingen', fields: [
      { id: 'loan', label: 'Doorlopend krediet', key: 'liabilities.credit', current: 'Onbekend', proposed: null, sourceId: '' }
    ] },
    { id: 'vermogen', title: 'Vermogen', subtitle: 'Spaargeld en beschikbare eigen middelen', fields: [
      { id: 'savings', label: 'Beschikbaar spaargeld', key: 'wealth.savings', current: '€ 36.000', proposed: '€ 44.000', sourceId: 'DOC-04' }
    ] }
  ],
  signals: [
    { id: 'SIG-01', title: 'Inkomen wijkt af', finding: 'Werkgeversverklaring vermeldt € 65.000; CRM bevat € 58.000.', severity: 'high', sourceId: 'DOC-02' },
    { id: 'SIG-02', title: 'Huidige hypotheek actualiseren', finding: 'Aangeleverde opgave wijkt af van de geregistreerde restschuld.', severity: 'medium', sourceId: 'DOC-03' },
    { id: 'SIG-03', title: 'Variabel inkomen ontbreekt', finding: 'Nog geen onderbouwde gegevens beschikbaar voor variabel inkomen.', severity: 'medium', sourceId: '' }
  ],
  documents: [
    { id: 'DOC-01', name: 'Identiteitsdocument', category: 'Identiteit', received: '08 dec 2026', status: 'ontvangen' },
    { id: 'DOC-02', name: 'Werkgeversverklaring', category: 'Inkomen', received: '09 dec 2026', status: 'ontvangen' },
    { id: 'DOC-03', name: 'Hypotheekjaaroverzicht', category: 'Hypotheek', received: '09 dec 2026', status: 'ontvangen' },
    { id: 'DOC-04', name: 'Inventarisatieformulier', category: 'Inventarisatie', received: '10 dec 2026', status: 'ontvangen' }
  ],
  advey: { status: 'pending' },
  completion: { saved: false, sent: false, taskClosed: false }
};

/**
 * Wissel uitsluitend fictieve namen en adressen van demonstratieklanten.
 * Eén getrokken dossier blijft gedurende de sessie stabiel.
 * Dit is alleen browserdemodata: geen CRM-, opslag- of API-verbinding.
 */
const VOORBEELD_KLANTEN = Object.freeze([
  'Milan & Lotte de Graaf',
  'Daan & Femke Vermeer',
  'Jasper & Eva Smit',
  'Thijs & Sanne Bakker',
  'Niels & Roos Janssen',
  'Bram & Noor van Dijk',
  'Tom & Sophie van Leeuwen',
  'Mees & Iris Visser',
  'Sven & Julia van Beek',
  'Luuk & Merel de Jong',
  'Finn & Tess Kuipers',
  'Koen & Emma Bos'
]);
const VOORBEELD_STRATEN = Object.freeze([
  'Demosingel', 'Voorbeeldstraat', 'Proeflaan', 'Fictiekade',
  'Conceptweg', 'Testsingel', 'Simulatielaan', 'Demostraat'
]);
function willekeurig(max) {
  return Math.floor(Math.random() * max);
}
export function createDemoSeed(vorigeKlantNaam = '') {
  const kopie = structuredClone(demoSeed);
  const kandidaten = VOORBEELD_KLANTEN.filter(naam => naam !== vorigeKlantNaam);
  kopie.customer.displayName = kandidaten[willekeurig(kandidaten.length)];
  const straat = VOORBEELD_STRATEN[willekeurig(VOORBEELD_STRATEN.length)];
  const huisnummer = 3 + willekeurig(97);
  const adres = straat + ' ' + huisnummer;
  const adresVeld = kopie.sections.find(sectie => sectie.id === 'persoonlijk')
    ?.fields.find(veld => veld.id === 'address');
  if (adresVeld) {
    adresVeld.current = adres;
    adresVeld.proposed = adres;
  }
  return kopie;
}
