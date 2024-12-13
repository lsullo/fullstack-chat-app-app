import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();
const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Extract the userId from the event detail
    const userId = event.detail?.data?.object?.client_reference_id;
    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    console.log("Updating user role to VIP for userId:", userId);

    // Update the user's role to VIP
    const updateParams: DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: userIndexTable,
      Key: {
        userId: userId,
      },
      UpdateExpression: "SET #role = :vip",
      ExpressionAttributeNames: {
        "#role": "role",
      },
      ExpressionAttributeValues: {
        ":vip": "VIP",
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateResult = await dynamoDB.update(updateParams).promise();
    console.log("User role updated successfully:", JSON.stringify(updateResult, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `User ${userId} role updated to VIP successfully.`,
        updatedAttributes: updateResult.Attributes,
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
