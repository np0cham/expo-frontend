import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { api } from "./functions/api/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */

const backend = defineBackend({ auth, data, api });

backend.api.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["secretsmanager:GetSecretValue"],
    resources: [
      "arn:aws:secretsmanager:ap-northeast-1:*:secret:migration-db-credentials-v2",
    ],
  }),
);
