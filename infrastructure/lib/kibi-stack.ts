import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
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
      PORT: '8080',
      READINESS_CHECK_PORT: '8080',
      READINESS_CHECK_PATH: '/health',
    };

    // Comprehend非同期ジョブ用のIAMロール
    const comprehendDataAccessRole = new iam.Role(this, 'ComprehendDataAccessRole', {
      assumedBy: new iam.ServicePrincipal('comprehend.amazonaws.com'),
      description: 'Role for Comprehend to access S3',
    });

    contentBucket.grantReadWrite(comprehendDataAccessRole);

    envVars.COMPREHEND_DATA_ACCESS_ROLE_ARN = comprehendDataAccessRole.roleArn;
    envVars.COMPREHEND_CLASSIFIER_ARN = 'arn:aws:comprehend:ap-northeast-1:223708988018:document-classifier/kibi-emotion-classifier';

    console.log('Using Comprehend async job mode (no endpoint required)');

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

    // Comprehend and Translate permissions (async jobs)
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'comprehend:StartDocumentClassificationJob',
        'comprehend:DescribeDocumentClassificationJob',
        'comprehend:DescribeDocumentClassifier',
        'translate:TranslateText',
        'iam:PassRole', // Comprehendにロールを渡すために必要
      ],
      resources: ['*'],
    }));

    // API Gateway HTTP API (required for Lambda Web Adapter)
    const httpApi = new apigatewayv2.HttpApi(this, 'KibiHttpApi', {
      apiName: 'kibi-http-api-prod',
      description: 'Kibi HTTP API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.seconds(600),
      },
    });

    // Lambda Integration for HTTP API
    const lambdaIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      apiFunction,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    // API Routes - Catch-all route
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiURL', {
      value: httpApi.url || '',
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