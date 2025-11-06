"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KibiStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigatewayv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const apigatewayv2_integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class KibiStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        const envVars = {
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
        const lambdaIntegration = new apigatewayv2_integrations.HttpLambdaIntegration('LambdaIntegration', apiFunction, {
            payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
        });
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
exports.KibiStack = KibiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2liaS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImtpYmktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5QztBQUN6QyxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBQ2pELDJFQUE2RDtBQUM3RCxxR0FBdUY7QUFDdkYseURBQTJDO0FBRzNDLE1BQWEsU0FBVSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3RDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0JBQWtCO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFNBQVMsRUFBRSxpQkFBaUI7WUFDNUIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDakUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLFNBQVM7WUFDNUQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxnQ0FBZ0MsRUFBRTtnQkFDaEMsMEJBQTBCLEVBQUUsS0FBSyxFQUFFLFNBQVM7YUFDN0M7U0FDRixDQUFDLENBQUM7UUFFSCwyQ0FBMkM7UUFDM0MsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxnQkFBZ0I7WUFDM0IsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFB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QUErRDtTQUM3RSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxVQUFVLENBQUMsU0FBUztZQUMzQixXQUFXLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLG9CQUFvQixDQUFDLFNBQVM7WUFDckMsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUM7UUFFSCwwREFBMEQ7SUFDNUQsQ0FBQztDQUNGO0FBNUlELDhCQTRJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXl2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXl2Ml9pbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBLaWJpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICBjb25zdCBkaWFyeVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdEaWFyeVRhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAna2liaS1kaWFyeS1wcm9kJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCwgLy8g44Kz44K544OI5pyA6YGp5YyWXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IGZhbHNlLCAvLyDjgrPjgrnjg4jmnIDpganljJZcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIGxpc3RpbmcgZGlhcmllcyBieSBjcmVhdGlvbiBkYXRlXG4gICAgZGlhcnlUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdDcmVhdGVkQXRJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZW1vdGlvbkFuYWx5c2lzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0Vtb3Rpb25BbmFseXNpc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAna2liaS1lbW90aW9uLWFuYWx5c2lzLXByb2QnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdkaWFyeUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHtcbiAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFMzIEJ1Y2tldCBmb3Igc3RvcmluZyBkaWFyeSBjb250ZW50IChmb3IgQ29tcHJlaGVuZCBhbmFseXNpcylcbiAgICBjb25zdCBjb250ZW50QnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ29udGVudEJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBraWJpLWNvbnRlbnQtJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBGdW5jdGlvbiAoRG9ja2VyIHdpdGggTGFtYmRhIFdlYiBBZGFwdGVyKVxuICAgIGNvbnN0IGVudlZhcnM6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gPSB7XG4gICAgICBESUFSWV9UQUJMRV9OQU1FOiBkaWFyeVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEVNT1RJT05fQU5BTFlTSVNfVEFCTEVfTkFNRTogZW1vdGlvbkFuYWx5c2lzVGFibGUudGFibGVOYW1lLFxuICAgICAgQ09OVEVOVF9CVUNLRVRfTkFNRTogY29udGVudEJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgUE9SVDogJzgwODAnLFxuICAgICAgUkVBRElORVNTX0NIRUNLX1BPUlQ6ICc4MDgwJyxcbiAgICAgIFJFQURJTkVTU19DSEVDS19QQVRIOiAnL2hlYWx0aCcsXG4gICAgfTtcblxuICAgIC8vIENvbXByZWhlbmTpnZ7lkIzmnJ/jgrjjg6fjg5bnlKjjga5JQU3jg63jg7zjg6tcbiAgICBjb25zdCBjb21wcmVoZW5kRGF0YUFjY2Vzc1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0NvbXByZWhlbmREYXRhQWNjZXNzUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdjb21wcmVoZW5kLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUm9sZSBmb3IgQ29tcHJlaGVuZCB0byBhY2Nlc3MgUzMnLFxuICAgIH0pO1xuXG4gICAgY29udGVudEJ1Y2tldC5ncmFudFJlYWRXcml0ZShjb21wcmVoZW5kRGF0YUFjY2Vzc1JvbGUpO1xuXG4gICAgZW52VmFycy5DT01QUkVIRU5EX0RBVEFfQUNDRVNTX1JPTEVfQVJOID0gY29tcHJlaGVuZERhdGFBY2Nlc3NSb2xlLnJvbGVBcm47XG4gICAgZW52VmFycy5DT01QUkVIRU5EX0NMQVNTSUZJRVJfQVJOID0gJ2Fybjphd3M6Y29tcHJlaGVuZDphcC1ub3J0aGVhc3QtMToyMjM3MDg5ODgwMTg6ZG9jdW1lbnQtY2xhc3NpZmllci9raWJpLWVtb3Rpb24tY2xhc3NpZmllcic7XG5cbiAgICBjb25zb2xlLmxvZygnVXNpbmcgQ29tcHJlaGVuZCBhc3luYyBqb2IgbW9kZSAobm8gZW5kcG9pbnQgcmVxdWlyZWQpJyk7XG5cbiAgICBjb25zdCBhcGlGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRG9ja2VySW1hZ2VGdW5jdGlvbih0aGlzLCAnQXBpRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBsYW1iZGEuRG9ja2VySW1hZ2VDb2RlLmZyb21JbWFnZUFzc2V0KCcuLi9iYWNrZW5kJyksXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuWDg2XzY0LCAvLyB4ODZfNjQgZm9yIGNvbXBhdGliaWxpdHlcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgIGVudmlyb25tZW50OiBlbnZWYXJzLFxuICAgIH0pO1xuXG4gICAgLy8gSUFNIFBlcm1pc3Npb25zXG4gICAgZGlhcnlUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYXBpRnVuY3Rpb24pO1xuICAgIGVtb3Rpb25BbmFseXNpc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlGdW5jdGlvbik7XG4gICAgY29udGVudEJ1Y2tldC5ncmFudFJlYWRXcml0ZShhcGlGdW5jdGlvbik7XG5cbiAgICAvLyBDb21wcmVoZW5kIGFuZCBUcmFuc2xhdGUgcGVybWlzc2lvbnMgKGFzeW5jIGpvYnMpXG4gICAgYXBpRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2NvbXByZWhlbmQ6U3RhcnREb2N1bWVudENsYXNzaWZpY2F0aW9uSm9iJyxcbiAgICAgICAgJ2NvbXByZWhlbmQ6RGVzY3JpYmVEb2N1bWVudENsYXNzaWZpY2F0aW9uSm9iJyxcbiAgICAgICAgJ2NvbXByZWhlbmQ6RGVzY3JpYmVEb2N1bWVudENsYXNzaWZpZXInLFxuICAgICAgICAndHJhbnNsYXRlOlRyYW5zbGF0ZVRleHQnLFxuICAgICAgICAnaWFtOlBhc3NSb2xlJywgLy8gQ29tcHJlaGVuZOOBq+ODreODvOODq+OCkua4oeOBmeOBn+OCgeOBq+W/heimgVxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgSFRUUCBBUEkgKHJlcXVpcmVkIGZvciBMYW1iZGEgV2ViIEFkYXB0ZXIpXG4gICAgY29uc3QgaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5djIuSHR0cEFwaSh0aGlzLCAnS2liaUh0dHBBcGknLCB7XG4gICAgICBhcGlOYW1lOiAna2liaS1odHRwLWFwaS1wcm9kJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnS2liaSBIVFRQIEFQSScsXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogW1xuICAgICAgICAgIGFwaWdhdGV3YXl2Mi5Db3JzSHR0cE1ldGhvZC5HRVQsXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLlBVVCxcbiAgICAgICAgICBhcGlnYXRld2F5djIuQ29yc0h0dHBNZXRob2QuREVMRVRFLFxuICAgICAgICAgIGFwaWdhdGV3YXl2Mi5Db3JzSHR0cE1ldGhvZC5PUFRJT05TLFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MDApLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBJbnRlZ3JhdGlvbiBmb3IgSFRUUCBBUElcbiAgICBjb25zdCBsYW1iZGFJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5djJfaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICdMYW1iZGFJbnRlZ3JhdGlvbicsXG4gICAgICBhcGlGdW5jdGlvbixcbiAgICAgIHtcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXl2Mi5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzJfMCxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gQVBJIFJvdXRlcyAtIENhdGNoLWFsbCByb3V0ZVxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcve3Byb3h5K30nLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLkFOWV0sXG4gICAgICBpbnRlZ3JhdGlvbjogbGFtYmRhSW50ZWdyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVSTCcsIHtcbiAgICAgIHZhbHVlOiBodHRwQXBpLnVybCB8fCAnJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMIC0gVXNlIHRoaXMgZm9yIE5FWFRfUFVCTElDX0FQSV9VUkwgaW4gQW1wbGlmeScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlhcnlUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZGlhcnlUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIERpYXJ5IFRhYmxlIE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vtb3Rpb25BbmFseXNpc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBlbW90aW9uQW5hbHlzaXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIEVtb3Rpb24gQW5hbHlzaXMgVGFibGUgTmFtZScsXG4gICAgfSk7XG5cbiAgICAvLyBOb3RlOiBGcm9udGVuZCB3aWxsIGJlIGRlcGxveWVkIHZpYSBBV1MgQW1wbGlmeSBIb3N0aW5nXG4gIH1cbn0iXX0=