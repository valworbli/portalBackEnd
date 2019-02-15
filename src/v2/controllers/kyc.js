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
{var email=null,
     onfido_id=null,
     country_code=null,
     bad_file_previously_encountered=false;

console.error ('POST_IMAGE');//??

 function post_fail (status, message, user_message)
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
 } // function post_fail (status, message, user_message)

 function filename(filePath)
 {let basename=path.basename(filePath);
  let lastDot=basename.lastIndexOf('.');
  if (lastDot>=0)
     return basename.substring(0, lastDot);

  return basename;
 } // function filename(filePath)

 function metaType(multer_file_object)
 // filename: type-side_timestamp
 {let filename_parts=filename(multer_file_object.path).split('-');

  if (filename_parts.length!==2)
     return '';

  return filename_parts[0];
 } // function metaType(multer_file_object)

 function metaSide(multer_file_object)
 // filename: type-side_timestamp
 {let filename_parts=filename(multer_file_object.path).split('-');

  if (filename_parts.length!==2)
     return '';

  filename_parts=filename_parts[1].split('_');
  if (filename_parts.length!==2)
     return '';

  return filename_parts[0];
 } // function metaSide(multer_file_object)

 function metaCreated(multer_file_object)
 // filename: type-side_timestamp
 {let filename_parts=filename(multer_file_object.path).split('_');

  if (filename_parts.length!==2)
     return null;

  let created=new Date(Number(filename_parts[1]));
  return isNaN(created)?null:created;
 } // function metaCreated(multer_file_object)

 function fileFilter (req, file, multer_next)
 {var index, type, side;

  if (bad_file_previously_encountered)
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
      bad_file_previously_encountered=true;
      return multer_next(message);
     }

  let type_side=file.fieldname.toLowerCase(),
      dash=type_side.indexOf('-');

  if (dash>=0)
     {type=type_side.substring(0, dash);
      side=type_side.substring(dash+1);
     }

  else {type=type_side;
        side='front';
       } // dash<0

  if (!id.TYPES.includes(type))
     {let message=`bad image type: ${type}`;
      bad_file_previously_encountered=true;
      return multer_next (message);
     }

  if (!id.SIDES.includes(side))
     {let message=`bad side specification: ${side}`;
      bad_file_previously_encountered=true;
      return multer_next(message);
     }

  return multer_next(null, true);
 } // function fileFilter (req, file, multer_next)

 function multer_filename(req, file, multer_next)
 {let extension=path.extname(file.originalname
                            ).replace(LEADING_DOT, ''
                                     ).toLowerCase(),
      created=new Date();

console.error('MULTER_FILENAME');//?
  return multer_next(null,
                     file.fieldname.toLowerCase()+'_'+
                     // use an epoch offset filename suffix
                     // to insure that files are not overwritten...
                     created.getTime()+
                     '.'+extension
                    );
 } // function multer_filename(req, file, multer_next)

 function finishUpload(multer_err_message)
 {let date_updated=null,
      errors=[],
      files=req.files;

  if (multer_err_message!==undefined)
     {post_fail (400, multer_err_message);
      return; // finishUpload
     }

  function database_err(err)
  {console.error (err);
   throw new Error('Error accessing database...');
  }

  function show_posted_to_date ()
  {
   res.status(200)
      .json({data: true,
             message: 'TO DO: list of previously posted documents...',
             posted: []
            }
           );
  } // function show_posted_to_date ()

  function upsert_kyc_files(kyc_bundle_result)
  {let kyc_bundle_id=kyc_bundle_result._id,
       updateOnes=[];

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
            .then ((bulk_result) => {show_posted_to_date ();
                                    } // (result) =>
                  ) // then
            .catch (database_err);
  } // function upsert_kyc_files(kyc_bundle_result)

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
              {post_fail (400,
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
     {post_fail (400, errors.join('\n'));
      return; // finishUpload
     }

  if (files.length===0)
     {show_posted_to_date ();
      return;
     }

  // We could have done the model updating earlier,
  // but I would rather see all that validation successfully accomplished
  // before having a side effect on it...
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
            .then (upsert_kyc_files)
            .catch (database_err);
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
                                 multer_filename,
                                 req, res,
                                 finishUpload
                                );
                   return; // getUserInfo
                  } // if (country_code in countries.backSide)

               post_fail (400, `bad country code: ${country_code}`);
               return; // getUserInfo
              } // if ((typeof onfido_id)==='string'&&onfido_id.length>0)
          } // if (err!==null)
  post_fail (400,
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
  post_fail (400, 'Bad request...');
 } // function getEmail(jwt_data)

 try {const bearer=req.headers.authorization.split(' ');
      const token=bearer[1];

      jwt.jwtDecode(token)
         .then(getEmail)
         .catch((err) => {post_fail (400, err.message);
                         }
               );
     }
 catch (err)
       {post_fail (400, 'kyc post image');
       }
} // function postImages(req, res)

module.exports={postApplicant,
                getApplicant,
                getCheck,
                postWebhook,
                getStatus,
                postImages
               };
