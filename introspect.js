const initRDKitModule = require('@rdkit/rdkit');

async function introspectRDKit() {
    console.log("Initializing RDKit WASM module...");
    const RDKit = await initRDKitModule();

    // TNT: Ensures we generate descriptor values for C, H, N, O
    const smiles = "Cc1c(cc(cc1[N+](=O)[O-])[N+](=O)[O-])[N+](=O)[O-]";
    console.log(`Parsing test molecule: ${smiles} (TNT)`);

    const mol = RDKit.get_mol(smiles);

    if (!mol) {
        console.error("Critical failure: Could not parse SMILES.");
        return;
    }

    try {
        const descriptorsJson = mol.get_descriptors();
        const descriptors = JSON.parse(descriptorsJson);
        const keys = Object.keys(descriptors).sort();

        console.log("\n--- Full Descriptor Payload ---");
        keys.forEach(key => {
            // Print the key and its value for the TNT molecule
            console.log(`${key}: ${descriptors[key]}`);
        });

        console.log("\n--- Likely Atom Count Targets ---");
        const countKeys = keys.filter(k => 
            k.toLowerCase().includes('num') || 
            k.toLowerCase().includes('count') ||
            k.toLowerCase().includes('fr_') // RDKit often uses fr_ for fragment counts
        );
        
        countKeys.forEach(key => {
            console.log(`${key}: ${descriptors[key]}`);
        });

    } catch (e) {
        console.error("Error extracting or parsing descriptors:", e);
    } finally {
        mol.delete();
        console.log("\nMemory cleared. WASM instances destroyed.");
    }
}

introspectRDKit();
