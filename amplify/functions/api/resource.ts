import { defineFunction } from "@aws-amplify/backend";
export const api = defineFunction({
  name: "api",
  environment: {
    SECRET_NAME: "migration-db-credentials-v2",
    DB_REGION: "ap-northeast-1",
  },
});
