import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "expofrontendStorage",
  access: (allow) => ({
    "public/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "protected/{identity_id}/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});
