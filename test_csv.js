const testCases = [
    '"Hering;Hering;09.360.947/0003-40;;;55 93991211298;;;;Isabela Leal;"',
    'Hering;Hering;09.360.947/0003-40;;;55 93991211298;;;;Isabela Leal;',
    'Empresa "Teste";Outro;;;'
];

testCases.forEach(line => {
    const delimiter = line.includes(';') ? ';' : ',';
    let cols;
    try {
        const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        cols = line.split(regex).map(col => col.replace(/^"(.*)"$/, '$1').trim());
    } catch (e) {
        console.error("Regex error:", e);
        cols = [];
    }

    // Fallback
    if (cols.length === 1) {
        if (cols[0].includes(';')) {
            cols = cols[0].split(';').map(col => col.trim());
        } else if (cols[0].includes(',')) {
            cols = cols[0].split(',').map(col => col.trim());
        }
    }

    console.log("Input:", line);
    console.log("Cols length:", cols.length);
    console.log("Cols:", cols);
    console.log("---");
});
