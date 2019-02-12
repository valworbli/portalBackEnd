const multer=require('multer');
const fs=require('fs');
const path=require('path');
var sanitize=require('sanitize-filename');

const MB=1000*1000;
const LEADING_DOT=/^\./;

// TO DO: database table...
const TYPES=['passport',
             'national_identity_card',
             'driving_licence',
             'tax_id',
             'voter_id',
             'uk_biometric_residence_permit'
            ]; // TYPES

const SIDES=['front', 'back'];

/* // AMAZON S3...
const multerS3=require('multer-s3');
const aws=require('aws-sdk');

aws.config.update({
                   accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
                   secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
                   region: process.env.AWS_S3_REGION
                  }
                 );

const s3=new aws.S3();

const upload=multer({storage: multerS3({s3: s3,
                                        bucket: process.env.AWS_S3_BUCKET_IMAGES,
                                        metadata: function (req, file, callback)
                                                  {callback (null,
                                                             {fieldName: file.fieldname,
                                                              email: req.headers['email']
                                                             }
                                                            );
                                                  },
                                        key: function (req, file, callback)
                                             {let path=req.headers['email']+'/'+
                                                       file.fieldname+'_'+
                                                       Date.now().toString();

                                              callback (null, path);
                                             }
*/ // END AMAZON S3...

function pathOK(path)
{
 if (typeof path!=='string')
    return false;

 let sanitized=sanitize(path);
 return sanitized===path;
} // function pathOK(path)

function start(folder, req, res, finishUpload)
{
 if (pathOk(folder))
    {var upload=multer.diskStorage(
{limits: {files: ((process.env.MAX_UPLOAD_IMAGES===undefined)
                  ?Infinity
                  :process.env.MAX_UPLOAD_IMAGES
                 ),
          fileSize: ((process.env.MAX_UPLOAD_IMAGE_SIZE_MB===undefined)
                     ?Infinity
                     :process.env.MAX_UPLOAD_IMAGE_SIZE_MB*MB
                    )
         },

 destination: folder,

 filename: function(req, file, multer_next)
           {let extension=path.extname(file.originalname
                                      ).replace(LEADING_DOT, ''
                                               ).toLowerCase();

            if (process.env.ALLOWABLE_IMAGES.includes(extension))
               {var type, side;

                let type_side=file.fieldname.toLowerCase(),
                    dash=type_side.indexOf('-');

                if (dash>=0)
                   {type=type_side.substring(0, dash);
                    side=type_side.substring(dash+1);
                   }

                else {type=type_side;
                      side='front';
                     } // dash<0

                if (!TYPES.includes(type))
                   {let message=`bad image type: ${type}`;

                    console.error (message);
                    return multer_next (res.status(400).json({data: false,
                                                              error: message
                                                             }
                                                            ),
                                        null
                                       );
                   } // !TYPES.includes(type)

                if (!SIDES.includes(side))
                   {let message=`bad side specification: ${side}`;

                    console.error (message);
                    return multer_next (res.status(400).json({data: false,
                                                              error: message
                                                             }
                                                            ),
                                        null
                                       );
                   } // !SIDES.includes(side)

                let created=new Date(),
                    filename=type+'-'+side+'_'+
                             // use an epoch offset filename suffix
                             // to insure that files are not overwritten...
                             created.getTime()+
                             '.'+extension;

                if (pathOk(filename))
                   {// Note that we are altering multer's file object(s),
                    // to HOPEFULLY retain when it was created, etc.
                    // (in other words: to have the ancillary info
                    //  accessible to the upload completion callback
                    //  in each file object in req.files...)
                    file.created=created;
                    file.type=type;
                    file.side=side;
                    multer_next (null, filename);
                   } // if (pathOk(filename))

                else {console.error (`bad image filename: ${filename}`);
                      return multer_next (res.status(400).json({data: false,
                                                                error: 'Bad image path'
                                                               }
                                                              ),
                                          null
                                         );
                     } // !pathOk(filename)
               } // process.env.ALLOWABLE_IMAGES.includes(extension)

            else {let message=`Image extension not allowed: ${extension}`;

                  console.error (message);
                  return multer_next (res.status(400).json({data: false,
                                                            error: message
                                                           }
                                                          ),
                                      null
                                     );
                 } // !process.env.ALLOWABLE_IMAGES.includes(extension)
           }, // filename function
} // multer.diskStorage
                               ); // multer.diskStorage
;

     upload.any (req, res, finishUpload);
    }
 else {console.error (`bad upload path: ${folder}`);
       return res.status(400).json({data: false,
                                    error: 'Insufficient resources...'
                                   } // beats "Internal Error"!
                                  );
      } // !pathOk(folder)
} // function start(subfolder, req, res, finishUpload)

module.exports=start;
