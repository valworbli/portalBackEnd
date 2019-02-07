const multer=require('multer');
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
                                                             {fieldName: file.fieldname
                                                             }
                                                            );
                                                  },
                                        key: function (req, file, callback)
                                             {callback (null,
                                                        Date.now().toString()+file.fieldname
                                                       );
                                             }
                                       }
                                      ) // multerS3
                    } // storage
                   ); // multer

module.exports=upload;
