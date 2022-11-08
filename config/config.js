const Joi = require('joi');

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .allow('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number()
    .default(8080),
  MONGOOSE_DEBUG: Joi.boolean()
    .when('NODE_ENV', {
      is: Joi.string().equal('development'),
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false)
    }),
  JWT_SECRET: Joi.string().required()
    .description('JWT Secret required to sign'),
  MONGO_HOST: Joi.string().required()
    .description('Mongo DB host url'),
  MONGO_PORT: Joi.number()
    .default(27017),
  AWS_REGION: Joi.string()
  .default('eu-west-3'),
  S3_BUCKET_URL: Joi.string()
  .default('https://lomads-dao-development.s3.eu-west-3.amazonaws.com/'),
  S3_BUCKET: Joi.string()
  .default('lomads-dao-development'),
  AES_PASS_PHRASE: Joi.string()
  .default('lomads-dao')
}).unknown()
  .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongooseDebug: envVars.MONGOOSE_DEBUG,
  jwtSecret: envVars.JWT_SECRET,
  aesPassPhrase: envVars.AES_PASS_PHRASE,
  mongo: {
    host: envVars.MONGO_HOST,
    port: envVars.MONGO_PORT
  },
  aws: {
    region: envVars.AWS_REGION,
    s3BucketUrl: envVars.S3_BUCKET_URL,
    s3Bucket: envVars.S3_BUCKET
  },
  notion: {
    email: envVars.NOTION_ADMIN_EMAIL,
    password: envVars.NOTION_ADMIN_PASSWORD,
  }
};

module.exports = config;
