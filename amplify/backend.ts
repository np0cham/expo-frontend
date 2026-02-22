import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { api } from "./functions/api/resource";
import { storage } from "./storage/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */

const backend = defineBackend({ auth, data, api, storage });

// VPC Configuration for RDS access
const subnetIds = ["subnet-05bf4faaf5ac1de73", "subnet-0e383651260a33ede"];
const securityGroupIds = ["sg-04ab54f695ea58238"];

// Add policy for Lambda to access Secrets Manager
backend.api.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["secretsmanager:GetSecretValue"],
    resources: [
      "arn:aws:secretsmanager:ap-northeast-1:412381775359:secret:migration-db-credentials-v2-ZrmJku",
    ],
  }),
);

// Add VPC-related EC2 permissions for Lambda ENI creation
backend.api.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      "ec2:CreateNetworkInterface",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DeleteNetworkInterface",
      "ec2:AssignPrivateIpAddresses",
      "ec2:UnassignPrivateIpAddresses",
    ],
    resources: ["*"],
  }),
);

// Configure Lambda VPC settings for RDS Direct access
const apiLambda = backend.api.resources.lambda.node.defaultChild as CfnFunction;
apiLambda.vpcConfig = {
  subnetIds: subnetIds,
  securityGroupIds: securityGroupIds,
};
