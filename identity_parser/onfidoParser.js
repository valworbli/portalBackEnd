'use strict';
const fs =require('fs');

async function Reader() {
  let ofDocRaw = fs.readFileSync(process.argv[2]);
  let ourDocRaw = fs.readFileSync(process.argv[3]);
  let ofDoc = JSON.parse(ofDocRaw);
  let ourDoc = JSON.parse(ourDocRaw);

  var regex = / /gi;
  var notFound = [];
  // console.log('ONFIDO document has ' + ofDoc.length + ' entries');
  // console.log('OUR document has ' + ourDoc.length + ' entries');

  for (let ofEntry of ofDoc) {
    var arr = [];

    // console.log(ofEntry['country_name'] + ':');
    var docs = ofEntry['doc_types_list'].split(',');
    for (let doc of docs) {
      if (doc.includes('and')) {
        var splitDoc = doc.split('and');
        for (let x of splitDoc) {
          var z = x.trim().toLowerCase();
          if (z.endsWith('**'))
            continue;
          if (z.length > 0) {
            arr.push(z.replace(regex, '_'));
          }
        }
      } else {
        doc = doc.trim().toLowerCase();
        if (doc.endsWith('**'))
          continue;
        if (doc.length > 0)
          arr.push(doc.replace(regex, '_'));
      }
    }

    var found = false;
    for (let ourEntry of ourDoc) {
      if (ourEntry['name'] === ofEntry['country_name']) {
        var obj = {};
        for(let doc of arr) {
          var back = false;
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

  for (let entry of notFound) {
    console.log(JSON.stringify(entry) + ' has not been found in our table!');
  }
}

if (process.argv.length < 4) {
  console.log(`Usage: ${process.argv[0]} ${process.argv[1]} ONFIDO_document.json OUR_document.json`);
  return;
}

Reader();
