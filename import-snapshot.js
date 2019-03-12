'use strict';
require('dotenv').config();
const csv = require('fast-csv');
const mongoose = require('mongoose');

mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`, {useNewUrlParser: true});

const snapshotSchema = new mongoose.Schema({
  account_name: {type: String, required: true, unique: true},
  owner_key: {type: String, required: true},
  active_key: {type: String, required: true},
  total_nostake: {type: Number},
  staked: {type: Number},
  delegated: {type: Number},
  total: {type: Number, required: true},
  created_at: Date,
  updated_at: Date,
});

const Account = mongoose.model('Snapshot', snapshotSchema);

csv.fromPath(`${process.env.CSV_NAME}`)
    .on('data', (data) => {
      console.log(new Date().getTime()); // eslint-disable-line no-console
      const recordToInsert = new Account({
        account_name: data[1],
        owner_key: data[2],
        active_key: data[3],
        total_nostake: parseFloat(data[4]) || 0,
        staked: parseFloat(data[5]) || 0,
        delegated: parseFloat(data[6]) || 0,
        total: parseFloat(data[7]) || 0,
      });
      recordToInsert.save((err) => {
        if (err) console.log(err); // eslint-disable-line no-console
      });
    })
    .on('end', () => console.log(`Done`)); // eslint-disable-line no-console

