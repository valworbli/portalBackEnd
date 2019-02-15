const multer=require('multer');
const fs=require('fs');
const path=require('path');
const mkdirp=require('mkdirp');

// this sucks;
// leaving here to remind me to explore alternatives...
//var sanitize=require('sanitize-filename');

const MB=1000*1000;

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

function start(subfolder, fileFilter, filename, req, res, finishUpload)
{var storage=multer.diskStorage(
{destination: function (req, file, multer_next)
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
 filename: filename
}
                               ), // multer.diskStorage
    upload=multer({storage: storage,
                   limits: {files: ((process.env.MAX_UPLOAD_IMAGES===undefined)
                                    ?Infinity
                                    :process.env.MAX_UPLOAD_IMAGES
                                   ),
                            fileSize: ((process.env.MAX_UPLOAD_IMAGE_SIZE_MB===undefined)
                                       ?Infinity
                                       :process.env.MAX_UPLOAD_IMAGE_SIZE_MB*MB
                                      )
                           }, // limits
                   fileFilter: fileFilter,
                  }
                 ).any();

 return upload(req, res, finishUpload);
} // function start(subfolder, fileFilter, filename, req, res, finishUpload)

module.exports={start};
