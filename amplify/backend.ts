import { storage } from "./storage/resource";
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { myLambdaFunction } from "./functions/myLambdaFunction/resource";
import { fullCircleLambda2 } from "./functions/fullCircleLambda2/resource";

export const backend = defineBackend({
  auth,
  data,
  storage,
  myLambdaFunction,
  fullCircleLambda2,
});

