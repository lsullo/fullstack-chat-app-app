import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();
const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const userId = event.detail?.data?.object?.client_reference_id;
    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    const stripeCustomerId = event.detail?.data?.object?.customer || "none";

    console.log("Querying UserIndex table with userId:", userId);

    const userIndexParams = {
      TableName: userIndexTable,
      IndexName: "userIndicesByUserId", 
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      Limit: 1,
    };

    const userResult = await dynamoDB.query(userIndexParams).promise();
    console.log("UserIndex Query Result:", JSON.stringify(userResult, null, 2));

    if (!userResult.Items || userResult.Items.length === 0) {
      throw new Error("User not found with the provided userId.");
    }

    const userItem = userResult.Items[0];
    const actualId = userItem.id; 

    const updateUserParams = {
      TableName: userIndexTable,
      Key: { id: actualId }, 
      UpdateExpression: "SET RedPill = :vip, stripeCustomerId = :custid",
      ExpressionAttributeValues: {
        ":vip": "VIP",
        ":custid": stripeCustomerId,
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateUserResult = await dynamoDB.update(updateUserParams).promise();
    console.log("User role updated successfully:", JSON.stringify(updateUserResult, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `User ${userId} role updated to VIP successfully.`,
        updatedAttributes: updateUserResult.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error updating user role",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
