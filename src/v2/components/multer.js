const multer=require('multer');
const fs=require('fs');
const path=require('path');
var sanitize=require("sanitize-filename");

const MB=1000*1000;
const LEADING_DOT=/^\./;

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

const upload=multer.diskStorage(
{limits: {files: process.env.MAX_UPLOAD_IMAGES,
          fileSize: process.env.MAX_UPLOAD_IMAGE_SIZE_MB*MB
         },

 destination: function(req, file, multer_callback)
              {let path=process.env.IMAGE_STAGING_FOLDER+'/'+
                        req.headers['email'];
                                                        
               function madeDir(err)
                        {
                         if ((!err)||
                             err&&err.code==='EEXIST'
                            )
                            multer_callback (null, path);

                         else {console.error (err);
                               return multer_callback (res.status(400).json({data: false,
                                                                             error: 'Insufficient Resources'
                                                                            }
                                                                           ),
                                                       null
                                                      );
                              } // !mkdir
                        } // function madeDir(err)

               if (pathOk(path))
                  fs.mkdir (path, madeDir);

               else {console.error (`bad image path: ${path}`);
                     return multer_callback (res.status(400).json({data: false,
                                                                   error: 'Bad image path'
                                                                  }
                                                                 ),
                                             null
                                            );
                    } // !pathOk(path)
              }, // destination function

 filename: function(req, file, multer_callback)
           {let extension=path.extname(file.originalname
                                      ).replace(LEADING_DOT, ''
                                               ).toLowerCase();

            if (process.env.ALLOWABLE_IMAGES.includes(extension))
               {let filename=file.fieldname+'_'+
                             Date.now().toString()+'.'+
                             extension;

                if (pathOk(filename))
                   multer_callback (null, filename);

                else {console.error (`bad image filename: ${filename}`);
                      return multer_callback (res.status(400).json({data: false,
                                                                    error: 'Bad image path'
                                                                   }
                                                                  ),
                                              null
                                             );
                     } // !pathOk(filename)
               } // process.env.ALLOWABLE_IMAGES.includes(extension)

            else {let message=`Image extension not allowed: ${extension}`;

                  console.error (message);
                  return multer_callback (res.status(400).json({data: false,
                                                                error: message
                                                               }
                                                              ),
                                          null
                                         );
                 } // !process.env.ALLOWABLE_IMAGES.includes(extension)
           } // filename function
}
                               ); // multer.diskStorage

module.exports=upload;
