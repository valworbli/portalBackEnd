const jwt = require('../components/jwt.js');
const fetch = require('../components/fetch.js');
const onfido = require('../components/onfido.js');
const mail = require('../components/email.js');
const userModel = require('../models/user.js');
const logger = require('../components/logger')(module);
const onfidoWebhookModel = require('../models/onfidoWebhook.js');

const upload=require('../components/multer');
const countries=require('./countries');

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
 * Post Image
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postImage(req, res)
{var onfido_id=null,
     country_code=null;

 function startUpload(folder)
 {
  return new Promise((resolve,
                      reject
                     ) => {

                           function finishUpload(err)
//??                           function finishUpload(err, some)
                           // an online example had "some" as an additional argument;
                           // but this argument was not documented anywhere.
                           // TO DO: log what this argument contains...
                           {
console.error('FINISH_UPLOAD');//??
                            if (err)
                               {reject (err);
                                return; // finishUpload
                               }

                            let lastCreated=null,
                                errors=[];
                            // get the last created from all the files uploaded...
                            //
                            // TO DO:
                            //
                            // 1) check for duplicate images
                            //    (using file.buffer?)
                            //
                            // 2) check for excess brightness
                            //
                            // 3) future version: check for glare
                            //
                            for (var index=0; index<req.files.length; index++)
                                {let file=req.files[index];

                                 if (index===0)
                                    lastCreated=file.created;

                                 else if (file.created>lastCreated)
                                         lastCreated=file.created;

                                 // check for duplicate fieldnames
                                 // (duplicate "name" html attribute
                                 //  on the input tags...)
                                 for (var subindex=index+1;
                                      subindex<files.length;
                                      subindex++
                                     )
                                     if (files[index].type===files[subindex].type&&
                                         files[index].side===files[subindex].side
                                        )
                                        {
let message=`Duplicate type+side: ${files[index].type}-${files[index].side}`;
                                         console.error (message);
                                         reject (res.status(400).json({data: false,
                                                                       message: message
                                                                      }
                                                                     )
                                                );
                                         return; // finishUpload
                                        }
if (!(files[index].type in countries[country_code].backSide))
   errors.push (`type ${files[index].type} not found for country ${country_code}`);

else if (files[index].side==='back'&&
         !countries[country_code].backSide[files[index].type]
        )
        errors.push (
`attempt to submit a backside for type ${files[index].type}, country ${country_code}`
                    );
                                } // for (var index=0; index<req.files.length; index++)

                            if (errors.length>0)
                               {for (var error=0; error<errors.length; error++)
                                    console.error (errors[error]);

                                reject (res.status(400).json({data: false,
                                                              message: errors.join('\n')
                                                             }
                                                            )
                                       );
                                return; // finishUpload
                               } // if (errors.length>0)
// TO DO:
//
// insert into kyc_bundle
//
//	email, date_updated=lastCreated
//
                            for (var index=0;
                                 index<req.files;
                                 index<req.files.length
                                )
                                {let file=req.files[index];
// TO DO:
//
// insert into kyc_files
//
//	kyc_bundle_id=id(kyc_bundle),
//	type=file.type,
//	side=file.side,
//	date_created=file.created,
//	path=file.path
                                } // for (var index=0; index<req.files.length; index++)

                            resolve (res.status(200).json({data: true,
                                                           message: 'TBD' // TO DO...
                                                          }
                                                         )
                                    );
                           } // function finishUpload(err, some)

                           resolve (upload.start(folder,
                                                 req, res,
                                                 finishUpload
                                                )
                                   );
                          } // (resolve, reject) =>
                    ); // new Promise
 } // function startUpload()

 try {const bearer=req.headers.authorization.split(' ');
      const token=bearer[1];

      jwt.jwtDecode(token)
         .then((data) => {if (data!==null&&
                              (typeof data)==='object'&&
                              'email' in data
                             )
                             {let email=data.email;
                              if ((typeof email)==='string'&&
                                  email.length>0
                                 )
                                 {userModel.findOne({email},
                                                    (err, user) => {
if (!err &&
    user!==null&&
    (typeof user)==='object'&&
    'onfido_id' in user
   )
   {onfido_id=user.onfido_id;

    if ((typeof onfido_id)==='string'&&
        onfido_id.length>0
       )
       {country_code=user.address_country.toUpperCase();
        if (country_code in countries.backSide)
           return startUpload(process.env.IMAGE_STAGING_FOLDER+'/'+onfido_id);

        let message=`bad country code: ${country_code}`;
        console.error (message);
        res.status(400).json({data: false,
                              error: message
                             }
                            );
        return;
       }
   } // if (!err &&...
console.error (`user ${email} not found`);
res.status(400).json({data: false,
                      error: 'user not found'
                     }
                    );
                                                                   } // (err, user) =>
                                                   ); // userModel.findOne
                                 } // if ((typeof email)==='string'&&...
                             } // if (data!==null&&...
                         } // (data) =>
              ) // then
         .catch((err) => {res.status(400).json({data: false,
                                                error: err.message
                                               }
                                              );
                         }
               );
     }
 catch (err)
       {res.status(400).json({data: false,
                              error: 'kyc post image'
                             }
                            );
       }
} // function postImage(req, res)

module.exports = {
  postApplicant,
  getApplicant,
  getCheck,
  postWebhook,
  getStatus,
  postImage
};
