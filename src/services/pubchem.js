// src/services/pubchem.js
//
// PubChem PUG REST lookups. All calls are best-effort: any failure returns a
// partial/empty result so the assessment can proceed offline. A fetch impl can
// be injected for testing.

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

export async function lookupPubChem(smiles, { fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  const result = {
    available: false,
    cid: null,
    iupacName: null,
    molecularWeight: null,
    ld50: null,
  };
  if (!doFetch) return result;

  try {
    const cidRes = await doFetch(`${BASE}/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`);
    const cidData = await cidRes.json();
    const cid = cidData?.IdentifierList?.CID?.[0];
    if (!cid) return result;

    result.cid = cid;
    result.available = true;

    const propRes = await doFetch(`${BASE}/compound/cid/${cid}/property/IUPACName,MolecularWeight/JSON`);
    const propData = await propRes.json();
    const props = propData?.PropertyTable?.Properties?.[0] || {};
    result.iupacName = props.IUPACName ?? null;
    result.molecularWeight = props.MolecularWeight ?? null;

    try {
      const toxRes = await doFetch(`${BASE}_view/data/compound/${cid}/JSON?heading=Toxicity`);
      const toxData = await toxRes.json();
      const section = toxData?.Record?.Section?.find((s) => s.TOCHeading === 'Toxicity');
      const ld50Info = section?.Information?.find((i) => i.Name?.includes('LD50'));
      result.ld50 = ld50Info?.Value?.StringWithMarkup?.[0]?.String ?? null;
    } catch {
      // toxicity section is optional
    }

    return result;
  } catch {
    return result;
  }
}
