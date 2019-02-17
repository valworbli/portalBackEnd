const jwt = require('../components/jwt.js');
const fetch = require('../components/fetch.js');
const onfido = require('../components/onfido.js');
const mail = require('../components/email.js');
const userModel = require('../models/user.js');
const logger = require('../components/logger')(module);
const onfidoWebhookModel = require('../models/onfidoWebhook.js');

const path=require('path');
const multer=require('../components/multer');
const countries=require('../models/countries');
const id=require('../models/id');
const kyc_bundle=require('../models/kyc_bundle');
const kyc_files=require('../models/kyc_files');
const filecompare=require('filecompare');

const LEADING_DOT=/^\./;

/**
 * Set Applicant
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postApplicant(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((data) => {
          const applicantId = data.onfido_id;
          const referrer = '*://*/*';
          const sdkToken = {
            url: 'https://api.onfido.com/v2/sdk_token',
            method: 'POST',
            headers: {
              'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`,
            },
            body: {
              applicant_id: applicantId,
              referrer,
            },
          };
          return fetch.fetchData(sdkToken);
        })
        .then((jwt) => {
          res.status(200).json({data: true, kyc_token: jwt.token});
        })
        .catch((err) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'kyc post applicant';
    res.status(400).json({data: false, error});
  }
}

/**
 * Get Applicant
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getApplicant(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    let email;
    jwt.jwtDecode(token)
        .then((data) => {
          email = data.email;
          return onfido.createApplicant();
        })
        .then((data) => {
          const onfidoId = data;
          const onfidoStatus = 'started';
          const newData = {
            onfido_status: onfidoStatus,
            onfido_id: onfidoId,
          };
          const query = {email};
          userModel.findOneAndUpdate(query, newData, {upsert: true},
              (err, doc) => {
                if (!err) {
                  const email = doc.email;
                  const onfidoStatus = doc.onfido_status;
                  const newjwt = jwt.jwtSign({
                    email,
                    onfido_status: onfidoStatus,
                    onfidoId,
                  });
                  res.status(200).json(
                      {data: true, token: newjwt, onfido_status: 'started'});
                } else {
                  res.status(400).json({data: false});
                }
              });
        })
        .catch((err) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'kyc get applicant';
    res.status(400).json({data: false, error});
  }
}

/**
 * Check
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getCheck(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    let email;
    let onfidoId;
    jwt.jwtDecode(token)
        .then((data) => {
          if (data.onfido_status === 'started') {
            email = data.email;
            onfidoId = data.onfido_id;
            const async = true;
            const type = 'express';
            const reports = [
              {name: 'document'},
              {name: 'facial_similarity'},
              {name: 'watchlist', variant: 'full'},
            ];
            const sdkToken = {
              url: `https://api.onfido.com/v2/applicants/${onfidoId}/checks`,
              method: 'POST',
              headers:
                {'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'},
              body: {type, reports, async},
            };
            logger.info(`submitting KYC check for ${email}`);
            return fetch.fetchData(sdkToken);
          }
        })
        .then((data) => {
          const onfidoStatus = 'review';
          const newjwt = jwt.jwtSign({
            email,
            onfido_status: onfidoStatus,
            onfido_id: onfidoId,
          });
          const newData = {onfido_status: onfidoStatus};
          const query = {email};
          logger.info(`setting ${email} to status review`);
          userModel.findOneAndUpdate(query, newData, {upsert: true, new: true},
              (err, doc) => {
                logger.debug(doc);
                if (!err) {
                  res.status(200).json({
                    data: true,
                    token: newjwt,
                    onfido_status: onfidoStatus});
                } else {
                  logger.error(`error setting ${email} to review: ${err}`);
                  res.status(400).json({data: false});
                }
              });
        })
        .catch((err) => {
          logger.error(`error subbmitting check for ${email}: ${err}`);
          res.status(400).json({data: false});
        });
  } catch (err) {
    logger.error(`getCheck: ${err}`);
    res.status(400).json({data: false});
  }
}

/**
 * Webhook
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.payload.resource_type - The resource type.
 * @property {string} req.body.payload.action - The resource type.
 * @property {string} req.body.payload.object.id - The resource type.
 * @property {string} req.body.payload.object.status - The resource type.
 * @property {string} req.body.payload.object.completed_at - The resource type.
 * @property {string} req.body.payload.object.href - The resource type.
 */
