const multer=require('multer');
const fs=require('fs');
const path=require('path');
const mkdirp=require('mkdirp');

// this sucks;
// leaving here to remind me to explore alternatives...
//var sanitize=require('sanitize-filename');

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
// used sanitize-filename -but it was useless...
{
 if (typeof path!=='string')
    return false;

 return path.indexOf('..')<0;
} // function pathOK(path)


function start(subfolder, req, res, finishUpload)
{

var storage=multer.diskStorage(
{limits: {files: ((process.env.MAX_UPLOAD_IMAGES===undefined)
                  ?Infinity
                  :process.env.MAX_UPLOAD_IMAGES
                 ),
          fileSize: ((process.env.MAX_UPLOAD_IMAGE_SIZE_MB===undefined)
                     ?Infinity
                     :process.env.MAX_UPLOAD_IMAGE_SIZE_MB*MB
                    )
         }, // limits
 fileFilter: function (req, file, multer_next)
             {var index, type, side;
              let extension=path.extname(file.originalname
                                        ).replace(LEADING_DOT, ''
                                                 ).toLowerCase(),
                  // using eval would normally be a dangerous thing to do,
                  // but the string is from the same source as the code...
                  images=eval(process.env.ALLOWABLE_IMAGES); // MUST be defined...
console.error('MULTER.FILE_FILTER');//?

              for (index=0; index<images.length; index++)
                  if (images[index].toLowerCase()===extension)
                     break;

              if (index>=images.length)
                 {let message=`Image extension not allowed: ${extension}`;
                  console.error (message);
                  return multer_callback(new Error(message));
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

              if (!TYPES.includes(type))
                 {let message=`bad image type: ${type}`;

                  console.error (message);
                  return multer_next (new Error(message));
                 } // !TYPES.includes(type)

              if (!SIDES.includes(side))
                 {let message=`bad side specification: ${side}`;

                  console.error (message);
                  return multer_next (new Error (message));
                 } // !SIDES.includes(side)
              return multer_next(null, true);
             }, // fileFilter
 destination: function (req, file, multer_next)//??
              {let path=process.env.IMAGE_STAGING_FOLDER+'/'+subfolder,
                   fail_message='Insufficient Resources...';

               function madeDir (err)
               {
                if (err)
                   {console.error (fail_message);
                    multer_next (new Error(fail_message));
                   } // err
                else multer_next (null, path);
               } // function madeDir(err)
 
               if (pathOK(path))
                  mkdirp (path, madeDir);

               else multer_next (new Error(fail_message));
              }, // destination
 filename: function(req, file, multer_next)
           {let extension=path.extname(file.originalname
                                      ).replace(LEADING_DOT, ''
                                               ).toLowerCase(),
                created=new Date();

console.error('MULTER.FILENAME');//?
            file.created=created;
            return multer_next(null,
                               file.fieldname.toLowerCase()+'_'+
                               // use an epoch offset filename suffix
                               // to insure that files are not overwritten...
                               created.getTime()+
                               '.'+extension
                             );
           } // filename function
}
                               ), // multer.diskStorage
    upload=multer({storage: storage}).any();

return upload(req, res, finishUpload);
}

module.exports={start};
