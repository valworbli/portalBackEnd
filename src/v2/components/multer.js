const multer=require('multer');
const path = require('path');

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

const upload=multer.diskStorage({destination: function(req,
                                                       file,
                                                       multer_callback
                                                      )
                                              {let path=process.env.IMAGE_STAGING_FOLDER+'/'+
                                                        req.headers['email'];
                                                        
                                               function madeDir(err)
                                               {
                                                if ((!err)||
                                                    err&&err.code==='EEXIST'
                                                   )
                                                   multer_callback (null,
                                                                    path
                                                                   );

                                                 else console.error (err);
                                                      // TBD: +http response??
                                                      // _Shouldn't_ happen...
                                                } // function madeDir(err)

                                               fs.mkdir (path, madeDir);
	                                      }, // destination

                                 filename: function(req,
                                                    file,
                                                    multer_callback
                                                   )
                                           {let extension=path.extname(file.originalname
                                                                      ).toLowerCase();
                                            if (process.env.ALLOWABLE_IMAGES.includes(extension))
                                               {
// TO DO: validate file.fieldname; will need to insure spec for that...
//
// We could rely on the creation date of the file,
// but the Date offset suffix insures that files can't be overwritten... 
                                                let filename=file.fieldname+'_'+
                                                             Date.now().toString()+
                                                             extension;

                                                multer_callback (null, filename);
                                               } // ALLOWABLE_IMAGES.includes(extension)

                                            else return multer_callback (
res.status(400).json({data: false,
                      error: `Image extension not allowed: ${extension}`
                     }
                    ),
                                                                         null
                                                                        );
	                                   } // filename
                                }
                               ); // multer.diskStorage

module.exports=upload;
