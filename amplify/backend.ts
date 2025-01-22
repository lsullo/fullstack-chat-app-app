import { storage } from "./storage/resource";
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { fullCircleLambda2 } from "./functions/fullCircleLambda2/resource";
import { VIPCreator } from "./functions/VIPCreator/resource";

export const backend = defineBackend({
  auth,
  data,
  storage,
  fullCircleLambda2,
  VIPCreator,
});

