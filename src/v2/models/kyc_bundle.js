const mongoose = require('mongoose');

const kyc_bundle_schema=new mongoose.Schema(
{email: {type: String, required: true, index: true, unique: true},
 archive_location: {type: String},
 date_updated: {type: Date, required: true}
}
                                    );

module.exports=mongoose.model('kyc_bundle', kyc_bundle_schema,
                              // suppress mongo from adding an "s" suffix!
                              'kyc_bundle'
                             );