function postWebhook(req, res) {
  try {
    const resourceType = req.body.payload.resource_type;
    const action = req.body.payload.action;
    const onfidoId = req.body.payload.object.id;
    const status = req.body.payload.object.status;
    const completedAt = req.body.payload.object.completed_at;
    const href = req.body.payload.object.href;
    onfidoWebhookModel({
      resource_type: resourceType,
      action,
      onfido_id: onfidoId,
      status,
      completed_at: completedAt,
      href}).save((err, data) => {
      if (!err && data) {
        res.status(200).json({status: 200});
      } else {
        res.status(400).json({status: 400});
      }
    });
  } catch (err) {
    const error = 'kyc post webhook';
    res.status(400).json({data: false, error});
  }
}

/**
 * Status
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getStatus(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    let email;
    let onfidoId;
    jwt.jwtDecode(token)
        .then((data) => {
          email = data.email;
          onfidoId = data.onfido_id;
          if (data.onfido_status === 'review') {
            const sdkToken = {
              url: `https://api.onfido.com/v2/applicants/${onfidoId}/checks`,
              method: 'GET',
              headers: {
                'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`,
              },
            };
            return fetch.fetchData(sdkToken);
          }
        })
        .then((data) => {
          if (data) {
            const parse = JSON.parse(data);
            if (parse &&
              parse.checks[0] &&
              parse.checks[0].status === 'complete'
              && parse.checks[0].result === 'clear') {
              const onfidoStatus = 'approved';
              const newjwt = jwt.jwtSign({
                email,
                onfido_status: onfidoStatus,
                onfido_id: onfidoId,
              });
              const newData = {onfido_status: onfidoStatus};
              const query = {email};
              userModel.findOneAndUpdate(query, newData, {upsert: true},
                  (err, doc) => {
                    if (!err) {
                      res.status(200).json({
                        data: true,
                        token: newjwt,
                        onfido_status: onfidoStatus,
                        action: 'redirect',
                      });
                    }
                  });
            } else if (parse && parse.checks[0] &&
              parse.checks[0].status === 'complete' &&
              parse.checks[0].result !== 'clear') {
              userModel.find({email}, (err, data) => {
                if (!err && data && data[0] && data[0].name_first) {
                  const firstName = data[0].name_first;
                  const status = data[0].onfido_status;
                  if (status !== 'rejected') {
                    const onfidoStatus = 'rejected';
                    const newData = {onfido_status: onfidoStatus};
                    const query = {email};
                    userModel.findOneAndUpdate(query, newData, {upsert: true},
                        (err, doc) => {
                          if (!err) {
                            res.status(200).json({
                              status: 200,
                              data: true,
                              action: 'support',
                            });
                            mail.sendEmail(email, '', 'kycfail', firstName);
                          }
                        });
                  } else {
                    res.status(200).json({
                      status: 200,
                      data: true,
                      action: 'support',
                    });
                  }
                }
              });
            } else {
              res.status(400).json({status: 400, data: false});
            }
          } else {
            res.status(200).json({status: 200, data: true, action: 'support'});
          }
        });
  } catch (err) {
    const error = 'get status failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Post Images
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postImages(req, res)
{const USER_PROPS=['name_first',
                   'name_last',
                   'address_building_name',
                   'address_building_number',
                   'address_flat_number',
                   'address_one',
                   'address_state',
                   'address_town',
                   'address_two',
                   'address_zip',
                   'date_birth',
                   'gender',
                   'phone_code',
                   'phone_mobile'
                 ], // USER_PROPS
     NAME_ATTRIBUTE_DELIMITER={// used as an (optional) suffix
                               // to document id types...
                               ID_SIDE: '-',

                               // used for a timestamp suffix to filenames...
                               TIMESTAMP: ':'
                              },
     MALFORMED=null;

 var email=null,
     onfido_id=null,
     country_code=null,
     badFilePreviouslyEncountered=false,
     postUser={};

console.error ('POST_IMAGE');//??

 function postFail (status, message, user_message)
 // if user_message is omitted, message is used...
 {
  console.error (message);
  res.status(status).json({data: false,
                           error: ((user_message===undefined)
                                   ?message
                                   :user_message
                                  )
                          }
                         );
 } // function postFail (status, message, user_message)

 function filename(filePath)
 {let basename=path.basename(filePath),
      lastDot=basename.lastIndexOf('.');

  if (lastDot>=0)
     return basename.substring(0, lastDot);

  return basename;
 } // function filename(filePath)

 function nameType(attribute)
 // filename: type{type_delimiter}side{timestamp_delimiter}timestamp
 {let nameParts=attribute.split(NAME_ATTRIBUTE_DELIMITER.TIMESTAMP);

  if (nameParts.length>2) // timestamp suffix can be elective (length=1...)
     return MALFORMED; // nameType

  nameParts=nameParts[0].split(NAME_ATTRIBUTE_DELIMITER.ID_SIDE); // before the (possible) colon...

  if (nameParts.length>2) // side suffix can be elective (length=1...)
     return MALFORMED; // nameType

  return nameParts[0]; // before the id type delimiter...
 } // function nameType(attribute)

 function metaType(pathObject)
 {return nameType(filename(pathObject.path));
 }

 function nameSide(attribute)
 // filename: type{type_delimiter}side{timestamp_delimiter}timestamp
 {let nameParts=attribute.split(NAME_ATTRIBUTE_DELIMITER.TIMESTAMP);

  if (nameParts.length>2) // timestamp suffix can be elective (length=1...)
     return MALFORMED; // nameSide

  nameParts=nameParts[0].split(NAME_ATTRIBUTE_DELIMITER.ID_SIDE);

  if (nameParts.length>2) // side suffix can be elective (length=1...)
     return MALFORMED; // nameSide

  if (nameParts.length===1) // no type delimiter, i.e., no side suffix...
     return 'front'; // nameSide

  return nameParts[1]; // after the type delimiter...
 } // function nameSide(attribute)

 function metaSide(pathObject)
 // filename: type{type_delimiter}side{timestamp_delimiter}timestamp
 {return nameSide(filename(pathObject.path));
 }

 function nameTypeSide(attribute)
 // Note that the side suffix might not be furnished...
 {let type=nameType(attribute),
      side=nameSide(attribute);

  if (type===MALFORMED||side===MALFORMED)
     return MALFORMED;

  return type+NAME_ATTRIBUTE_DELIMITER.ID_SIDE+side;
 } // function nameTypeSide(attribute)

 // In this function we can always count on the side suffix being furnished...
 function metaTypeSide(pathObject)
 // filename: type{type_delimiter}side{timestamp_delimiter}timestamp
 {let name=filename(pathObject.path),
      nameParts=name.split(NAME_ATTRIBUTE_DELIMITER.TIMESTAMP);

  if (nameParts.length>2) // timestamp suffix can be elective (length=1...)
     return MALFORMED; // metaType

  return nameParts[0]; // before the (possible) timestamp delimiter...
 } // function metaTypeSide(pathObject)

 function metaCreated(pathObject)
 // filename: type{type_delimiter}side{timestamp_delimiter}timestamp
 {let name=filename(pathObject.path),
      nameParts=name.split(NAME_ATTRIBUTE_DELIMITER.TIMESTAMP);

  if (nameParts.length!==2)
     return MALFORMED; // metaCreated

  let created=new Date(Number(nameParts[1])); // after the timestamp delimiter...
  return isNaN(created)?MALFORMED:created;
 } // function metaCreated(pathObject)

 function fileFilter (req, file, multer_next)
 {var index, type, side;

  if (badFilePreviouslyEncountered)
     return multer_next('bad file previously encountered...');

  let extension=path.extname(file.originalname
                            ).replace(LEADING_DOT, ''
                                     ).toLowerCase(),
      // using eval would normally be a dangerous thing to do,
      // but the string is from the same source as the code...
      images=eval(process.env.ALLOWABLE_IMAGES); // MUST be defined...

  for (index=0; index<images.length; index++)
      if (images[index].toLowerCase()===extension)
         break;

  if (index>=images.length)
     {let message=`Image extension not allowed: ${extension}`;
      badFilePreviouslyEncountered=true;
      return multer_next(message);
     }

  let type_side=file.fieldname.toLowerCase(),
      sideDelimiter=type_side.indexOf(NAME_ATTRIBUTE_DELIMITER.ID_SIDE);

  if (sideDelimiter>=0)
     {type=type_side.substring(0, sideDelimiter);
      side=type_side.substring(sideDelimiter+1);
     }

  else {type=type_side;
        side='front';
       } // sideDelimiter<0

  if (!id.TYPES.includes(type))
     {let message=`bad image type: ${type}`;
      badFilePreviouslyEncountered=true;
      return multer_next (message);
     }

  if (!id.SIDES.includes(side))
     {let message=`bad side specification: ${side}`;
      badFilePreviouslyEncountered=true;
      return multer_next(message);
     }

  return multer_next(null, true);
 } // function fileFilter (req, file, multer_next)

 function multerFilename(req, file, multer_next)
 {let extension=path.extname(file.originalname
                            ).replace(LEADING_DOT, ''
                                     ).toLowerCase(),
      created=new Date();

  return multer_next(null,
                     nameTypeSide(file.fieldname)+
                     NAME_ATTRIBUTE_DELIMITER.TIMESTAMP+
                     // use an epoch offset filename suffix
                     // to insure that files are not overwritten...
                     created.getTime()+
                     '.'+extension
                    );
 } // function multerFilename(req, file, multer_next)

 function finishUpload(multerErr)
 {var postedFilesIndex,
      postedFilesSubindex; // used for recursive scope...
  let date_updated=null,
      errors=[],
      files=req.files,
      kyc_bundle_id=null;

console.error ('FINISH_UPLOAD');//??
console.error ('#files='+files.length);

  if (multerErr!==undefined)
     {postFail (400,
                ((typeof multerErr==='string')
                 ?multerErr
                 :multerErr.message
                )
               );
      return; // finishUpload
     }

  function databaseErr (err)
  {postFail (400, err, 'Error accessing database...');
  }

  function showPostedToDate ()
  {
   function getPostedResults (results)
   {let posted=[];

    for (var index=0; index<results.length; index++)
        {let kyc_file=results[index];
         posted.push (kyc_file.type+
                      NAME_ATTRIBUTE_DELIMITER.ID_SIDE+
                      kyc_file.side
                     );
        } // for (var index=0; index<results.length; index++)

    res.status(200)
       .json({data: true,
              message: 'documents submitted to date...',
              posted: posted
             }
            );
   } // getPostedResults

   function getPostedFiles ()
   {kyc_files.find({kyc_bundle_id})
             .then(getPostedResults)
             .catch (databaseErr);
   }

   function getPostedBundleId (result)
   {kyc_bundle_id=result._id;
    getPostedFiles ();
   }

   if (kyc_bundle_id===null)
      kyc_bundle.findOne({email})
                .then(getPostedBundleId)
                .catch (databaseErr);

   // we already have kyc_bundle_id from an earlier step
   // (an optimization; no need to query the database twice...)
   else getPostedFiles ();
  } // function showPostedToDate

  function upsert_kyc_files(kyc_bundle_result)
  {let updateOnes=[];

   kyc_bundle_id=kyc_bundle_result._id;
   for (var index=0; index<files.length; index++)
       {let file=files[index],
            doc_type=metaType(files[index]),
            doc_side=metaSide(files[index]),
            date_created=metaCreated(files[index]);

        updateOnes.push ({updateOne: {filter: {kyc_bundle_id: kyc_bundle_id,
                                               type: doc_type,
                                               side: doc_side
                                              }, // filter
                                      update: {$set: {kyc_bundle_id: kyc_bundle_id,
                                                      type: doc_type,
                                                      side: doc_side,
                                                      date_created: date_created,
                                                      path: file.path
                                                     } // $set
                                              }, // update
                                      upsert: true
                                     } // updateOne
                         }
                        ); // updateOnes.push
       } // for (var index=0; index<files.length; index++)
   kyc_files.bulkWrite(updateOnes,
                       {ordered : false} // faster...
                      )
            .then((bulk_result) => {showPostedToDate ();
                                   }
                 )
            .catch(databaseErr);
  } // function upsert_kyc_files(kyc_bundle_result)

  function upsert_kyc_bundle ()
  {
   kyc_bundle.findOneAndUpdate({email: email}, 
                               {$set: {email: email,
                                       date_updated: date_updated
                                      }
                               }, // $set
                               {upsert: true,
                                new: true,
                                runValidators: true
                               }
                              )
             .then(upsert_kyc_files)
             .catch(databaseErr);
  } // function upsert_kyc_bundle

  function checkPriorFiles ()
  {
   function checkPriorFilesResults (kyc_files_results)
   {var priorFilesIndex=(-1); // it gets incremented to zero the first time in...

    function comparePostedFilesWithPrior (isEqual) // recursive...
    {
     if (isEqual)
        {postFail (400,
`duplicate image; already submitted as: ${metaTypeSide(kyc_files_results[priorFilesIndex])}`
                  );
         return; // comparePostedFilesWithPrior
        } // if (isEqual)

     priorFilesIndex++;
     if (priorFilesIndex>=kyc_files_results.length)
        {postedFilesIndex++; priorFilesIndex=0;
        }

     if (postedFilesIndex>=files.length) // done...
        {upsert_kyc_bundle ();
         return; // comparePostedFilesWithPrior
        }

     if (metaTypeSide(files[postedFilesIndex])===
         metaTypeSide(kyc_files_results[priorFilesIndex])
        )
        // skip it, it's OK for an identical image to be resubmitted
        // (by saying it's not equal, we get it to proceed to the next...)
        comparePostedFilesWithPrior (false); // recurse...

     else filecompare (files[postedFilesIndex].path,
                       kyc_files_results[priorFilesIndex].path,
                       comparePostedFilesWithPrior // recurse...
                      );
    } // function comparePostedFilesWithPrior (isEqual)

    if (kyc_files_results.length===0)
       {upsert_kyc_bundle (); // go on to adding the kyc_files...
        return; // checkPriorFilesResults
       }

    postedFilesIndex=0; // reset for comparePostedFilesWithPrior...
    comparePostedFilesWithPrior (false); // kick off the recursive check...
   } // function checkPriorFilesResults (kyc_files_results)

   function get_kyc_bundle_id (result)
   {
    if (result===null) // no prior entries; skip checking for identicals...
       {upsert_kyc_bundle ();
        return;
       }

    kyc_bundle_id=result._id;
    kyc_files.find({kyc_bundle_id: kyc_bundle_id})
             .then(checkPriorFilesResults)
             .catch(databaseErr);
   } //  function get_kyc_bundle_id (result)

   kyc_bundle.findOne({email})
             .then(get_kyc_bundle_id)
             .catch (databaseErr);
  } // function checkPriorFiles

  function comparePostedFiles (isEqual) // recursive...
  // look for identical images among what was just posted...
  {
   if (isEqual===undefined) // first time...
      if (files.length===0)
         {showPostedToDate (); // done...
          return; // comparePostedFiles
         }

      else {postedFilesIndex=0;
            postedFilesSubindex=postedFilesIndex+1;
           } // files.length!==0

   else if (isEqual)
           {postFail (400,
`duplicate files: ${metaTypeSide(files[postedFilesIndex])}, ${metaTypeSide(files[postedFilesSubindex])}`
                     );
            return; // comparePostedFiles
           }

   if (postedFilesSubindex>=files.length)
      {postedFilesIndex++;
       if (postedFilesIndex>=files.length-1) // done...
          {checkPriorFiles ();
           return; // comparePostedFiles
          }

       postedFilesSubindex=postedFilesIndex+1;
      } // if (postedFilesSubindex>=files.length)

   filecompare (files[postedFilesIndex].path,
                files[postedFilesSubindex].path,
                comparePostedFiles // recurse...
               );
  } // function comparePostedFiles (isEqual)

  //
  // TO DO:
  //
  // 1) check for duplicate images among files uploaded
  //
  // 2) check for duplicate images among any files PREVIOUSLY uploaded
  //
  // 3) check for excess brightness
  //
  // 4) future version: check for glare
  //
  // get the last created from all the files uploaded...
  for (var index=0; index<files.length; index++)
      {let doc_type=metaType(files[index]),
           doc_side=metaSide(files[index]),
           date_created=metaCreated(files[index]);

       if (index===0) // first one...
          date_updated=date_created;

       else if (date_created>date_updated)
               date_updated=date_created;

       // check for duplicate fieldnames
       // (duplicate "name" html attribute on the input tags...)
       for (var subindex=index+1; subindex<files.length; subindex++)
           if (doc_type===metaType(files[subindex])&&
               doc_side===metaSide(files[subindex])
              )
              {postFail (400,
                         `Duplicate type+side: ${doc_type}-${doc_side}`
                        );
               return; // finishUpload
              }

       if (!(doc_type in countries.backSide[country_code]))
          errors.push (
`type ${doc_type} not found for country ${country_code}`
                      );

       else if (doc_side==='back'&&
                !countries.backSide[country_code][doc_type]
               )
               errors.push (
`attempt to submit a back side for type ${doc_type}, country ${country_code}`
                           );
      } // for (var index=0; index<files.length; index++)

  if (errors.length>0)
     {postFail (400, errors.join('\n'));
      return; // finishUpload
     }

  // We could have done the model updating earlier,
  // but I would rather see all that validation successfully accomplished
  // before having a side effect on it...

  for (var index=0; index<USER_PROPS.length; index++)
      {let prop=USER_PROPS[index];
       if (prop in req.body)
          postUser[prop]=req.body[prop];
      }

  if (Object.keys(postUser).length===0) // no user fields posted...
     comparePostedFiles ();

  else userModel.findOneAndUpdate({email},
                                  {$set: postUser},
                                  {upsert: true}
                                 )
                .then((result) => {comparePostedFiles ();
                                  }
                     )
                .catch(databaseErr);
 } // function finishUpload(multer_err, some)

 function getUserInfo(err, user)
 {
  if (err!==null)
     console.error (err);

  else if (user!==null&&
           (typeof user)==='object'&&
           'onfido_id' in user
          )
          {onfido_id=user.onfido_id;

           if ((typeof onfido_id)==='string'&&
               onfido_id.length>0
              )
              {country_code=user.address_country.toUpperCase();
               if (country_code in countries.backSide) // i.e., a valid country...
                  {
console.error(`multer.start('${onfido_id}')`);//??
                   multer.start (onfido_id,
                                 fileFilter,
                                 multerFilename,
                                 req, res,
                                 finishUpload
                                );
                   return; // getUserInfo
                  } // if (country_code in countries.backSide)

               postFail (400, `bad country code: ${country_code}`);
               return; // getUserInfo
              } // if ((typeof onfido_id)==='string'&&onfido_id.length>0)
          } // if (err!==null)
  postFail (400,
            `user ${email} not found`,
            'User not found...'
           );
 } // function getUserInfo(err, user)

 function getEmail(jwt_data)
 {
  if (jwt_data!==null&&
      (typeof jwt_data)==='object'&&
      'email' in jwt_data
     )
     {email=jwt_data.email;
      if ((typeof email)==='string'&&
          email.length>0
         )
         {userModel.findOne({email},
                            getUserInfo
                           ); // userModel.findOne
          return; // getEmail
         } // if ((typeof email)==='string'&&...
     } // if (jwt_data!==null&&...
  postFail (400, 'Bad request...');
 } // function getEmail(jwt_data)

 try {const bearer=req.headers.authorization.split(' ');
      const token=bearer[1];

      jwt.jwtDecode(token)
         .then(getEmail)
         .catch((err) => {postFail (400, err.message);
                         }
               );
     }
 catch (err)
       {postFail (400, 'kyc post image');
       }
} // function postImages(req, res)

module.exports={postApplicant,
                getApplicant,
                getCheck,
                postWebhook,
                getStatus,
                postImages
               };
