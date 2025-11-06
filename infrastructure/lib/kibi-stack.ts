import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class KibiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const diaryTable = new dynamodb.Table(this, 'DiaryTable', {
      tableName: 'kibi-diary-prod',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // コスト最適化
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false, // コスト最適化
      },
    });

    // GSI for listing diaries by creation date
    diaryTable.addGlobalSecondaryIndex({
      indexName: 'CreatedAtIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const emotionAnalysisTable = new dynamodb.Table(this, 'EmotionAnalysisTable', {
      tableName: 'kibi-emotion-analysis-prod',
      partitionKey: { name: 'diaryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false,
      },
    });

    // S3 Bucket for storing diary content (for Comprehend analysis)
    const contentBucket = new s3.Bucket(this, 'ContentBucket', {
      bucketName: `kibi-content-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda Function (Docker with Lambda Web Adapter)
    const envVars: { [key: string]: string } = {
      DIARY_TABLE_NAME: diaryTable.tableName,
      EMOTION_ANALYSIS_TABLE_NAME: emotionAnalysisTable.tableName,
      CONTENT_BUCKET_NAME: contentBucket.bucketName,
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
      PORT: '8080',
    };

    // 本番環境ではComprehendエンドポイントを使用
    const comprehendEndpointArn = process.env.COMPREHEND_ENDPOINT_ARN;
    if (comprehendEndpointArn) {
      envVars.COMPREHEND_ENDPOINT_ARN = comprehendEndpointArn;
      console.log(`Using Comprehend endpoint: ${comprehendEndpointArn}`);
    } else {
      console.log('No Comprehend endpoint configured. Using mock implementation.');
    }

    const apiFunction = new lambda.DockerImageFunction(this, 'ApiFunction', {
      code: lambda.DockerImageCode.fromImageAsset('../backend'),
      architecture: lambda.Architecture.X86_64, // x86_64 for compatibility
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: envVars,
    });

    // IAM Permissions
    diaryTable.grantReadWriteData(apiFunction);
    emotionAnalysisTable.grantReadWriteData(apiFunction);
    contentBucket.grantReadWrite(apiFunction);

    // Comprehend and Translate permissions
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'comprehend:DetectSentiment',
        'comprehend:ClassifyDocument',
        'comprehend:DescribeDocumentClassifier',
        'translate:TranslateText',
      ],
      resources: ['*'],
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'KibiApi', {
      restApiName: 'kibi-api-prod',
      description: 'Kibi API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Lambda Integration
    const lambdaIntegration = new apigateway.LambdaIntegration(apiFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API Routes
    const apiResource = api.root.addResource('api');
    apiResource.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiURL', {
      value: api.url,
      description: 'API Gateway URL - Use this for NEXT_PUBLIC_API_URL in Amplify',
    });

    new cdk.CfnOutput(this, 'DiaryTableName', {
      value: diaryTable.tableName,
      description: 'DynamoDB Diary Table Name',
    });

    new cdk.CfnOutput(this, 'EmotionAnalysisTableName', {
      value: emotionAnalysisTable.tableName,
      description: 'DynamoDB Emotion Analysis Table Name',
    });

    // Note: Frontend will be deployed via AWS Amplify Hosting
  }
}