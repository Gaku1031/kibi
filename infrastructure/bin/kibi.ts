#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KibiStack } from '../lib/kibi-stack';

const app = new cdk.App();

new KibiStack(app, 'KibiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1',
  },
  stackName: 'kibi-prod',
  description: 'Kibi - 感情の機微を発見する日記サービス',
});