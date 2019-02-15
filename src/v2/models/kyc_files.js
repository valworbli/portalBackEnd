const mongoose=require('mongoose');

const kyc_files_schema=new mongoose.Schema(
{kyc_bundle_id: {type: mongoose.Schema.ObjectId,
                 index: true
                },
 type: {type: String, required: true},
 side: {type: String, required: true},
 onfido_document_id: {type: String},
 date_created: {type: Date, required: true},
 path: {type: String}
} // kyc_files
                                   );

kyc_files_schema.index({kyc_bundle_id: 2, type: 2, side:2}, {unique: true})

module.exports=mongoose.model('kyc_files', kyc_files_schema);
