'use strict';
const fs =require('fs');

async function Reader() {
  const ofDocRaw = fs.readFileSync(process.argv[2]);
  const ourDocRaw = fs.readFileSync(process.argv[3]);
  const ofDoc = JSON.parse(ofDocRaw);
  const ourDoc = JSON.parse(ourDocRaw);

  const regex = / /gi;
  const notFound = [];
  // console.log('ONFIDO document has ' + ofDoc.length + ' entries');
  // console.log('OUR document has ' + ourDoc.length + ' entries');

  for (const ofEntry of ofDoc) {
    const arr = [];

    // console.log(ofEntry['country_name'] + ':');
    const docs = ofEntry['doc_types_list'].split(',');
    for (let doc of docs) {
      if (doc.includes('and')) {
        const splitDoc = doc.split('and');
        for (const x of splitDoc) {
          const z = x.trim().toLowerCase();
          if (z.endsWith('**')) {
            continue;
          }
          if (z.length > 0) {
            arr.push(z.replace(regex, '_'));
          }
        }
      } else {
        doc = doc.trim().toLowerCase();
        if (doc.endsWith('**')) {
          continue;
        }
        if (doc.length > 0) {
          arr.push(doc.replace(regex, '_'));
        }
      }
    }

    let found = false;
    for (const ourEntry of ourDoc) {
      if (ourEntry['name'] === ofEntry['country_name']) {
        const obj = {};
        for (let doc of arr) {
          let back = false;
          if (doc.endsWith('*')) {
            doc = doc.replace('*', '');
            back = true;
          }
          if (doc.includes('_(')) {
            doc = doc.split('(')[1].replace(')', '');
          }

          obj[doc] = back;
        }

        ourEntry['accepted'] = [obj];
        console.log(JSON.stringify(ourEntry) + ',');
        found = true;
        break;
      }
    }

    if (!found) {
      notFound.push(ofEntry);
    }
  }

  if (notFound.length > 0) {
    console.log('NOT FOUND ENTRIES: ');
    console.log('');
  }

  for (const entry of notFound) {
    console.log(JSON.stringify(entry) + ' has not been found in our table!');
  }
}

if (process.argv.length < 4) {
  console.log(`Usage: ${process.argv[0]} ${process.argv[1]} ONFIDO_document.json OUR_document.json`);
  return;
}

Reader();
